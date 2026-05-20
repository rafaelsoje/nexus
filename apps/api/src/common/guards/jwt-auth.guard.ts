import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../modules/prisma/prisma.service";

@Injectable()
export class JwtAuthGuard {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization as string | undefined;
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined;

    if (!token) {
      throw new UnauthorizedException("Missing access token");
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get<string>("JWT_ACCESS_SECRET"),
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { isActive: true },
      });

      if (!user?.isActive) {
        throw new UnauthorizedException("Invalid access token");
      }

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid access token");
    }
  }
}
