import type { UserRole } from "./api";

export type Skill = { id: string; name: string; slug: string };

export type EventItem = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  location: string;
  status: string;
  requirements?: Array<{
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

export type WalletData = {
  balanceCents: number;
  transactions: Array<{
    id: string;
    type: string;
    amountCents: number;
    description?: string;
  }>;
};

export type ReportSummary = {
  scope: UserRole;
  totals: Record<string, number>;
  contractStatus: Array<{ status: string; count: number }>;
  eventStatus: Array<{ status: string; count: number }>;
};
