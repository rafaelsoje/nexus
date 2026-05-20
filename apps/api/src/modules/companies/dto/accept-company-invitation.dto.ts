import { IsOptional, IsString, MinLength } from "class-validator";

export class AcceptCompanyInvitationDto {
  @IsString()
  token: string;

  @IsString()
  name: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
