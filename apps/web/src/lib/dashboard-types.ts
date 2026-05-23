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
  openSpots?: number;
  status: string;
  company?: { companyName: string; city?: string; state?: string };
  invitations?: Array<{ id: string; status: string }>;
  contracts?: Array<{ id: string; status: string }>;
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
  avatarUrl?: string;
  user?: { name: string };
  city?: string;
  state?: string;
  tools?: string;
  transportation?: string;
  dailyRateCents?: number;
  professionalSummary?: string;
  experienceYears?: number;
  eventTypes?: string;
  certifications?: string;
  portfolioUrl?: string;
  travelAvailability?: string;
  ratingAverage?: string;
  isAvailable?: boolean;
  blockingReason?: string;
  skills?: FreelancerSkillDetail[];
  contracts?: FreelancerPublicContract[];
};

export type FreelancerSkillDetail = {
  skill: Skill;
  dailyRateCents?: number;
  knowledgeLevel?: string;
  experienceSummary?: string;
  equipment?: string;
  courses?: string;
  abilities?: string[];
};

export type FreelancerPublicContract = {
  id: string;
  status: string;
  startsAt: string;
  event?: {
    name: string;
    eventType?: string;
    city?: string;
    state?: string;
    company?: { companyName: string };
  };
};

export type Invitation = {
  id: string;
  status: string;
  expiresAt: string;
  proposedAmountCents?: number;
  counterAmountCents?: number;
  agreedAmountCents?: number;
  event?: EventItem;
  company?: { companyName: string };
  freelancer?: Freelancer;
};

export type Application = {
  id: string;
  status: string;
  message?: string;
  proposedAmountCents?: number;
  createdAt: string;
  event?: EventItem;
  company?: { companyName: string; city?: string; state?: string };
  freelancer?: Freelancer;
  contract?: Contract;
};

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  sender?: { id: string; name: string; role: string };
};

export type ChatThread = {
  id: string;
  event?: EventItem;
  company?: { id: string; companyName: string; city?: string; state?: string };
  freelancer?: Freelancer;
  application?: Application;
  invitation?: Invitation;
  messages: ChatMessage[];
};

export type Contract = {
  id: string;
  status: string;
  amountCents: number;
  platformFeeCents: number;
  startsAt: string;
  endsAt: string;
  event?: EventItem;
  company?: { companyName: string };
  freelancer?: Freelancer;
  payment?: {
    id: string;
    status: string;
    grossAmountCents: number;
    freelancerAmountCents: number;
    companyFeeAmountCents?: number;
    freelancerFeeAmountCents?: number;
    gatewayFeeAmountCents?: number;
    platformAmountCents?: number;
    freelancerNetAmountCents?: number;
    amountToChargeCompanyCents?: number;
    amountToReleaseFreelancerCents?: number;
  };
};

export type Payment = {
  id: string;
  status: string;
  grossAmountCents: number;
  freelancerAmountCents: number;
  platformFeeCents: number;
  companyFeeAmountCents?: number;
  freelancerFeeAmountCents?: number;
  gatewayFeeAmountCents?: number;
  platformAmountCents?: number;
  freelancerNetAmountCents?: number;
  amountToChargeCompanyCents?: number;
  amountToReleaseFreelancerCents?: number;
  walletAmountCents?: number;
  gatewayAmountCents?: number;
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

export type VerificationDocument = {
  id: string;
  category: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type FreelancerProfile = {
  id: string;
  fullName?: string;
  cpf?: string;
  identityDocument?: string;
  displayName?: string;
  avatarUrl?: string;
  postalCode?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  tools?: string;
  transportation?: string;
  dailyRateCents?: number;
  professionalSummary?: string;
  experienceYears?: number;
  eventTypes?: string;
  certifications?: string;
  portfolioUrl?: string;
  travelAvailability?: string;
  skills: FreelancerSkillDetail[];
  verificationDocuments?: VerificationDocument[];
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
  verificationDocuments?: VerificationDocument[];
};

export type CompanyMemberRole =
  | "OWNER"
  | "ADMIN"
  | "FINANCE"
  | "OPERATOR"
  | "VIEWER";

export type CompanyMember = {
  id: string;
  role: CompanyMemberRole;
  isActive: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    isActive: boolean;
  };
};

export type CompanyInvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "EXPIRED"
  | "CANCELLED";

export type CompanyTeamInvitation = {
  id: string;
  email: string;
  role: CompanyMemberRole;
  status: CompanyInvitationStatus;
  expiresAt: string;
  createdAt: string;
  token?: string;
};

export type CompanyTeam = {
  members: CompanyMember[];
  invitations: CompanyTeamInvitation[];
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
  verificationDocuments?: VerificationDocument[];
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    isActive: boolean;
  };
  wallet?: { balanceCents: number };
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};

export type ReportSummary = {
  scope: UserRole;
  totals: Record<string, number>;
  contractStatus: Array<{ status: string; count: number }>;
  eventStatus: Array<{ status: string; count: number }>;
  paymentStatus: Array<{ status: string; count: number }>;
  paymentTrend: Array<{
    month: string;
    label: string;
    grossAmountCents: number;
    freelancerAmountCents: number;
    platformFeeCents: number;
    payments: number;
  }>;
};
