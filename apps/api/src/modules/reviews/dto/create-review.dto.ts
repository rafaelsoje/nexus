import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateReviewDto {
  @IsString()
  contractId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  punctuality?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  technicalQuality?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  professionalPosture?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  communication?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  organization?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  informationClarity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  payment?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  professionalTreatment?: number;

  @IsInt()
  @Min(1)
  @Max(5)
  overallRating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
