import { VerificationStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateVerificationDto {
  @IsEnum(VerificationStatus)
  status: VerificationStatus;
}
