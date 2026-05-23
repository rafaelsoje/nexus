-- Add richer freelancer resume fields.
ALTER TABLE "FreelancerProfile"
ADD COLUMN "professionalSummary" TEXT,
ADD COLUMN "experienceYears" INTEGER,
ADD COLUMN "eventTypes" TEXT,
ADD COLUMN "certifications" TEXT,
ADD COLUMN "portfolioUrl" TEXT,
ADD COLUMN "travelAvailability" TEXT;

ALTER TABLE "FreelancerSkill"
ADD COLUMN "knowledgeLevel" TEXT,
ADD COLUMN "experienceSummary" TEXT,
ADD COLUMN "equipment" TEXT,
ADD COLUMN "courses" TEXT,
ADD COLUMN "abilities" JSONB;
