import {
  ArrayNotEmpty,
  IsInt,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateBulkInvitationDto {
  @IsString()
  eventId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  freelancerIds: string[];

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
