import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { User, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { EmailService } from "./email/email.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.role === UserRole.ADMIN) {
      throw new ForbiddenException("Admin users cannot self-register");
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        role: dto.role,
        passwordHash,
      },
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (
      !user ||
      !user.isActive ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.get<string>("JWT_REFRESH_SECRET"),
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (
        !user?.isActive ||
        !user.refreshTokenHash ||
        !(await bcrypt.compare(refreshToken, user.refreshTokenHash))
      ) {
        throw new UnauthorizedException("Invalid refresh token");
      }

      return this.issueTokens(user);
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return { ok: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user?.isActive) {
      return { ok: true };
    }

    const expiresInMinutes = 30;
    const resetToken = randomBytes(32).toString("hex");
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetTokenHash: await bcrypt.hash(resetToken, 12),
        resetTokenExpiresAt: new Date(
          Date.now() + 1000 * 60 * expiresInMinutes,
        ),
      },
    });

    await this.emailService.sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetToken,
      expiresInMinutes,
    });

    return this.emailService.shouldExposeDevTokens()
      ? { ok: true, resetToken }
      : { ok: true };
  }

  async resetPassword(token: string, password: string) {
    const users = await this.prisma.user.findMany({
      where: {
        resetTokenHash: { not: null },
        resetTokenExpiresAt: { gt: new Date() },
        isActive: true,
      },
    });
    const user = await this.findUserByResetToken(users, token);

    if (!user) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(password, 12),
        refreshTokenHash: null,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    });

    return { ok: true };
  }

  private async findUserByResetToken(users: User[], token: string) {
    for (const user of users) {
      if (
        user.resetTokenHash &&
        (await bcrypt.compare(token, user.resetTokenHash))
      ) {
        return user;
      }
    }

    return null;
  }

  private async issueTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>("JWT_ACCESS_SECRET"),
        expiresIn: this.config.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m",
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>("JWT_REFRESH_SECRET"),
        expiresIn: this.config.get<string>("JWT_REFRESH_EXPIRES_IN") ?? "7d",
      }),
    ]);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await bcrypt.hash(refreshToken, 12) },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
