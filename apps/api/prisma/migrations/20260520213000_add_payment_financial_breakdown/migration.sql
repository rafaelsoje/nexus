ALTER TABLE "Payment"
ADD COLUMN "companyFeeAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "freelancerFeeAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "gatewayFeeAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "platformAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "freelancerNetAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "amountToChargeCompanyCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "amountToReleaseFreelancerCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "walletAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "gatewayAmountCents" INTEGER NOT NULL DEFAULT 0;

UPDATE "Payment"
SET
  "companyFeeAmountCents" = "platformFeeCents",
  "freelancerFeeAmountCents" = 0,
  "gatewayFeeAmountCents" = 0,
  "platformAmountCents" = "platformFeeCents",
  "freelancerNetAmountCents" = "freelancerAmountCents",
  "amountToChargeCompanyCents" = "grossAmountCents",
  "amountToReleaseFreelancerCents" = "freelancerAmountCents",
  "walletAmountCents" = 0,
  "gatewayAmountCents" = "grossAmountCents";
