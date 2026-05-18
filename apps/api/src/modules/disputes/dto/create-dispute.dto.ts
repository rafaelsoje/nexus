import { IsOptional, IsString } from "class-validator";

export class CreateDisputeDto {
  @IsString()
  contractId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  details?: string;
}
