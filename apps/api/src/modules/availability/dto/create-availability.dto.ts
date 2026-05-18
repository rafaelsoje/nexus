import { IsBoolean, IsDateString, IsOptional, IsString } from "class-validator";

export class CreateAvailabilityDto {
  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
