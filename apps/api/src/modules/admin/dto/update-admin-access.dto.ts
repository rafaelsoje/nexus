import { AdminAccessLevel } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateAdminAccessDto {
  @IsEnum(AdminAccessLevel)
  accessLevel: AdminAccessLevel;
}
