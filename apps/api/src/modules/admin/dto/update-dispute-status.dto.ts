import { DisputeStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateDisputeStatusDto {
  @IsEnum(DisputeStatus)
  status: DisputeStatus;
}
