CREATE TYPE "GatewayProvider" AS ENUM ('SIMULATED', 'ASAAS', 'PAGARME', 'IUGU');

ALTER TABLE "GatewayAccount"
ADD COLUMN "documentType" TEXT,
ADD COLUMN "documentNumber" TEXT,
ADD COLUMN "bankCode" TEXT,
ADD COLUMN "agency" TEXT,
ADD COLUMN "account" TEXT,
ADD COLUMN "accountDigit" TEXT,
ADD COLUMN "accountType" TEXT,
ADD COLUMN "pixKey" TEXT,
ADD COLUMN "pixKeyType" TEXT,
ADD COLUMN "rawGatewayResponse" JSONB,
ADD COLUMN "errorMessage" TEXT;

ALTER TYPE "GatewayAccountStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "GatewayAccountStatus" ADD VALUE IF NOT EXISTS 'BLOCKED';
ALTER TYPE "GatewayAccountStatus" ADD VALUE IF NOT EXISTS 'ERROR';

ALTER TYPE "GatewayKycStatus" ADD VALUE IF NOT EXISTS 'NOT_STARTED';
ALTER TYPE "GatewayKycStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "GatewayKycStatus" ADD VALUE IF NOT EXISTS 'REQUIRED_MORE_INFO';

ALTER TABLE "GatewayAccount"
ALTER COLUMN "gateway" DROP DEFAULT;

ALTER TABLE "GatewayAccount"
ALTER COLUMN "gateway" TYPE "GatewayProvider"
USING upper("gateway")::"GatewayProvider";

ALTER TABLE "GatewayAccount"
ALTER COLUMN "gateway" SET DEFAULT 'SIMULATED';
