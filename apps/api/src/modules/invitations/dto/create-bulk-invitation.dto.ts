import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateBulkInvitationDto {
  @IsString()
  eventId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  freelancerIds: string[];

  @IsDateString()
  expiresAt: string;

  @IsOptional()
  @IsString()
  message?: string;
}
