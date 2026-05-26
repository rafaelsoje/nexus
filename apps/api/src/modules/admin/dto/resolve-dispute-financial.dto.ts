import { IsEnum } from "class-validator";

export enum DisputeFinancialResolution {
  REFUND_COMPANY = "REFUND_COMPANY",
  UNBLOCK_FREELANCER = "UNBLOCK_FREELANCER",
  RELEASE_FREELANCER = "RELEASE_FREELANCER",
}

export class ResolveDisputeFinancialDto {
  @IsEnum(DisputeFinancialResolution)
  resolution: DisputeFinancialResolution;
}
