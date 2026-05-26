import { IsEnum } from "class-validator";
import { PayoutStatus } from "@prisma/client";

export class UpdatePayoutStatusDto {
  @IsEnum(PayoutStatus)
  status: PayoutStatus;
}
