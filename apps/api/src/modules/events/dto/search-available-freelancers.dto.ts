import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsString, Min } from "class-validator";

export class SearchAvailableFreelancersDto {
  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @IsOptional()
  @IsString()
  skillId?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  tools?: string;

  @IsOptional()
  @IsString()
  transportation?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minDailyRateCents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxDailyRateCents?: number;
}
