import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpsertFreelancerProfileDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  tools?: string;

  @IsOptional()
  @IsString()
  transportation?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  dailyRateCents?: number;
}
