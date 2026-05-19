import type { UserRole } from "./api";

export type Skill = { id: string; name: string; slug: string };

export type EventItem = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  location: string;
  city?: string;
  state?: string;
  description?: string;
  eventType?: string;
  desiredProfessionals?: number;
  status: string;
  requirements?: Array<{
    id?: string;
    skillId: string;
    quantity: number;
    dailyRateCents?: number;
    skill?: Skill;
  }>;
};

export type Freelancer = {
  id: string;
  displayName?: string;
  city?: string;
  state?: string;
  dailyRateCents?: number;
  ratingAverage?: string;
  isAvailable?: boolean;
  blockingReason?: string;
  skills?: Array<{ skill: Skill; dailyRateCents?: number }>;
};

export type Invitation = {
  id: string;
  status: string;
  expiresAt: string;
  event?: EventItem;
  company?: { companyName: string };
  freelancer?: Freelancer;
};

export type Contract = {
  id: string;
  status: string;
  amountCents: number;
  startsAt: string;
  event?: EventItem;
  company?: { companyName: string };
  freelancer?: Freelancer;
};

export type Payment = {
  id: string;
  status: string;
  grossAmountCents: number;
  freelancerAmountCents: number;
  platformFeeCents: number;
  contract?: Contract;
};

export type Review = {
  id: string;
  overallRating: number;
  comment?: string;
  createdAt: string;
  contract?: Contract;
};

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body?: string;
  readAt?: string;
  createdAt: string;
};

export type Dispute = {
  id: string;
  reason: string;
  status: string;
  details?: string;
  createdAt: string;
  contract?: Contract;
};

export type WalletData = {
  balanceCents: number;
  transactions: Array<{
    id: string;
    type: string;
    amountCents: number;
    description?: string;
  }>;
};

export type AvailabilityItem = {
  id: string;
  startsAt: string;
  endsAt: string;
  isAvailable: boolean;
  reason?: string;
};

export type FreelancerProfile = {
  id: string;
  displayName?: string;
  avatarUrl?: string;
  city?: string;
  state?: string;
  tools?: string;
  transportation?: string;
  dailyRateCents?: number;
  skills: Array<{ skill: Skill; dailyRateCents?: number }>;
};

export type CompanyProfile = {
  id: string;
  companyName: string;
  document?: string;
  responsibleName: string;
  phone?: string;
  email: string;
  logoUrl?: string;
  city?: string;
  state?: string;
};

export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type AdminCompany = CompanyProfile & {
  verificationStatus: VerificationStatus;
  ratingAverage?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  };
  wallet?: { balanceCents: number };
};

export type AdminFreelancer = Freelancer & {
  verificationStatus: VerificationStatus;
  avatarUrl?: string;
  tools?: string;
  transportation?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    isActive: boolean;
  };
  wallet?: { balanceCents: number };
};

export type ReportSummary = {
  scope: UserRole;
  totals: Record<string, number>;
  contractStatus: Array<{ status: string; count: number }>;
  eventStatus: Array<{ status: string; count: number }>;
};
