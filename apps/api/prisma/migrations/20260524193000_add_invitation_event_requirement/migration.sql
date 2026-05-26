ALTER TABLE "Invitation" ADD COLUMN "eventRequirementId" TEXT;

CREATE INDEX "Invitation_eventRequirementId_idx" ON "Invitation"("eventRequirementId");

ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_eventRequirementId_fkey" FOREIGN KEY ("eventRequirementId") REFERENCES "EventRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
