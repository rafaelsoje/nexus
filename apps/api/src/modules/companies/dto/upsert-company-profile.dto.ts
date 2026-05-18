import { IsEmail, IsOptional, IsString } from "class-validator";

export class UpsertCompanyProfileDto {
  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsString()
  responsibleName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;
}
