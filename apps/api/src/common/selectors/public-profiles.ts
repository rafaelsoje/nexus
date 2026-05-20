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
  ratingAverage: true,
  verificationStatus: true,
  user: { select: { name: true } },
  skills: {
    select: {
      dailyRateCents: true,
      skill: { select: { id: true, name: true, slug: true } },
    },
  },
} as const;
