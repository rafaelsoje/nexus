"use client";

import {
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  ShieldCheck,
  Star,
  UsersRound,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardShell } from "../../components/dashboard-shell";
import { EmptyState, StatusMessage } from "../../components/ui";
import {
  apiRequest,
  formatCurrency,
  getSession,
  type AuthSession,
  type UserRole,
} from "../../lib/api";
import type { CompanyProfile } from "../../lib/dashboard-types";

type Skill = { id: string; name: string; slug: string };
type EventItem = {
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
type Freelancer = {
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
type Invitation = {
  id: string;
  status: string;
  expiresAt: string;
  event?: EventItem;
  company?: { companyName: string };
  freelancer?: Freelancer;
};
type Contract = {
  id: string;
  status: string;
  amountCents: number;
  startsAt: string;
  event?: EventItem;
  company?: { companyName: string };
  freelancer?: Freelancer;
};
type Payment = {
  id: string;
  status: string;
  grossAmountCents: number;
  freelancerAmountCents: number;
  platformFeeCents: number;
  event?: EventItem;
  company?: { companyName: string };
  splits?: Array<{
    id: string;
    freelancerNetAmountCents: number;
    releaseStatus: string;
    freelancer?: Freelancer;
    contract?: Contract;
  }>;
};
type WalletData = {
  balanceCents: number;
  transactions: Array<{
    id: string;
    type: string;
    amountCents: number;
    description?: string;
  }>;
};
type AvailabilityItem = {
  id: string;
  startsAt: string;
  endsAt: string;
  isAvailable: boolean;
  reason?: string;
};
type FreelancerProfile = {
  id: string;
  displayName?: string;
  avatarUrl?: string;
  dailyRateCents?: number;
  skills: Array<{
    skill: Skill;
    dailyRateCents?: number;
    knowledgeLevel?: string;
    experienceSummary?: string;
    equipment?: string;
    courses?: string;
    abilities?: string[];
  }>;
};
type AdminPayment = Payment & {
  contract?: Contract & {
    event?: EventItem;
    company?: { companyName: string };
    freelancer?: Freelancer;
  };
};
type AdminData = {
  users: unknown[];
  companies: unknown[];
  freelancers: unknown[];
  events: unknown[];
  payments: AdminPayment[];
  disputes: unknown[];
};
type ReportSummary = {
  scope: UserRole;
  totals: Record<string, number>;
  financialSummary?: {
    gmvCents: number;
    walletPaidCents: number;
    gatewayPaidCents: number;
    companyFeeCents: number;
    freelancerFeeCents: number;
    platformFeeCents: number;
    gatewayFeeCents: number;
    splitGrossCents: number;
    freelancerNetCents: number;
    walletBalanceCents: number;
    payoutAmountCents: number;
    chargebackAmountCents: number;
    chargebacks: number;
    refundedGrossCents: number;
    refunds: number;
    splitStatus: Array<{
      status: string;
      count: number;
      grossAmountCents: number;
      freelancerNetAmountCents: number;
      platformFeeAmountCents: number;
    }>;
    payoutStatus: Array<{
      status: string;
      count: number;
      amountCents: number;
    }>;
  };
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

const eventStatusLabels: Record<string, string> = {
  CANCELLED: "Cancelado",
  CONFIRMED: "Confirmado",
  DRAFT: "Rascunho",
  FINISHED: "Finalizado",
  IN_PROGRESS: "Em andamento",
  INVITING: "Convidando",
  OPEN: "Aberto",
};

const contractStatusLabels: Record<string, string> = {
  CANCELLED: "Cancelado",
  COMPLETED: "Concluído",
  CONFIRMED: "Confirmado",
  DISPUTED: "Em contestação",
  NO_SHOW: "Ausência",
  PAID: "Pago",
  PENDING_PAYMENT: "Aguardando pagamento",
};

const invitationStatusLabels: Record<string, string> = {
  ACCEPTED: "Aceito",
  CANCELLED: "Cancelado",
  DECLINED: "Recusado",
  EXPIRED: "Expirado",
  PENDING: "Pendente",
};

const paymentStatusLabels: Record<string, string> = {
  AUTHORIZED: "Autorizado",
  CHARGEBACK: "Contestação bancária",
  FAILED: "Falhou",
  PAID: "Pago",
  PENDING: "Pendente",
  REFUNDED: "Estornado",
  RELEASED: "Liberado",
};

const transactionTypeLabels: Record<string, string> = {
  CREDIT: "Crédito",
  DEBIT: "Débito",
  FEE: "Taxa",
  PAYOUT: "Repasse",
  REFUND: "Estorno",
};

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [availability, setAvailability] = useState<AvailabilityItem[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
    null,
  );
  const [freelancerProfile, setFreelancerProfile] =
    useState<FreelancerProfile | null>(null);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(
    null,
  );
  const [error, setError] = useState("");

  const role = session?.user.role;

  useEffect(() => {
    const stored = getSession();

    if (!stored) {
      router.push("/login");
      return;
    }

    setSession(stored);
  }, [router]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadDashboard(session.user.role);
    // Dashboard refresh is keyed by the active session; loadDashboard itself is reused by manual refresh handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const refresh = () => void loadDashboard(session.user.role);
    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshOnVisibility);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
    };
    // Dashboard refresh listeners should only be rebound when the active session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function loadDashboard(currentRole = role) {
    if (!currentRole) {
      return;
    }

    setError("");

    try {
      const [loadedSkills, loadedReport] = await Promise.all([
        apiRequest<Skill[]>("/api/skills"),
        apiRequest<ReportSummary>("/api/reports/summary"),
      ]);
      setSkills(loadedSkills);
      setReportSummary(loadedReport);

      if (currentRole === "COMPANY") {
        const [
          loadedEvents,
          loadedFreelancers,
          loadedInvitations,
          loadedContracts,
          loadedPayments,
          profile,
        ] = await Promise.all([
          apiRequest<EventItem[]>("/api/events"),
          apiRequest<Freelancer[]>("/api/freelancers"),
          apiRequest<Invitation[]>("/api/invitations/sent"),
          apiRequest<Contract[]>("/api/contracts"),
          apiRequest<Payment[]>("/api/payments"),
          apiRequest<CompanyProfile>("/api/companies/profile"),
        ]);
        setEvents(loadedEvents);
        setFreelancers(loadedFreelancers);
        setInvitations(loadedInvitations);
        setContracts(loadedContracts);
        setPayments(loadedPayments);
        setCompanyProfile(profile);
      }

      if (currentRole === "FREELANCER") {
        const [
          received,
          loadedContracts,
          walletData,
          availabilityData,
          profile,
        ] = await Promise.all([
          apiRequest<Invitation[]>("/api/invitations/received"),
          apiRequest<Contract[]>("/api/contracts"),
          apiRequest<WalletData>("/api/wallet"),
          apiRequest<AvailabilityItem[]>("/api/availability"),
          apiRequest<FreelancerProfile>("/api/freelancers/profile"),
        ]);
        setInvitations(received);
        setContracts(loadedContracts);
        setWallet(walletData);
        setAvailability(availabilityData);
        setFreelancerProfile(profile);
      }

      if (currentRole === "ADMIN") {
        const [
          users,
          companies,
          freelancersData,
          eventsData,
          paymentsData,
          disputes,
        ] = await Promise.all([
          apiRequest<unknown[]>("/api/admin/users"),
          apiRequest<unknown[]>("/api/admin/companies"),
          apiRequest<unknown[]>("/api/admin/freelancers"),
          apiRequest<unknown[]>("/api/admin/events"),
          apiRequest<AdminPayment[]>("/api/admin/payments"),
          apiRequest<unknown[]>("/api/admin/disputes"),
        ]);
        setAdminData({
          users,
          companies,
          freelancers: freelancersData,
          events: eventsData,
          payments: paymentsData,
          disputes,
        });
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao carregar dashboard.",
      );
    }
  }

  const metrics = useMemo(() => {
    if (role === "ADMIN") {
      return [
        ["Usuários", adminData?.users.length ?? 0],
        ["Empresas", adminData?.companies.length ?? 0],
        ["Freelancers", adminData?.freelancers.length ?? 0],
        ["Pagamentos", adminData?.payments.length ?? 0],
      ];
    }

    if (role === "FREELANCER") {
      return [
        ["Convites", invitations.length],
        ["Trabalhos", contracts.length],
        ["Saldo", formatCurrency(wallet?.balanceCents)],
        ["Skills", skills.length],
      ];
    }

    return [
      ["Eventos", events.length],
      ["Profissionais", freelancers.length],
      ["Convites", invitations.length],
      ["Contratos", contracts.length],
      ["Pagamentos", payments.length],
      [
        "Volume pago",
        formatCurrency(reportSummary?.totals.grossAmountCents ?? 0),
      ],
      [
        "Taxa plataforma",
        formatCurrency(reportSummary?.totals.platformFeeCents ?? 0),
      ],
      [
        "Repasse freelancers",
        formatCurrency(reportSummary?.totals.freelancerAmountCents ?? 0),
      ],
    ];
  }, [
    adminData,
    contracts.length,
    events.length,
    freelancers.length,
    invitations.length,
    payments.length,
    reportSummary,
    role,
    skills.length,
    wallet,
  ]);

  if (!session) {
    return null;
  }

  const dashboardDisplayName =
    role === "COMPANY"
      ? companyProfile?.companyName ?? "sua empresa"
      : role === "FREELANCER"
        ? freelancerProfile?.displayName ?? session.user.name
        : session.user.name;

  return (
    <DashboardShell
      eyebrow={session.user.role}
      title={`Olá, ${dashboardDisplayName}`}
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

      <section className="metrics">
        {metrics.map(([label, value]) => (
          <article className="metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      {role === "COMPANY" ? (
        <CompanyDashboard
          contracts={contracts}
          events={events}
          freelancers={freelancers}
          invitations={invitations}
          reportSummary={reportSummary}
        />
      ) : null}
      {role === "FREELANCER" ? (
        <FreelancerDashboard
          availability={availability}
          contracts={contracts}
          freelancerProfile={freelancerProfile}
          invitations={invitations}
          reportSummary={reportSummary}
          wallet={wallet}
        />
      ) : null}
      {role === "ADMIN" && adminData ? (
        <AdminDashboard data={adminData} reportSummary={reportSummary} />
      ) : null}
    </DashboardShell>
  );
}

function CompanyDashboard({
  contracts,
  events,
  freelancers,
  invitations,
  reportSummary,
}: Readonly<{
  contracts: Contract[];
  events: EventItem[];
  freelancers: Freelancer[];
  invitations: Invitation[];
  reportSummary: ReportSummary | null;
}>) {
  return (
    <section className="dashboard-grid">
      <ReportPanel reportSummary={reportSummary} />

      <ListPanel icon={<BadgeCheck size={18} />} title="Meus eventos">
        {events.map((event) => (
          <div className="list-row" key={event.id}>
            <div>
              <strong>{event.name}</strong>
              <span>{new Date(event.startsAt).toLocaleString("pt-BR")}</span>
            </div>
            <small>{formatEventStatus(event.status)}</small>
          </div>
        ))}
      </ListPanel>

      <ListPanel icon={<CreditCard size={18} />} title="Contratos e pagamentos">
        {contracts.map((contract) => (
          <div className="list-row" key={contract.id}>
            <div>
              <strong>{contract.event?.name ?? "Contrato"}</strong>
              <span>
                {formatCurrency(contract.amountCents)} -{" "}
                {formatContractStatus(contract.status)}
              </span>
            </div>
          </div>
        ))}
      </ListPanel>

      <ListPanel icon={<Bell size={18} />} title="Convites enviados">
        {invitations.map((invitation) => (
          <div className="list-row" key={invitation.id}>
            <div>
              <strong>
                {invitation.freelancer?.displayName ?? "Freelancer"}
              </strong>
              <span>
                {invitation.event?.name ?? "Evento"} -{" "}
                {formatInvitationStatus(invitation.status)}
              </span>
            </div>
          </div>
        ))}
      </ListPanel>

      <ListPanel icon={<UsersRound size={18} />} title="Profissionais recentes">
        {freelancers.slice(0, 5).map((freelancer) => (
          <div className="list-row" key={freelancer.id}>
            <div>
              <strong>{freelancer.displayName ?? "Profissional"}</strong>
              <span>
                {freelancer.city ?? "Cidade não informada"}
                {freelancer.dailyRateCents
                  ? ` - ${formatCurrency(freelancer.dailyRateCents)}`
                  : ""}
              </span>
            </div>
          </div>
        ))}
      </ListPanel>
    </section>
  );
}

function FreelancerDashboard({
  availability,
  contracts,
  freelancerProfile,
  invitations,
  reportSummary,
  wallet,
}: Readonly<{
  availability: AvailabilityItem[];
  contracts: Contract[];
  freelancerProfile: FreelancerProfile | null;
  invitations: Invitation[];
  reportSummary: ReportSummary | null;
  wallet: WalletData | null;
}>) {
  return (
    <section className="dashboard-grid">
      <ReportPanel reportSummary={reportSummary} />

      <article className="panel">
        <div className="panel-header">
          <h2>Especialidades e diárias</h2>
          <Star size={18} />
        </div>
        <div className="list">
          {freelancerProfile?.skills.length ? (
            freelancerProfile.skills.map((item) => (
              <div className="list-row" key={item.skill.id}>
                <div>
                  <strong>{item.skill.name}</strong>
                  <span>
                    {formatCurrency(item.dailyRateCents)}
                    {item.knowledgeLevel ? ` - ${item.knowledgeLevel}` : ""}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <EmptyState>Nenhuma especialidade adicionada.</EmptyState>
          )}
        </div>
        <Link
          className="secondary-button full"
          href="/dashboard/especialidades"
        >
          Gerenciar especialidades
        </Link>
      </article>

      <ListPanel icon={<CalendarDays size={18} />} title="Agenda bloqueada">
        {availability.map((item) => (
          <div className="list-row" key={item.id}>
            <div>
              <strong>{item.reason ?? "Indisponível"}</strong>
              <span>
                {new Date(item.startsAt).toLocaleString("pt-BR")} -{" "}
                {new Date(item.endsAt).toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
        ))}
      </ListPanel>

      <ListPanel icon={<Bell size={18} />} title="Convites recebidos">
        {invitations.map((invitation) => (
          <div className="list-row" key={invitation.id}>
            <div>
              <strong>{invitation.event?.name ?? "Evento"}</strong>
              <span>
                {invitation.company?.companyName ?? "Empresa"} -{" "}
                {formatInvitationStatus(invitation.status)}
              </span>
            </div>
          </div>
        ))}
      </ListPanel>

      <ListPanel icon={<BriefcaseBusiness size={18} />} title="Trabalhos">
        {contracts.map((contract) => (
          <div className="list-row" key={contract.id}>
            <div>
              <strong>{contract.event?.name ?? "Evento"}</strong>
              <span>
                {formatCurrency(contract.amountCents)} -{" "}
                {formatContractStatus(contract.status)}
              </span>
            </div>
          </div>
        ))}
      </ListPanel>

      <ListPanel icon={<Wallet size={18} />} title="Carteira">
        <div className="wallet-balance">
          {formatCurrency(wallet?.balanceCents)}
        </div>
        {wallet?.transactions?.map((transaction) => (
          <div className="list-row" key={transaction.id}>
            <div>
              <strong>{formatTransactionType(transaction.type)}</strong>
              <span>{transaction.description ?? "Transação"}</span>
            </div>
            <small>{formatCurrency(transaction.amountCents)}</small>
          </div>
        ))}
      </ListPanel>
    </section>
  );
}

function AdminDashboard({
  data,
  reportSummary,
}: Readonly<{
  data: AdminData;
  reportSummary: ReportSummary | null;
}>) {
  return (
    <section className="dashboard-grid">
      <ReportPanel reportSummary={reportSummary} />

      <AdminPanel
        icon={<UsersRound size={18} />}
        title="Usuários"
        value={data.users.length}
      />
      <AdminPanel
        icon={<ShieldCheck size={18} />}
        title="Empresas"
        value={data.companies.length}
      />
      <AdminPanel
        icon={<Star size={18} />}
        title="Freelancers"
        value={data.freelancers.length}
      />
      <AdminPanel
        icon={<CalendarDays size={18} />}
        title="Eventos"
        value={data.events.length}
      />
      <AdminPanel
        icon={<CreditCard size={18} />}
        title="Pagamentos"
        value={data.payments.length}
      />
      <AdminPanel
        icon={<Bell size={18} />}
        title="Contestações"
        value={data.disputes.length}
      />
      <ListPanel icon={<CreditCard size={18} />} title="Pagamentos">
        {data.payments.map((payment) => (
          <div className="list-row" key={payment.id}>
            <div>
              <strong>{payment.event?.name ?? "Pagamento"}</strong>
              <span>
                {formatCurrency(payment.grossAmountCents)} -{" "}
                {formatPaymentStatus(payment.status)}
              </span>
              <span>{payment.splits?.length ?? 0} profissional(is)</span>
            </div>
          </div>
        ))}
      </ListPanel>
    </section>
  );
}

function ReportPanel({
  reportSummary,
}: Readonly<{ reportSummary: ReportSummary | null }>) {
  const totals = reportSummary?.totals ?? {};
  const financial = reportSummary?.financialSummary;
  const financialEntries = [
    {
      key: "freelancerAmountCents",
      label: "Repasse",
      value: financial?.freelancerNetCents ?? totals.freelancerAmountCents ?? 0,
    },
    {
      key: "platformFeeCents",
      label: "Taxa",
      value: financial?.platformFeeCents ?? totals.platformFeeCents ?? 0,
    },
  ];
  const financialTotal = financialEntries.reduce(
    (sum, entry) => sum + entry.value,
    0,
  );
  const paidVolume = financial?.gmvCents ?? totals.grossAmountCents ?? 0;
  const financialTrend = reportSummary?.paymentTrend ?? [];
  const statusLabels: Record<string, string> = {
    CANCELLED: "Cancelado",
    COMPLETED: "Concluído",
    CONFIRMED: "Confirmado",
    DRAFT: "Rascunho",
    NO_SHOW: "Ausência",
    PAID: "Pago",
    PENDING: "Pendente",
    PENDING_PAYMENT: "Aguardando pagamento",
    PUBLISHED: "Publicado",
    REFUNDED: "Estornado",
    RELEASED: "Repassado",
    WAITING_PAYMENT: "Aguardando pagamento",
    WAITING_RELEASE: "Aguardando liberação",
    BLOCKED: "Bloqueado",
    CHARGEBACK: "Chargeback",
    FAILED: "Falhou",
    RESERVED: "Reservado",
    SCHEDULED: "Agendado",
    PROCESSING: "Processando",
  };
  const financialTiles = financial
    ? [
        { label: "GMV", value: financial.gmvCents },
        { label: "Carteira", value: financial.walletPaidCents },
        { label: "Gateway", value: financial.gatewayPaidCents },
        { label: "Taxa NEXO", value: financial.platformFeeCents },
        { label: "Repasse liquido", value: financial.freelancerNetCents },
        { label: "Payouts", value: financial.payoutAmountCents },
        { label: "Bloqueado", value: sumSplitStatus(financial, "BLOCKED") },
        { label: "Estornado", value: financial.refundedGrossCents },
        { label: "Chargeback", value: financial.chargebackAmountCents },
        { label: "Saldo carteiras", value: financial.walletBalanceCents },
      ]
    : [];

  return (
    <article className="panel report-panel">
      <div className="panel-header">
        <h2>Relatórios</h2>
        <BriefcaseBusiness size={18} />
      </div>

      <div className="report-charts">
        <DonutStatusChart
          items={reportSummary?.contractStatus ?? []}
          labels={statusLabels}
          title="Contratos por status"
        />
        <BarStatusChart
          items={reportSummary?.paymentStatus ?? []}
          labels={statusLabels}
          title="Pagamentos por status"
        />
        <BarStatusChart
          items={reportSummary?.eventStatus ?? []}
          labels={statusLabels}
          title="Eventos por status"
        />
      </div>

      {financial ? (
        <>
          <div className="report-grid financial-report-grid">
            {financialTiles.map((item) => (
              <div className="report-tile" key={item.label}>
                <span>{item.label}</span>
                <strong>{formatCurrency(item.value)}</strong>
              </div>
            ))}
          </div>

          <div className="status-strip">
            {financial.splitStatus.map((item) => (
              <span key={item.status}>
                Split {statusLabels[item.status] ?? item.status}: {item.count} -{" "}
                {formatCurrency(item.freelancerNetAmountCents)}
              </span>
            ))}
            {financial.payoutStatus.map((item) => (
              <span key={item.status}>
                Payout {statusLabels[item.status] ?? item.status}: {item.count}{" "}
                - {formatCurrency(item.amountCents)}
              </span>
            ))}
          </div>
        </>
      ) : null}

      {financialTotal > 0 ? (
        <div className="financial-chart">
          <div className="financial-chart-header">
            <span>Composição financeira</span>
            <strong>{formatCurrency(paidVolume)}</strong>
          </div>
          <div className="area-chart-shell">
            <ResponsiveContainer height={180} width="100%">
              <AreaChart
                data={financialTrend}
                margin={{ bottom: 0, left: 0, right: 8, top: 12 }}
              >
                <defs>
                  <linearGradient
                    id="paidVolumeFill"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#7c3cff" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#00bfff" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  content={<ChartTooltip valueFormatter={formatCurrency} />}
                  cursor={{ stroke: "rgba(0, 191, 255, 0.28)" }}
                />
                <Area
                  dataKey="grossAmountCents"
                  fill="url(#paidVolumeFill)"
                  name="Volume"
                  stroke="#7c3cff"
                  strokeWidth={3}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            {financialEntries.map((entry) => (
              <span key={entry.key}>
                <i className={entry.key} />
                {entry.label}: {formatCurrency(entry.value)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function sumSplitStatus(
  financial: NonNullable<ReportSummary["financialSummary"]>,
  status: string,
) {
  return financial.splitStatus
    .filter((item) => item.status === status)
    .reduce((total, item) => total + item.freelancerNetAmountCents, 0);
}

function DonutStatusChart({
  items,
  labels,
  title,
}: Readonly<{
  items: Array<{ status: string; count: number }>;
  labels: Record<string, string>;
  title: string;
}>) {
  const chartData = buildStatusChartData(items, labels);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="status-chart">
      <div className="chart-title">
        <span>{title}</span>
        <strong>{total}</strong>
      </div>
      {chartData.length ? (
        <div className="donut-layout">
          <ResponsiveContainer height={180} width="100%">
            <PieChart>
              <Pie
                cx="50%"
                cy="50%"
                data={chartData}
                dataKey="value"
                innerRadius={52}
                outerRadius={72}
                paddingAngle={3}
                stroke="var(--background)"
                strokeWidth={4}
              >
                {chartData.map((entry) => (
                  <Cell fill={entry.color} key={entry.name} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend compact">
            {chartData.map((entry) => (
              <span key={entry.name}>
                <i style={{ background: entry.color }} />
                {entry.name}: {entry.value}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState>Nenhum dado para exibir.</EmptyState>
      )}
    </div>
  );
}

function BarStatusChart({
  items,
  labels,
  title,
}: Readonly<{
  items: Array<{ status: string; count: number }>;
  labels: Record<string, string>;
  title: string;
}>) {
  const chartData = buildStatusChartData(items, labels);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="status-chart">
      <div className="chart-title">
        <span>{title}</span>
        <strong>{total}</strong>
      </div>
      {chartData.length ? (
        <ResponsiveContainer height={220} width="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ bottom: 0, left: 0, right: 16, top: 16 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
            <XAxis allowDecimals={false} axisLine={false} hide type="number" />
            <YAxis
              axisLine={false}
              dataKey="name"
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              tickLine={false}
              type="category"
              width={104}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: "rgba(0, 191, 255, 0.06)" }}
            />
            <Bar dataKey="value" name="Total" radius={[0, 8, 8, 0]}>
              {chartData.map((entry) => (
                <Cell fill={entry.color} key={entry.name} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState>Nenhum dado para exibir.</EmptyState>
      )}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  valueFormatter,
}: Readonly<{
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    payload?: { name?: string };
  }>;
  valueFormatter?: (value?: number) => string;
}>) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0];
  const label = item.payload?.name ?? item.name ?? "Total";
  const value = valueFormatter ? valueFormatter(item.value) : item.value;

  return (
    <div className="chart-tooltip">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildStatusChartData(
  items: Array<{ status: string; count: number }>,
  labels: Record<string, string>,
) {
  const colors = ["#7c3cff", "#00bfff", "#35d399", "#ffb84d", "#ff6b9d"];

  return items.map((item, index) => ({
    color: colors[index % colors.length],
    name: labels[item.status] ?? item.status,
    value: item.count,
  }));
}

function formatEventStatus(status: string) {
  return eventStatusLabels[status] ?? status;
}

function formatContractStatus(status: string) {
  return contractStatusLabels[status] ?? status;
}

function formatInvitationStatus(status: string) {
  return invitationStatusLabels[status] ?? status;
}

function formatPaymentStatus(status: string) {
  return paymentStatusLabels[status] ?? status;
}

function formatTransactionType(type: string) {
  return transactionTypeLabels[type] ?? type;
}

function AdminPanel({
  icon,
  title,
  value,
}: Readonly<{ icon: React.ReactNode; title: string; value: number }>) {
  return (
    <article className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
        {icon}
      </div>
      <div className="admin-count">{value}</div>
    </article>
  );
}

function ListPanel({
  children,
  icon,
  title,
}: Readonly<{
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}>) {
  return (
    <article className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
        {icon}
      </div>
      <div className="list">
        {children || <EmptyState>Nenhum item encontrado.</EmptyState>}
      </div>
    </article>
  );
}
