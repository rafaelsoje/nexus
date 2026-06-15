import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateApplicationDto {
  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  proposedAmountCents?: number;
}
