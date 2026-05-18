"use client";

import {
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  LogOut,
  Search,
  ShieldCheck,
  Star,
  UsersRound,
  Wallet,
} from "lucide-react";
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
type AdminData = {
  users: unknown[];
  companies: unknown[];
  freelancers: unknown[];
  events: unknown[];
  payments: unknown[];
  disputes: unknown[];
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
  const [adminData, setAdminData] = useState<AdminData | null>(null);
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
      const loadedSkills = await apiRequest<Skill[]>("/api/skills");
      setSkills(loadedSkills);

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
        const [received, loadedContracts, walletData] = await Promise.all([
          apiRequest<Invitation[]>("/api/invitations/received"),
          apiRequest<Contract[]>("/api/contracts"),
          apiRequest<WalletData>("/api/wallet"),
        ]);
        setInvitations(received);
        setContracts(loadedContracts);
        setWallet(walletData);
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
          apiRequest<unknown[]>("/api/admin/payments"),
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
    setError("");

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
    if (!events[0]) {
      setError("Crie um evento antes de enviar convites.");
      return;
    }

    try {
      await apiRequest("/api/invitations", {
        method: "POST",
        body: JSON.stringify({
          eventId: events[0].id,
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
          <a className="active">
            <CalendarDays size={18} />
            Dashboard
          </a>
          <a>
            <BriefcaseBusiness size={18} />
            Eventos
          </a>
          <a>
            <UsersRound size={18} />
            Profissionais
          </a>
          <a>
            <CreditCard size={18} />
            Pagamentos
          </a>
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
            skills={skills}
            onCreateEvent={handleCreateEvent}
            onInvite={inviteFreelancer}
            onPay={payContract}
            onSearch={handleSearchFreelancers}
          />
        ) : null}
        {!loading && role === "FREELANCER" ? (
          <FreelancerDashboard
            contracts={contracts}
            invitations={invitations}
            skills={skills}
            wallet={wallet}
            onRespond={respondInvitation}
          />
        ) : null}
        {!loading && role === "ADMIN" && adminData ? (
          <AdminDashboard data={adminData} />
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
                onClick={() => onInvite(freelancer.id)}
              >
                Convidar
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
    </section>
  );
}

function FreelancerDashboard({
  contracts,
  invitations,
  wallet,
  onRespond,
}: Readonly<{
  contracts: Contract[];
  invitations: Invitation[];
  skills: Skill[];
  wallet: WalletData | null;
  onRespond: (invitationId: string, action: "accept" | "decline") => void;
}>) {
  return (
    <section className="dashboard-grid">
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
    </section>
  );
}

function AdminDashboard({ data }: Readonly<{ data: AdminData }>) {
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
    </section>
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
