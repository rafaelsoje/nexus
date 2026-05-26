CREATE TABLE "CompanyFavoriteFreelancer" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyFavoriteFreelancer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyFavoriteFreelancer_companyId_freelancerId_key" ON "CompanyFavoriteFreelancer"("companyId", "freelancerId");
CREATE INDEX "CompanyFavoriteFreelancer_companyId_idx" ON "CompanyFavoriteFreelancer"("companyId");
CREATE INDEX "CompanyFavoriteFreelancer_freelancerId_idx" ON "CompanyFavoriteFreelancer"("freelancerId");
CREATE INDEX "CompanyFavoriteFreelancer_createdById_idx" ON "CompanyFavoriteFreelancer"("createdById");

ALTER TABLE "CompanyFavoriteFreelancer" ADD CONSTRAINT "CompanyFavoriteFreelancer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyFavoriteFreelancer" ADD CONSTRAINT "CompanyFavoriteFreelancer_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "FreelancerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyFavoriteFreelancer" ADD CONSTRAINT "CompanyFavoriteFreelancer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
