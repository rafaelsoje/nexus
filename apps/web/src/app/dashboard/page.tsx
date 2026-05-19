"use client";

import {
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Star,
  UsersRound,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState, Field, StatusMessage } from "../../components/ui";
import {
  apiRequest,
  clearSession,
  formatCurrency,
  getSession,
  type AuthSession,
  type UserRole,
} from "../../lib/api";

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
  contract?: Contract;
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
  dailyRateCents?: number;
  skills: Array<{ skill: Skill; dailyRateCents?: number }>;
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
  contractStatus: Array<{ status: string; count: number }>;
  eventStatus: Array<{ status: string; count: number }>;
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
  const [freelancerProfile, setFreelancerProfile] =
    useState<FreelancerProfile | null>(null);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(
    null,
  );
  const [selectedEventId, setSelectedEventId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

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
  }, [session]);

  async function loadDashboard(currentRole = role) {
    if (!currentRole) {
      return;
    }

    setError("");
    setLoading(true);

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
        ] = await Promise.all([
          apiRequest<EventItem[]>("/api/events"),
          apiRequest<Freelancer[]>("/api/freelancers"),
          apiRequest<Invitation[]>("/api/invitations/sent"),
          apiRequest<Contract[]>("/api/contracts"),
          apiRequest<Payment[]>("/api/payments"),
        ]);
        setEvents(loadedEvents);
        setFreelancers(loadedFreelancers);
        setInvitations(loadedInvitations);
        setContracts(loadedContracts);
        setPayments(loadedPayments);
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
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearSession();
    router.push("/login");
  }

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setSuccess("");

    try {
      await apiRequest("/api/events", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name")),
          startsAt: String(form.get("startsAt")),
          endsAt: String(form.get("endsAt")),
          location: String(form.get("location")),
          city: String(form.get("city")),
          state: String(form.get("state")),
          eventType: String(form.get("eventType")),
          requirements: [
            {
              skillId: String(form.get("skillId")),
              quantity: Number(form.get("quantity")),
              dailyRateCents: Number(form.get("dailyRate")) * 100,
            },
          ],
        }),
      });
      event.currentTarget.reset();
      setSuccess("Evento criado.");
      await loadDashboard("COMPANY");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao criar evento.",
      );
    }
  }

  async function handleSearchFreelancers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const eventId = String(form.get("eventId") ?? "");
    setError("");
    setSelectedEventId(eventId);

    try {
      const data = await apiRequest<Freelancer[]>(
        `/api/events/available-freelancers?startsAt=${encodeURIComponent(
          String(form.get("startsAt")),
        )}&endsAt=${encodeURIComponent(String(form.get("endsAt")))}&skillId=${encodeURIComponent(
          String(form.get("skillId")),
        )}`,
      );
      setFreelancers(data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao buscar freelancers.",
      );
    }
  }

  async function inviteFreelancer(freelancerId: string) {
    const eventId = selectedEventId || events[0]?.id;

    if (!eventId) {
      setError("Crie um evento antes de enviar convites.");
      return;
    }

    try {
      await apiRequest("/api/invitations", {
        method: "POST",
        body: JSON.stringify({
          eventId,
          freelancerId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          message: "Convite enviado pela plataforma nexus.",
        }),
      });
      setSuccess("Convite enviado.");
      await loadDashboard("COMPANY");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao enviar convite.",
      );
    }
  }

  async function respondInvitation(
    invitationId: string,
    action: "accept" | "decline",
  ) {
    try {
      await apiRequest(`/api/invitations/${invitationId}/${action}`, {
        method: "POST",
      });
      setSuccess(action === "accept" ? "Convite aceito." : "Convite recusado.");
      await loadDashboard("FREELANCER");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao responder convite.",
      );
    }
  }

  async function payContract(contractId: string) {
    try {
      await apiRequest(`/api/payments/contracts/${contractId}/pay`, {
        method: "POST",
      });
      setSuccess("Pagamento simulado realizado.");
      await loadDashboard("COMPANY");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao pagar contrato.",
      );
    }
  }

  async function handleSaveFreelancerSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setSuccess("");

    try {
      await apiRequest("/api/freelancers/skills", {
        method: "POST",
        body: JSON.stringify({
          skills: [
            {
              skillId: String(form.get("skillId")),
              dailyRateCents: Number(form.get("dailyRate")) * 100,
            },
          ],
        }),
      });
      setSuccess("Especialidade atualizada.");
      await loadDashboard("FREELANCER");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao salvar especialidade.",
      );
    }
  }

  async function handleCreateAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setSuccess("");

    try {
      await apiRequest("/api/availability", {
        method: "POST",
        body: JSON.stringify({
          startsAt: String(form.get("startsAt")),
          endsAt: String(form.get("endsAt")),
          reason: String(form.get("reason") || "Indisponível"),
        }),
      });
      event.currentTarget.reset();
      setSuccess("Indisponibilidade adicionada.");
      await loadDashboard("FREELANCER");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao adicionar indisponibilidade.",
      );
    }
  }

  async function removeAvailability(availabilityId: string) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/availability/${availabilityId}`, {
        method: "DELETE",
      });
      setSuccess("Indisponibilidade removida.");
      await loadDashboard("FREELANCER");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao remover indisponibilidade.",
      );
    }
  }

  async function releasePayment(paymentId: string) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/payments/${paymentId}/release`, {
        method: "POST",
      });
      setSuccess("Pagamento liberado para o freelancer.");
      await loadDashboard("ADMIN");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao liberar pagamento.",
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
      ["Pagamentos", payments.length],
    ];
  }, [
    adminData,
    contracts.length,
    events.length,
    freelancers.length,
    invitations.length,
    payments.length,
    role,
    skills.length,
    wallet,
  ]);

  if (!session) {
    return null;
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">N</span>
          <span>nexus</span>
        </div>
        <nav className="nav">
          <Link className="active" href="/dashboard">
            <CalendarDays size={18} />
            Dashboard
          </Link>
          <Link href="/dashboard/eventos">
            <BriefcaseBusiness size={18} />
            Eventos
          </Link>
          <Link href="/dashboard/profissionais">
            <UsersRound size={18} />
            Profissionais
          </Link>
          <Link href="/dashboard/convites">
            <Bell size={18} />
            Convites
          </Link>
          <Link href="/dashboard/notificacoes">
            <Bell size={18} />
            Notificações
          </Link>
          <Link href="/dashboard/pagamentos">
            <CreditCard size={18} />
            Pagamentos
          </Link>
          <Link href="/dashboard/avaliacoes">
            <Star size={18} />
            Avaliações
          </Link>
          <Link href="/dashboard/disputas">
            <ShieldAlert size={18} />
            Disputas
          </Link>
          <Link href="/dashboard/perfil">
            <Settings size={18} />
            Perfil
          </Link>
          <button className="nav-button" onClick={logout}>
            <LogOut size={18} />
            Sair
          </button>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{session.user.role}</p>
            <h1>Olá, {session.user.name}</h1>
          </div>
          <button className="primary-button" onClick={() => loadDashboard()}>
            <Search size={18} />
            Atualizar
          </button>
        </header>

        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? (
          <StatusMessage type="success">{success}</StatusMessage>
        ) : null}

        <section className="metrics">
          {metrics.map(([label, value]) => (
            <article className="metric" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </section>

        {loading ? <EmptyState>Carregando operação...</EmptyState> : null}
        {!loading && role === "COMPANY" ? (
          <CompanyDashboard
            contracts={contracts}
            events={events}
            freelancers={freelancers}
            invitations={invitations}
            reportSummary={reportSummary}
            selectedEventId={selectedEventId}
            skills={skills}
            onCreateEvent={handleCreateEvent}
            onInvite={inviteFreelancer}
            onPay={payContract}
            onSearch={handleSearchFreelancers}
          />
        ) : null}
        {!loading && role === "FREELANCER" ? (
          <FreelancerDashboard
            availability={availability}
            contracts={contracts}
            freelancerProfile={freelancerProfile}
            invitations={invitations}
            reportSummary={reportSummary}
            skills={skills}
            onCreateAvailability={handleCreateAvailability}
            onRemoveAvailability={removeAvailability}
            wallet={wallet}
            onRespond={respondInvitation}
            onSaveSkill={handleSaveFreelancerSkill}
          />
        ) : null}
        {!loading && role === "ADMIN" && adminData ? (
          <AdminDashboard
            data={adminData}
            onReleasePayment={releasePayment}
            reportSummary={reportSummary}
          />
        ) : null}
      </section>
    </main>
  );
}

function CompanyDashboard({
  contracts,
  events,
  freelancers,
  invitations,
  reportSummary,
  selectedEventId,
  skills,
  onCreateEvent,
  onInvite,
  onPay,
  onSearch,
}: Readonly<{
  contracts: Contract[];
  events: EventItem[];
  freelancers: Freelancer[];
  invitations: Invitation[];
  reportSummary: ReportSummary | null;
  selectedEventId: string;
  skills: Skill[];
  onCreateEvent: (event: FormEvent<HTMLFormElement>) => void;
  onInvite: (freelancerId: string) => void;
  onPay: (contractId: string) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  return (
    <section className="dashboard-grid">
      <article className="panel">
        <div className="panel-header">
          <h2>Criar evento</h2>
          <CalendarDays size={18} />
        </div>
        <form className="form compact" onSubmit={onCreateEvent}>
          <Field label="Nome">
            <input name="name" required />
          </Field>
          <div className="form-grid">
            <Field label="Início">
              <input name="startsAt" type="datetime-local" required />
            </Field>
            <Field label="Fim">
              <input name="endsAt" type="datetime-local" required />
            </Field>
          </div>
          <Field label="Local">
            <input name="location" required />
          </Field>
          <div className="form-grid">
            <Field label="Cidade">
              <input name="city" />
            </Field>
            <Field label="UF">
              <input name="state" maxLength={2} />
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Especialidade">
              <select name="skillId" required>
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Qtd.">
              <input
                name="quantity"
                type="number"
                defaultValue={1}
                min={1}
                required
              />
            </Field>
          </div>
          <Field label="Diária">
            <input
              name="dailyRate"
              type="number"
              min={0}
              defaultValue={300}
              required
            />
          </Field>
          <input name="eventType" type="hidden" value="Evento" />
          <button className="primary-button full" type="submit">
            Criar evento
          </button>
        </form>
      </article>

      <article className="panel">
        <div className="panel-header">
          <h2>Buscar freelancers</h2>
          <UsersRound size={18} />
        </div>
        <form className="form compact" onSubmit={onSearch}>
          <Field label="Evento para convite">
            <select name="eventId" defaultValue={selectedEventId} required>
              <option value="" disabled>
                Selecione um evento
              </option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Início">
              <input name="startsAt" type="datetime-local" required />
            </Field>
            <Field label="Fim">
              <input name="endsAt" type="datetime-local" required />
            </Field>
          </div>
          <Field label="Especialidade">
            <select name="skillId" required>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </Field>
          <button className="secondary-button full" type="submit">
            Buscar disponíveis
          </button>
        </form>
        <div className="list">
          {freelancers.map((freelancer) => (
            <div className="list-row" key={freelancer.id}>
              <div>
                <strong>{freelancer.displayName ?? "Profissional"}</strong>
                <span>
                  {freelancer.city ?? "Cidade não informada"}{" "}
                  {freelancer.isAvailable === false
                    ? `- ${freelancer.blockingReason}`
                    : ""}
                </span>
              </div>
              <button
                className="icon-action"
                disabled={freelancer.isAvailable === false}
                onClick={() => onInvite(freelancer.id)}
              >
                {freelancer.isAvailable === false ? "Indisponível" : "Convidar"}
              </button>
            </div>
          ))}
        </div>
      </article>

      <ListPanel icon={<BadgeCheck size={18} />} title="Meus eventos">
        {events.map((event) => (
          <div className="list-row" key={event.id}>
            <div>
              <strong>{event.name}</strong>
              <span>{new Date(event.startsAt).toLocaleString("pt-BR")}</span>
            </div>
            <small>{event.status}</small>
          </div>
        ))}
      </ListPanel>

      <ListPanel icon={<CreditCard size={18} />} title="Contratos e pagamentos">
        {contracts.map((contract) => (
          <div className="list-row" key={contract.id}>
            <div>
              <strong>{contract.event?.name ?? "Contrato"}</strong>
              <span>
                {formatCurrency(contract.amountCents)} - {contract.status}
              </span>
            </div>
            {contract.status === "PENDING_PAYMENT" ? (
              <button
                className="icon-action"
                onClick={() => onPay(contract.id)}
              >
                Pagar
              </button>
            ) : null}
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
                {invitation.event?.name ?? "Evento"} - {invitation.status}
              </span>
            </div>
          </div>
        ))}
      </ListPanel>

      <ReportPanel reportSummary={reportSummary} />
    </section>
  );
}

function FreelancerDashboard({
  availability,
  contracts,
  freelancerProfile,
  invitations,
  reportSummary,
  skills,
  wallet,
  onCreateAvailability,
  onRemoveAvailability,
  onRespond,
  onSaveSkill,
}: Readonly<{
  availability: AvailabilityItem[];
  contracts: Contract[];
  freelancerProfile: FreelancerProfile | null;
  invitations: Invitation[];
  reportSummary: ReportSummary | null;
  skills: Skill[];
  wallet: WalletData | null;
  onCreateAvailability: (event: FormEvent<HTMLFormElement>) => void;
  onRemoveAvailability: (availabilityId: string) => void;
  onRespond: (invitationId: string, action: "accept" | "decline") => void;
  onSaveSkill: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  return (
    <section className="dashboard-grid">
      <article className="panel">
        <div className="panel-header">
          <h2>Especialidade e diária</h2>
          <Star size={18} />
        </div>
        <form className="form compact" onSubmit={onSaveSkill}>
          <Field label="Especialidade principal">
            <select
              name="skillId"
              defaultValue={freelancerProfile?.skills[0]?.skill.id ?? ""}
              required
            >
              <option value="" disabled>
                Selecione uma especialidade
              </option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Diária para essa função">
            <input
              name="dailyRate"
              type="number"
              min={0}
              defaultValue={
                (freelancerProfile?.skills[0]?.dailyRateCents ??
                  freelancerProfile?.dailyRateCents ??
                  0) / 100
              }
              required
            />
          </Field>
          <button className="primary-button full" type="submit">
            Salvar especialidade
          </button>
        </form>
        <div className="list">
          {freelancerProfile?.skills.map((item) => (
            <div className="list-row" key={item.skill.id}>
              <div>
                <strong>{item.skill.name}</strong>
                <span>{formatCurrency(item.dailyRateCents)}</span>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <h2>Indisponibilidade</h2>
          <CalendarDays size={18} />
        </div>
        <form className="form compact" onSubmit={onCreateAvailability}>
          <div className="form-grid">
            <Field label="Início">
              <input name="startsAt" type="datetime-local" required />
            </Field>
            <Field label="Fim">
              <input name="endsAt" type="datetime-local" required />
            </Field>
          </div>
          <Field label="Motivo">
            <input name="reason" placeholder="Outro evento, viagem..." />
          </Field>
          <button className="secondary-button full" type="submit">
            Bloquear agenda
          </button>
        </form>
        <div className="list">
          {availability.map((item) => (
            <div className="list-row" key={item.id}>
              <div>
                <strong>{item.reason ?? "Indisponível"}</strong>
                <span>
                  {new Date(item.startsAt).toLocaleString("pt-BR")} -{" "}
                  {new Date(item.endsAt).toLocaleString("pt-BR")}
                </span>
              </div>
              <button
                className="icon-action ghost"
                onClick={() => onRemoveAvailability(item.id)}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </article>

      <ListPanel icon={<Bell size={18} />} title="Convites recebidos">
        {invitations.map((invitation) => (
          <div className="list-row" key={invitation.id}>
            <div>
              <strong>{invitation.event?.name ?? "Evento"}</strong>
              <span>
                {invitation.company?.companyName ?? "Empresa"} -{" "}
                {invitation.status}
              </span>
            </div>
            {invitation.status === "PENDING" ? (
              <div className="row-actions">
                <button
                  className="icon-action"
                  onClick={() => onRespond(invitation.id, "accept")}
                >
                  Aceitar
                </button>
                <button
                  className="icon-action ghost"
                  onClick={() => onRespond(invitation.id, "decline")}
                >
                  Recusar
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </ListPanel>

      <ListPanel icon={<BriefcaseBusiness size={18} />} title="Trabalhos">
        {contracts.map((contract) => (
          <div className="list-row" key={contract.id}>
            <div>
              <strong>{contract.event?.name ?? "Evento"}</strong>
              <span>
                {formatCurrency(contract.amountCents)} - {contract.status}
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
              <strong>{transaction.type}</strong>
              <span>{transaction.description ?? "Transação"}</span>
            </div>
            <small>{formatCurrency(transaction.amountCents)}</small>
          </div>
        ))}
      </ListPanel>

      <ReportPanel reportSummary={reportSummary} />
    </section>
  );
}

function AdminDashboard({
  data,
  onReleasePayment,
  reportSummary,
}: Readonly<{
  data: AdminData;
  onReleasePayment: (paymentId: string) => void;
  reportSummary: ReportSummary | null;
}>) {
  return (
    <section className="dashboard-grid">
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
        title="Disputas"
        value={data.disputes.length}
      />
      <ListPanel icon={<CreditCard size={18} />} title="Pagamentos">
        {data.payments.map((payment) => (
          <div className="list-row" key={payment.id}>
            <div>
              <strong>{payment.contract?.event?.name ?? "Pagamento"}</strong>
              <span>
                {formatCurrency(payment.grossAmountCents)} - {payment.status}
              </span>
            </div>
            {payment.status === "PAID" ? (
              <button
                className="icon-action"
                onClick={() => onReleasePayment(payment.id)}
              >
                Liberar
              </button>
            ) : null}
          </div>
        ))}
      </ListPanel>
      <ReportPanel reportSummary={reportSummary} />
    </section>
  );
}

function ReportPanel({
  reportSummary,
}: Readonly<{ reportSummary: ReportSummary | null }>) {
  const totals = reportSummary?.totals ?? {};
  const moneyKeys = new Set([
    "grossAmountCents",
    "freelancerAmountCents",
    "platformFeeCents",
    "balanceCents",
  ]);
  const labels: Record<string, string> = {
    users: "Usuários",
    companies: "Empresas",
    freelancers: "Freelancers",
    events: "Eventos",
    contracts: "Contratos",
    payments: "Pagamentos",
    grossAmountCents: "Volume pago",
    freelancerAmountCents: "Repasse",
    platformFeeCents: "Taxa plataforma",
    balanceCents: "Saldo",
  };

  return (
    <article className="panel report-panel">
      <div className="panel-header">
        <h2>Relatórios</h2>
        <BriefcaseBusiness size={18} />
      </div>
      <div className="report-grid">
        {Object.entries(totals).map(([key, value]) => (
          <div className="report-tile" key={key}>
            <span>{labels[key] ?? key}</span>
            <strong>
              {moneyKeys.has(key) ? formatCurrency(value) : value}
            </strong>
          </div>
        ))}
      </div>
      {reportSummary?.contractStatus.length ? (
        <div className="status-strip">
          {reportSummary.contractStatus.map((item) => (
            <span key={item.status}>
              {item.status}: {item.count}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
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
