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
}

export class SetFreelancerSkillsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FreelancerSkillInput)
  skills: FreelancerSkillInput[];
}
