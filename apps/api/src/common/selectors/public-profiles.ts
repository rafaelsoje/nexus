import { ContractStatus } from "@prisma/client";

const publicFreelancerHistoryStatuses: ContractStatus[] = [
  ContractStatus.COMPLETED,
  ContractStatus.PAID,
];

export const publicCompanySelect = {
  id: true,
  companyName: true,
  logoUrl: true,
  city: true,
  state: true,
  ratingAverage: true,
  verificationStatus: true,
} as const;

export const publicFreelancerSelect = {
  id: true,
  displayName: true,
  avatarUrl: true,
  city: true,
  state: true,
  tools: true,
  transportation: true,
  dailyRateCents: true,
  professionalSummary: true,
  experienceYears: true,
  eventTypes: true,
  certifications: true,
  portfolioUrl: true,
  travelAvailability: true,
  ratingAverage: true,
  verificationStatus: true,
  user: { select: { name: true } },
  skills: {
    select: {
      dailyRateCents: true,
      knowledgeLevel: true,
      experienceSummary: true,
      equipment: true,
      courses: true,
      abilities: true,
      skill: { select: { id: true, name: true, slug: true } },
    },
  },
  contracts: {
    where: { status: { in: publicFreelancerHistoryStatuses } },
    orderBy: { startsAt: "desc" },
    take: 5,
    select: {
      id: true,
      status: true,
      startsAt: true,
      event: {
        select: {
          name: true,
          eventType: true,
          city: true,
          state: true,
          company: { select: { companyName: true } },
        },
      },
    },
  },
} as const;
