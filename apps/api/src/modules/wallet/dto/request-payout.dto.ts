import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class RequestPayoutDto {
  @IsInt()
  @Min(100)
  amountCents: number;

  @IsOptional()
  @IsString()
  description?: string;
}
