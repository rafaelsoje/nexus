import { IsDateString, IsOptional, IsString } from "class-validator";

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
}
