ALTER TABLE "Application" ADD COLUMN "eventRequirementId" TEXT;

CREATE INDEX "Application_eventRequirementId_idx" ON "Application"("eventRequirementId");

ALTER TABLE "Application" ADD CONSTRAINT "Application_eventRequirementId_fkey" FOREIGN KEY ("eventRequirementId") REFERENCES "EventRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
