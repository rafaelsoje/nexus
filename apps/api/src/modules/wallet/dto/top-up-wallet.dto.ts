import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class TopUpWalletDto {
  @IsInt()
  @Min(100)
  amountCents: number;

  @IsOptional()
  @IsString()
  description?: string;
}
