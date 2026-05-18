import { IsOptional, IsString } from "class-validator";

export class CreateSkillDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
