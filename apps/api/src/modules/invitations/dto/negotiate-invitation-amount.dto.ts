import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class NegotiateInvitationAmountDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amountCents: number;

  @IsOptional()
  @IsString()
  message?: string;
}
