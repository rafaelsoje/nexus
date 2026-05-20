"use client";

import { BriefcaseBusiness, Send, UsersRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
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
} from "../../../lib/dashboard-types";

const statusLabels: Record<string, string> = {
  PENDING: "Pendente",
  ACCEPTED: "Aprovada",
  DECLINED: "Recusada",
  CANCELLED: "Cancelada",
};

export default function OpportunitiesPage() {
  const session = useRequiredSession();
  const [opportunities, setOpportunities] = useState<EventItem[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadOpportunities();
  }, [session]);

  async function loadOpportunities() {
    setError("");
    setLoading(true);

    try {
      if (session?.user.role === "FREELANCER") {
        const [loadedOpportunities, loadedApplications] = await Promise.all([
          apiRequest<EventItem[]>("/api/applications/opportunities"),
          apiRequest<Application[]>("/api/applications/mine"),
        ]);
        setOpportunities(loadedOpportunities);
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
  }

  async function applyToEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const proposedAmount = Number(form.get("proposedAmount") || 0);
    setError("");
    setSuccess("");

    try {
      await apiRequest("/api/applications", {
        method: "POST",
        body: JSON.stringify({
          eventId: String(form.get("eventId")),
          message: String(form.get("message") || ""),
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
                  <form
                    className="list-row feature-row"
                    key={event.id}
                    onSubmit={applyToEvent}
                  >
                    <input name="eventId" type="hidden" value={event.id} />
                    <div>
                      <strong>{event.name}</strong>
                      <span>
                        {event.company?.companyName ?? "Empresa"} -{" "}
                        {formatDateTime(event.startsAt)} -{" "}
                        {event.city ?? "Cidade não informada"}
                      </span>
                      <small>
                        {event.openSpots ?? event.desiredProfessionals ?? 1}{" "}
                        vaga(s) - {formatRequirements(event)}
                      </small>
                    </div>
                    <div className="form-grid">
                      <Field label="Proposta de diária">
                        <input
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
                    </div>
                    <button className="primary-button" type="submit">
                      <Send size={18} />
                      Candidatar
                    </button>
                  </form>
                ))}
              </div>
            ) : (
              <EmptyState>Nenhum evento compatível disponível agora.</EmptyState>
            )}
          </article>

          <ApplicationsPanel applications={applications} title="Minhas candidaturas" />
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
                      </strong>
                      <span>
                        {application.event?.name ?? "Evento"} -{" "}
                        {statusLabels[application.status] ?? application.status}
                      </span>
                      <small>
                        {application.proposedAmountCents
                          ? formatCurrency(application.proposedAmountCents)
                          : "Sem proposta de valor"}{" "}
                        - {application.message || "Sem mensagem"}
                      </small>
                    </div>
                    {application.status === "PENDING" ? (
                      <div className="row-actions">
                        <button
                          className="icon-action"
                          onClick={() =>
                            respondApplication(application.id, "accept")
                          }
                          type="button"
                        >
                          Aprovar
                        </button>
                        <button
                          className="icon-action ghost"
                          onClick={() =>
                            respondApplication(application.id, "decline")
                          }
                          type="button"
                        >
                          Recusar
                        </button>
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

function ApplicationsPanel({
  applications,
  title,
}: Readonly<{ applications: Application[]; title: string }>) {
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
            </div>
          ))}
        </div>
      ) : (
        <EmptyState>Nenhuma candidatura enviada ainda.</EmptyState>
      )}
    </article>
  );
}

function formatRequirements(event: EventItem) {
  const names =
    event.requirements?.map((item) => item.skill?.name).filter(Boolean) ?? [];

  return names.length ? names.join(", ") : "Sem especialidade definida";
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
