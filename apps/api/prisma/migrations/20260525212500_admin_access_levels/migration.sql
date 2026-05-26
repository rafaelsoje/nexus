CREATE TYPE "AdminAccessLevel" AS ENUM ('OWNER', 'MANAGER', 'FINANCE', 'SUPPORT', 'VERIFICATION', 'READONLY');

CREATE TABLE "AdminProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessLevel" "AdminAccessLevel" NOT NULL DEFAULT 'READONLY',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminProfile_userId_key" ON "AdminProfile"("userId");
CREATE INDEX "AdminProfile_accessLevel_idx" ON "AdminProfile"("accessLevel");
CREATE INDEX "AdminProfile_createdById_idx" ON "AdminProfile"("createdById");

ALTER TABLE "AdminProfile" ADD CONSTRAINT "AdminProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminProfile" ADD CONSTRAINT "AdminProfile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "AdminProfile" ("id", "userId", "accessLevel", "createdAt", "updatedAt")
SELECT concat('admin_profile_', "id"), "id", 'OWNER'::"AdminAccessLevel", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE "role" = 'ADMIN'
ON CONFLICT ("userId") DO NOTHING;
