import { CompanyMemberRole } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateCompanyMemberRoleDto {
  @IsEnum(CompanyMemberRole)
  role: CompanyMemberRole;
}
