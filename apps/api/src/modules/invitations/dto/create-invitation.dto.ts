import { IsDateString, IsOptional, IsString } from "class-validator";

export class CreateInvitationDto {
  @IsString()
  eventId: string;

  @IsString()
  freelancerId: string;

  @IsDateString()
  expiresAt: string;

  @IsOptional()
  @IsString()
  message?: string;
}
