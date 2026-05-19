import { ContractStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateContractStatusDto {
  @IsEnum(ContractStatus)
  status: ContractStatus;
}
