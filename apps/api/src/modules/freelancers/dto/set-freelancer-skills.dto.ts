import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

class FreelancerSkillInput {
  @IsString()
  skillId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  dailyRateCents?: number;

  @IsOptional()
  @IsString()
  knowledgeLevel?: string;

  @IsOptional()
  @IsString()
  experienceSummary?: string;

  @IsOptional()
  @IsString()
  equipment?: string;

  @IsOptional()
  @IsString()
  courses?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  abilities?: string[];
}

export class SetFreelancerSkillsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FreelancerSkillInput)
  skills: FreelancerSkillInput[];
}
