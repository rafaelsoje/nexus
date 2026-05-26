import { IsEmail, IsIn, IsOptional, IsString, Length } from "class-validator";

const documentTypes = ["CPF", "CNPJ"] as const;
const accountTypes = ["CHECKING", "SAVINGS", "PAYMENT"] as const;
const pixKeyTypes = ["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"] as const;

export class UpsertGatewayAccountDto {
  @IsIn(documentTypes)
  documentType: string;

  @IsString()
  @Length(11, 14)
  documentNumber: string;

  @IsString()
  holderName: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  addressStreet?: string;

  @IsOptional()
  @IsString()
  addressNumber?: string;

  @IsOptional()
  @IsString()
  addressComplement?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  bankCode?: string;

  @IsOptional()
  @IsString()
  agency?: string;

  @IsOptional()
  @IsString()
  account?: string;

  @IsOptional()
  @IsString()
  accountDigit?: string;

  @IsOptional()
  @IsIn(accountTypes)
  accountType?: string;

  @IsOptional()
  @IsString()
  pixKey?: string;

  @IsOptional()
  @IsIn(pixKeyTypes)
  pixKeyType?: string;
}
