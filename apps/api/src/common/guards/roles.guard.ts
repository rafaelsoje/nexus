import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AdminAccessLevel, UserRole } from "@prisma/client";
import { PrismaService } from "../../modules/prisma/prisma.service";
import { ADMIN_ACCESS_KEY } from "../decorators/admin-access.decorator";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    if (!requiredRoles.includes(request.user?.role)) {
      return false;
    }

    const requiredAdminLevels =
      this.reflector.getAllAndOverride<AdminAccessLevel[]>(
        ADMIN_ACCESS_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (
      !requiredAdminLevels?.length ||
      request.user?.role !== UserRole.ADMIN
    ) {
      return true;
    }

    const profile = await this.prisma.adminProfile.findUnique({
      where: { userId: request.user.sub },
      select: { accessLevel: true },
    });

    if (!profile) {
      return false;
    }

    return requiredAdminLevels.includes(profile.accessLevel);
  }
}
