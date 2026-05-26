import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateApplicationDto {
  @IsString()
  eventId: string;

  @IsOptional()
  @IsString()
  eventRequirementId?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  proposedAmountCents?: number;
}
