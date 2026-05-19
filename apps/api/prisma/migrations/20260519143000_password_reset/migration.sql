ALTER TABLE "User"
ADD COLUMN "resetTokenHash" TEXT,
ADD COLUMN "resetTokenExpiresAt" TIMESTAMP(3);
