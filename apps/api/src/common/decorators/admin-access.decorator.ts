import { SetMetadata } from "@nestjs/common";
import { AdminAccessLevel } from "@prisma/client";

export const ADMIN_ACCESS_KEY = "adminAccess";
export const AdminAccess = (...levels: AdminAccessLevel[]) =>
  SetMetadata(ADMIN_ACCESS_KEY, levels);
