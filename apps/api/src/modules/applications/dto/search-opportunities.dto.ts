import { Type } from "class-transformer";
import { IsOptional, IsString, Min } from "class-validator";

export class SearchOpportunitiesDto {
  @IsOptional()
  @IsString()
  companySearch?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  skillId?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minDailyRateCents?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxDailyRateCents?: number;
}
