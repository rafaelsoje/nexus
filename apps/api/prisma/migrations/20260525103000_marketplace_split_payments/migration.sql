-- Development migration: replaces the former one-payment-per-contract model
-- with an event-level marketplace payment and split-per-freelancer model.

DROP TABLE IF EXISTS "Payout" CASCADE;
DROP TABLE IF EXISTS "PaymentSplit" CASCADE;
DROP TABLE IF EXISTS "Payment" CASCADE;

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'WAITING_PAYMENT';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'RELEASED';

DO $$ BEGIN
  CREATE TYPE "PaymentSplitStatus" AS ENUM (
    'PENDING',
    'RESERVED',
    'WAITING_RELEASE',
    'RELEASED',
    'PAID',
    'FAILED',
    'BLOCKED',
    'REFUNDED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PayoutStatus" AS ENUM (
    'PENDING',
    'SCHEDULED',
    'PROCESSING',
    'PAID',
    'FAILED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "GatewayAccountStatus" AS ENUM (
    'PENDING',
    'ACTIVE',
    'INACTIVE',
    'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "GatewayKycStatus" AS ENUM (
    'PENDING',
    'VERIFIED',
    'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "gateway" TEXT NOT NULL DEFAULT 'simulated',
  "gatewayPaymentId" TEXT,
  "checkoutUrl" TEXT,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "paymentMethod" TEXT,
  "grossAmountCents" INTEGER NOT NULL,
  "freelancerAmountCents" INTEGER NOT NULL DEFAULT 0,
  "platformFeeCents" INTEGER NOT NULL DEFAULT 0,
  "companyFeeAmountCents" INTEGER NOT NULL DEFAULT 0,
  "freelancerFeeAmountCents" INTEGER NOT NULL DEFAULT 0,
  "gatewayFeeAmountCents" INTEGER NOT NULL DEFAULT 0,
  "platformAmountCents" INTEGER NOT NULL DEFAULT 0,
  "totalFreelancerAmountCents" INTEGER NOT NULL DEFAULT 0,
  "freelancerNetAmountCents" INTEGER NOT NULL DEFAULT 0,
  "amountToChargeCompanyCents" INTEGER NOT NULL DEFAULT 0,
  "walletAmountCents" INTEGER NOT NULL DEFAULT 0,
  "gatewayAmountCents" INTEGER NOT NULL DEFAULT 0,
  "gatewayTransactionId" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentSplit" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "freelancerId" TEXT NOT NULL,
  "recipientType" TEXT NOT NULL DEFAULT 'FREELANCER',
  "gatewayRecipientId" TEXT,
  "gatewayWalletId" TEXT,
  "amountCents" INTEGER NOT NULL DEFAULT 0,
  "grossAmountCents" INTEGER NOT NULL,
  "freelancerFeeAmountCents" INTEGER NOT NULL DEFAULT 0,
  "platformFeeAmountCents" INTEGER NOT NULL DEFAULT 0,
  "gatewayFeeAmountCents" INTEGER NOT NULL DEFAULT 0,
  "freelancerNetAmountCents" INTEGER NOT NULL,
  "splitStatus" "PaymentSplitStatus" NOT NULL DEFAULT 'RESERVED',
  "releaseStatus" "PaymentSplitStatus" NOT NULL DEFAULT 'WAITING_RELEASE',
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentSplit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payout" (
  "id" TEXT NOT NULL,
  "paymentSplitId" TEXT,
  "freelancerId" TEXT,
  "walletId" TEXT,
  "gatewayPayoutId" TEXT,
  "amountCents" INTEGER NOT NULL,
  "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
  "scheduledFor" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GatewayAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "freelancerId" TEXT,
  "companyId" TEXT,
  "gateway" TEXT NOT NULL,
  "gatewayCustomerId" TEXT,
  "gatewayRecipientId" TEXT,
  "gatewayWalletId" TEXT,
  "status" "GatewayAccountStatus" NOT NULL DEFAULT 'PENDING',
  "kycStatus" "GatewayKycStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GatewayAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentWebhookEvent" (
  "id" TEXT NOT NULL,
  "gateway" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "gatewayEventId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Payment_companyId_idx" ON "Payment"("companyId");
CREATE INDEX "Payment_eventId_idx" ON "Payment"("eventId");
CREATE UNIQUE INDEX "PaymentSplit_paymentId_contractId_key" ON "PaymentSplit"("paymentId", "contractId");
CREATE INDEX "PaymentSplit_contractId_idx" ON "PaymentSplit"("contractId");
CREATE INDEX "PaymentSplit_freelancerId_idx" ON "PaymentSplit"("freelancerId");
CREATE UNIQUE INDEX "Payout_paymentSplitId_key" ON "Payout"("paymentSplitId");
CREATE INDEX "GatewayAccount_userId_idx" ON "GatewayAccount"("userId");
CREATE INDEX "GatewayAccount_freelancerId_idx" ON "GatewayAccount"("freelancerId");
CREATE INDEX "GatewayAccount_companyId_idx" ON "GatewayAccount"("companyId");
CREATE UNIQUE INDEX "GatewayAccount_gateway_freelancerId_key" ON "GatewayAccount"("gateway", "freelancerId");
CREATE UNIQUE INDEX "GatewayAccount_gateway_companyId_key" ON "GatewayAccount"("gateway", "companyId");
CREATE UNIQUE INDEX "PaymentWebhookEvent_gatewayEventId_key" ON "PaymentWebhookEvent"("gatewayEventId");
CREATE INDEX "PaymentWebhookEvent_gateway_idx" ON "PaymentWebhookEvent"("gateway");
CREATE INDEX "PaymentWebhookEvent_processed_idx" ON "PaymentWebhookEvent"("processed");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentSplit" ADD CONSTRAINT "PaymentSplit_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentSplit" ADD CONSTRAINT "PaymentSplit_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentSplit" ADD CONSTRAINT "PaymentSplit_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "FreelancerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_paymentSplitId_fkey" FOREIGN KEY ("paymentSplitId") REFERENCES "PaymentSplit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "FreelancerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GatewayAccount" ADD CONSTRAINT "GatewayAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GatewayAccount" ADD CONSTRAINT "GatewayAccount_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "FreelancerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GatewayAccount" ADD CONSTRAINT "GatewayAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
