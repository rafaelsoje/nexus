"use client";

import { BriefcaseBusiness, MessageCircle, Send, UsersRound } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { EmptyState, Field, StatusMessage } from "../../../components/ui";
import { apiRequest, formatCurrency } from "../../../lib/api";
import type {
  Application,
  EventItem,
  EventRequirement,
} from "../../../lib/dashboard-types";

const statusLabels: Record<string, string> = {
  PENDING: "Pendente",
  ACCEPTED: "Aprovada",
  DECLINED: "Recusada",
  CANCELLED: "Cancelada",
};

type FreelancerProfileForOpportunities = {
  skills?: Array<{
    skillId?: string;
    skill?: { id: string };
  }>;
};

export default function OpportunitiesPage() {
  const session = useRequiredSession();
  const [opportunities, setOpportunities] = useState<EventItem[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const loadOpportunities = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      if (session?.user.role === "FREELANCER") {
        const [loadedOpportunities, loadedApplications, profile] =
          await Promise.all([
            apiRequest<EventItem[]>("/api/applications/opportunities"),
            apiRequest<Application[]>("/api/applications/mine"),
            apiRequest<FreelancerProfileForOpportunities>(
              "/api/freelancers/profile",
            ),
          ]);
        setOpportunities(
          filterOpportunitiesByFreelancerSkills(loadedOpportunities, profile),
        );
        setApplications(loadedApplications);
        return;
      }

      if (session?.user.role === "COMPANY") {
        const loadedApplications = await apiRequest<Application[]>(
          "/api/applications/received",
        );
        setApplications(loadedApplications);
        return;
      }

      setOpportunities([]);
      setApplications([]);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao carregar oportunidades.",
      );
    } finally {
      setLoading(false);
    }
  }, [session?.user.role]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadOpportunities();
  }, [loadOpportunities, session]);

  async function applyToEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const acceptsCompanyOffer = submitter?.value === "company-offer";
    const companyAmount = Number(form.get("companyAmount") || 0);
    const customAmount = Number(form.get("proposedAmount") || 0);
    const proposedAmount = acceptsCompanyOffer ? companyAmount : customAmount;
    setError("");
    setSuccess("");

    try {
      await apiRequest("/api/applications", {
        method: "POST",
        body: JSON.stringify({
          eventId: String(form.get("eventId")),
          eventRequirementId:
            String(form.get("eventRequirementId") || "") || undefined,
          message: acceptsCompanyOffer
            ? "Aceito o valor indicado pela empresa."
            : String(form.get("message") || ""),
          proposedAmountCents: proposedAmount
            ? Math.round(proposedAmount * 100)
            : undefined,
        }),
      });
      formElement.reset();
      setSuccess("Candidatura enviada.");
      await loadOpportunities();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao enviar candidatura.",
      );
    }
  }

  async function respondApplication(
    applicationId: string,
    action: "accept" | "decline",
  ) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/applications/${applicationId}/${action}`, {
        method: "POST",
      });
      setSuccess(
        action === "accept"
          ? "Candidatura aprovada. Contrato criado."
          : "Candidatura recusada.",
      );
      await loadOpportunities();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao responder candidatura.",
      );
    }
  }

  async function updateApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const proposedAmount = Number(form.get("proposedAmount") || 0);
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/applications/${String(form.get("applicationId"))}`, {
        method: "PATCH",
        body: JSON.stringify({
          message: String(form.get("message") || ""),
          proposedAmountCents: proposedAmount
            ? Math.round(proposedAmount * 100)
            : undefined,
        }),
      });
      setSuccess("Candidatura atualizada.");
      await loadOpportunities();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao atualizar candidatura.",
      );
    }
  }

  async function cancelApplication(applicationId: string) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/applications/${applicationId}/cancel`, {
        method: "POST",
      });
      setSuccess("Candidatura cancelada.");
      await loadOpportunities();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao cancelar candidatura.",
      );
    }
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={loadOpportunities} />}
      eyebrow={session.user.role}
      title="Oportunidades"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando oportunidades...</EmptyState> : null}

      {!loading && session.user.role === "ADMIN" ? (
        <EmptyState>
          O fluxo de oportunidades é usado por empresas e freelancers.
        </EmptyState>
      ) : null}

      {!loading && session.user.role === "FREELANCER" ? (
        <section className="dashboard-grid">
          <article className="panel report-panel">
            <div className="panel-header">
              <h2>Eventos abertos</h2>
              <BriefcaseBusiness size={18} />
            </div>
            {opportunities.length ? (
              <div className="list">
                {opportunities.map((event) => (
                  <OpportunityApplicationForm
                    event={event}
                    key={event.id}
                    onSubmit={applyToEvent}
                  />
                ))}
              </div>
            ) : (
              <EmptyState>
                Nenhum evento compatível disponível agora.
              </EmptyState>
            )}
          </article>

          <ApplicationsPanel
            applications={applications}
            onCancel={cancelApplication}
            onUpdate={updateApplication}
            title="Minhas candidaturas"
          />
        </section>
      ) : null}

      {!loading && session.user.role === "COMPANY" ? (
        <section className="dashboard-grid">
          <article className="panel report-panel">
            <div className="panel-header">
              <h2>Candidaturas recebidas</h2>
              <UsersRound size={18} />
            </div>
            {applications.length ? (
              <div className="list">
                {applications.map((application) => (
                  <div className="list-row" key={application.id}>
                    <div>
                      <strong>
                        {application.freelancer?.displayName ??
                          application.freelancer?.user?.name ??
                          "Profissional"}
                        {application.eventRequirement?.skill?.name
                          ? ` - ${application.eventRequirement.skill.name}`
                          : ""}
                      </strong>
                      <span>
                        {application.event?.name ?? "Evento"} -{" "}
                        {statusLabels[application.status] ?? application.status}
                      </span>
                      <small>
                        Proposta do freelancer:{" "}
                        {application.proposedAmountCents
                          ? formatCurrency(application.proposedAmountCents)
                          : "sem proposta de valor"}
                      </small>
                      <small>
                        Valor indicado pela empresa:{" "}
                        {formatApplicationCompanyBudget(application)}
                      </small>
                      <small>
                        Mensagem do freelancer:{" "}
                        {application.message || "sem mensagem"}
                      </small>
                    </div>
                    {canCompanyActOnApplication(application) ? (
                      <div className="row-actions">
                        <button
                          className="icon-action"
                          onClick={() =>
                            respondApplication(application.id, "accept")
                          }
                          type="button"
                        >
                          {application.status === "DECLINED"
                            ? "Aceitar nova proposta"
                            : "Aprovar"}
                        </button>
                        <button
                          className="icon-action ghost"
                          onClick={() =>
                            respondApplication(application.id, "decline")
                          }
                          type="button"
                        >
                          {application.status === "DECLINED"
                            ? "Manter recusa"
                            : "Recusar"}
                        </button>
                        <Link
                          className="icon-action ghost"
                          href={`/dashboard/chat?applicationId=${application.id}`}
                        >
                          <MessageCircle size={14} />
                          Negociar
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>Nenhuma candidatura recebida ainda.</EmptyState>
            )}
          </article>
        </section>
      ) : null}
    </DashboardShell>
  );
}

function canCompanyActOnApplication(application: Application) {
  if (application.status === "PENDING") {
    return true;
  }

  return (
    application.status === "DECLINED" &&
    Boolean(application.proposedAmountCents) &&
    !application.contract
  );
}

function filterOpportunitiesByFreelancerSkills(
  opportunities: EventItem[],
  profile: FreelancerProfileForOpportunities,
) {
  const skillIds = new Set(
    profile.skills
      ?.map((item) => item.skillId ?? item.skill?.id)
      .filter((skillId): skillId is string => Boolean(skillId)) ?? [],
  );

  if (!skillIds.size) {
    return [];
  }

  return opportunities
    .map((event) => ({
      ...event,
      requirements:
        event.requirements?.filter((item) => skillIds.has(item.skillId)) ?? [],
    }))
    .filter((event) => event.requirements.length > 0);
}

function OpportunityApplicationForm({
  event,
  onSubmit,
}: Readonly<{
  event: EventItem;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  const requirements = event.requirements ?? [];
  const [selectedRequirementId, setSelectedRequirementId] = useState(
    requirements[0]?.id ?? "",
  );
  const selectedRequirement =
    requirements.find((item) => item.id === selectedRequirementId) ??
    requirements[0];

  return (
    <form className="list-row feature-row opportunity-card" onSubmit={onSubmit}>
      <input name="eventId" type="hidden" value={event.id} />
      <input
        name="companyAmount"
        type="hidden"
        value={formatAmountInput(selectedRequirement?.dailyRateCents)}
      />
      <div className="opportunity-summary">
        <strong>{event.company?.companyName ?? "Empresa"}</strong>
        <span>
          {event.name} - {formatDateTime(event.startsAt)} -{" "}
          {event.city ?? "Cidade não informada"}
        </span>
      </div>

      <div className="opportunity-requirements">
        <span>Vagas</span>
        {requirements.map((requirement) => (
          <small key={requirement.id ?? requirement.skillId}>
            {formatRequirementLine(requirement)}
          </small>
        ))}
      </div>

      <div className="opportunity-quick-apply">
        <Field label="Vaga">
          <select
            name="eventRequirementId"
            onChange={(event) => setSelectedRequirementId(event.target.value)}
            required
            value={selectedRequirement?.id ?? ""}
          >
            {requirements.map((requirement) => (
              <option key={requirement.id} value={requirement.id}>
                {formatRequirementOption(requirement)}
              </option>
            ))}
          </select>
        </Field>
        <div>
          <span>Valor da empresa</span>
          <strong>
            {selectedRequirement?.dailyRateCents
              ? formatCurrency(selectedRequirement.dailyRateCents)
              : "valor não informado"}
          </strong>
        </div>
        <button
          className="primary-button"
          name="applicationMode"
          type="submit"
          value="company-offer"
        >
          <Send size={18} />
          Aceitar proposta
        </button>
      </div>

      <div className="opportunity-separator">
        <span>ou enviar outro valor</span>
      </div>

      <div className="form-grid opportunity-counter-offer">
        <Field label="Sua proposta de diária">
          <input
            key={selectedRequirement?.id ?? event.id}
            defaultValue={formatAmountInput(
              selectedRequirement?.dailyRateCents,
            )}
            min={0}
            name="proposedAmount"
            placeholder="Ex.: 350"
            step="0.01"
            type="number"
          />
        </Field>
        <Field label="Mensagem">
          <input
            name="message"
            placeholder="Conte por que você é uma boa escolha"
          />
        </Field>
        <button
          className="secondary-button"
          name="applicationMode"
          type="submit"
          value="custom-offer"
        >
          Enviar com meu valor
        </button>
      </div>
    </form>
  );
}

function ApplicationsPanel({
  applications,
  onCancel,
  onUpdate,
  title,
}: Readonly<{
  applications: Application[];
  onCancel: (applicationId: string) => void;
  onUpdate: (event: FormEvent<HTMLFormElement>) => void;
  title: string;
}>) {
  return (
    <article className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
        <UsersRound size={18} />
      </div>
      {applications.length ? (
        <div className="list">
          {applications.map((application) => (
            <div className="list-row" key={application.id}>
              <div>
                <strong>{application.event?.name ?? "Evento"}</strong>
                <span>
                  {application.company?.companyName ?? "Empresa"} -{" "}
                  {statusLabels[application.status] ?? application.status}
                </span>
                <small>
                  {application.proposedAmountCents
                    ? formatCurrency(application.proposedAmountCents)
                    : "Sem proposta de valor"}
                </small>
              </div>
              {application.status === "PENDING" ? (
                <form className="inline-negotiation" onSubmit={onUpdate}>
                  <input
                    name="applicationId"
                    type="hidden"
                    value={application.id}
                  />
                  <input
                    defaultValue={formatAmountInput(
                      application.proposedAmountCents,
                    )}
                    min={0}
                    name="proposedAmount"
                    placeholder="Valor"
                    step="0.01"
                    type="number"
                  />
                  <input
                    defaultValue={application.message ?? ""}
                    name="message"
                    placeholder="Mensagem"
                  />
                  <button className="icon-action" type="submit">
                    Atualizar
                  </button>
                  <button
                    className="icon-action ghost"
                    onClick={() => onCancel(application.id)}
                    type="button"
                  >
                    Cancelar
                  </button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState>Nenhuma candidatura enviada ainda.</EmptyState>
      )}
    </article>
  );
}

function formatRequirementOption(requirement: EventRequirement) {
  const skillName = requirement.skill?.name ?? "Vaga";
  const amount = requirement.dailyRateCents
    ? ` - ${formatCurrency(requirement.dailyRateCents)}`
    : "";

  return `${skillName}${amount}`;
}

function formatRequirementLine(requirement: EventRequirement) {
  const skillName = requirement.skill?.name ?? "Vaga";
  const quantity = `${requirement.quantity} vaga(s)`;
  const amount = requirement.dailyRateCents
    ? ` - ${formatCurrency(requirement.dailyRateCents)} por diária`
    : " - valor não informado";

  return `${skillName}: ${quantity}${amount}`;
}

function formatApplicationCompanyBudget(application: Application) {
  if (application.eventRequirement) {
    const amount = application.eventRequirement.dailyRateCents
      ? `${formatCurrency(application.eventRequirement.dailyRateCents)} por diária`
      : "valor não informado";
    const skillName = application.eventRequirement.skill?.name;

    return skillName ? `${amount} para ${skillName}` : amount;
  }

  const requirements = application.event?.requirements ?? [];
  const freelancerSkillIds = new Set(
    application.freelancer?.skills
      ?.map((item) => item.skill.id)
      .filter(Boolean) ?? [],
  );
  const matchingRequirements = freelancerSkillIds.size
    ? requirements.filter((item) => freelancerSkillIds.has(item.skillId))
    : [];
  const relevantRequirements = matchingRequirements.length
    ? matchingRequirements
    : requirements;
  const requirementsWithAmount = relevantRequirements.filter(
    (item) => typeof item.dailyRateCents === "number",
  );

  if (!requirementsWithAmount.length) {
    return "valor não informado";
  }

  const amounts = requirementsWithAmount.map((item) => item.dailyRateCents ?? 0);
  const lowest = Math.min(...amounts);
  const highest = Math.max(...amounts);
  const skillNames = requirementsWithAmount
    .map((item) => item.skill?.name)
    .filter(Boolean);
  const amountLabel =
    lowest === highest
      ? `${formatCurrency(lowest)} por diária`
      : `${formatCurrency(lowest)} a ${formatCurrency(highest)} por diária`;

  if (requirementsWithAmount.length === 1 && skillNames[0]) {
    return `${amountLabel} para ${skillNames[0]}`;
  }

  if (skillNames.length) {
    return `${amountLabel} (${skillNames.join(", ")})`;
  }

  return amountLabel;
}

function formatAmountInput(amountCents?: number) {
  if (!amountCents) {
    return "";
  }

  return String(amountCents / 100);
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
