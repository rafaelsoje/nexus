import { IsString } from "class-validator";

export class UpdateCompanyLogoDto {
  @IsString()
  logoUrl!: string;
}
