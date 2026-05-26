import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateInvitationDto {
  @IsString()
  eventId: string;

  @IsString()
  freelancerId: string;

  @IsString()
  eventRequirementId: string;

  @IsDateString()
  expiresAt: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  proposedAmountCents?: number;
}
