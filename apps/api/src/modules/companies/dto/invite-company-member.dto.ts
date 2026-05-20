import { CompanyMemberRole } from "@prisma/client";
import { IsEmail, IsEnum } from "class-validator";

export class InviteCompanyMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(CompanyMemberRole)
  role: CompanyMemberRole;
}
