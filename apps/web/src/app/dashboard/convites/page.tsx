"use client";

import { Bell, Send } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { ListPanel } from "../../../components/dashboard-widgets";
import { EmptyState, StatusMessage } from "../../../components/ui";
import { apiRequest, formatCurrency } from "../../../lib/api";
import type { Invitation } from "../../../lib/dashboard-types";

export default function InvitationsPage() {
  const session = useRequiredSession();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const loadInvitations = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      const path =
        session?.user.role === "FREELANCER"
          ? "/api/invitations/received"
          : "/api/invitations/sent";
      const data =
        session?.user.role === "ADMIN"
          ? []
          : await apiRequest<Invitation[]>(path);
      setInvitations(data);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao carregar convites.",
      );
    } finally {
      setLoading(false);
    }
  }, [session?.user.role]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadInvitations();
  }, [loadInvitations, session]);

  async function respondInvitation(
    invitationId: string,
    action: "accept" | "decline",
  ) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/invitations/${invitationId}/${action}`, {
        method: "POST",
      });
      setSuccess(action === "accept" ? "Convite aceito." : "Convite recusado.");
      await loadInvitations();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao responder convite.",
      );
    }
  }

  async function proposeAmount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const amount = Number(form.get("amount") || 0);
    setError("");
    setSuccess("");

    if (!amount) {
      setError("Informe um valor para negociar.");
      return;
    }

    try {
      await apiRequest(
        `/api/invitations/${String(form.get("invitationId"))}/propose-amount`,
        {
          method: "POST",
          body: JSON.stringify({
            amountCents: Math.round(amount * 100),
            message: String(form.get("message") || ""),
          }),
        },
      );
      formElement.reset();
      setSuccess("Proposta enviada.");
      await loadInvitations();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao enviar proposta.",
      );
    }
  }

  async function acceptAmount(invitationId: string) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/invitations/${invitationId}/accept-amount`, {
        method: "POST",
      });
      setSuccess("Valor aceito.");
      await loadInvitations();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao aceitar valor.",
      );
    }
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={loadInvitations} />}
      eyebrow={session.user.role}
      title="Convites"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando convites...</EmptyState> : null}

      <section className="dashboard-grid invitations-grid">
        <ListPanel
          icon={<Bell size={18} />}
          title={
            session.user.role === "FREELANCER"
              ? "Convites recebidos"
              : "Convites enviados"
          }
        >
          {invitations.map((invitation) => (
            <div className="list-row invitation-card" key={invitation.id}>
              <div className="invitation-summary">
                <strong>
                  {invitation.event?.name ??
                    invitation.freelancer?.displayName ??
                    "Convite"}
                </strong>
                <span>
                  <strong className="participant-highlight">
                    {invitation.company?.companyName ??
                      invitation.freelancer?.displayName ??
                      "Participante"}
                  </strong>{" "}
                  - {formatInvitationStatus(invitation.status)}
                </span>
                <small>
                  Qualificação desejada:{" "}
                  {formatInvitationDesiredRole(invitation)}
                </small>
                <small>{formatNegotiation(invitation)}</small>
              </div>
              {session.user.role === "FREELANCER" &&
              invitation.status === "PENDING" ? (
                <>
                  <div className="invitation-quick-accept">
                    <div>
                      <span>Valor da empresa</span>
                      <strong>{formatInvitationBaseAmount(invitation)}</strong>
                    </div>
                    <button
                      className="primary-button"
                      onClick={() => respondInvitation(invitation.id, "accept")}
                      type="button"
                    >
                      <Send size={18} />
                      Aceitar convite
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => respondInvitation(invitation.id, "decline")}
                      type="button"
                    >
                      Recusar
                    </button>
                  </div>

                  <div className="opportunity-separator">
                    <span>ou enviar contraproposta</span>
                  </div>

                  <form
                    className="inline-negotiation invitation-counter-offer"
                    onSubmit={proposeAmount}
                  >
                    <input
                      name="invitationId"
                      type="hidden"
                      value={invitation.id}
                    />
                    <label className="field">
                      <span>Novo valor</span>
                      <input
                        defaultValue={formatAmountInput(
                          invitation.counterAmountCents ??
                            invitation.proposedAmountCents,
                        )}
                        min={0}
                        name="amount"
                        placeholder="Valor"
                        step="0.01"
                        type="number"
                      />
                    </label>
                    <label className="field">
                      <span>Mensagem</span>
                      <input
                        name="message"
                        placeholder="Explique sua contraproposta"
                      />
                    </label>
                    <button className="secondary-button" type="submit">
                      Enviar contraproposta
                    </button>
                  </form>
                </>
              ) : null}
              {session.user.role === "COMPANY" &&
              invitation.status === "PENDING" ? (
                <form className="inline-negotiation" onSubmit={proposeAmount}>
                  <input
                    name="invitationId"
                    type="hidden"
                    value={invitation.id}
                  />
                  <input
                    defaultValue={formatAmountInput(
                      invitation.counterAmountCents ??
                        invitation.proposedAmountCents,
                    )}
                    min={0}
                    name="amount"
                    placeholder="Valor"
                    step="0.01"
                    type="number"
                  />
                  <input name="message" placeholder="Mensagem da proposta" />
                  <button className="icon-action" type="submit">
                    Propor
                  </button>
                </form>
              ) : null}
              {session.user.role === "COMPANY" &&
              invitation.status === "PENDING" &&
              invitation.counterAmountCents ? (
                <button
                  className="icon-action"
                  onClick={() => acceptAmount(invitation.id)}
                  type="button"
                >
                  Aceitar contraproposta
                </button>
              ) : null}
            </div>
          ))}
        </ListPanel>
      </section>
    </DashboardShell>
  );
}

function formatInvitationStatus(status: string) {
  const labels: Record<string, string> = {
    ACCEPTED: "Aceito",
    CANCELLED: "Cancelado",
    DECLINED: "Recusado",
    EXPIRED: "Expirado",
    PENDING: "Pendente",
  };

  return labels[status] ?? status;
}

function formatInvitationBaseAmount(invitation: Invitation) {
  return invitation.proposedAmountCents
    ? formatCurrency(invitation.proposedAmountCents)
    : "valor não informado";
}

function formatInvitationDesiredRole(invitation: Invitation) {
  if (invitation.eventRequirement) {
    const skillName = invitation.eventRequirement.skill?.name ?? "Função";
    const amount = invitation.eventRequirement.dailyRateCents
      ? ` - ${formatCurrency(invitation.eventRequirement.dailyRateCents)}`
      : "";

    return `${skillName}${amount}`;
  }

  const requirements = invitation.event?.requirements ?? [];

  if (!requirements.length) {
    return "não informada";
  }

  const offeredAmount = invitation.proposedAmountCents;
  const amountMatches = offeredAmount
    ? requirements.filter((item) => item.dailyRateCents === offeredAmount)
    : [];
  const relevantRequirements = amountMatches.length
    ? amountMatches
    : requirements;
  const labels = relevantRequirements
    .map((item) => {
      const skillName = item.skill?.name ?? "Vaga";
      const amount = item.dailyRateCents
        ? ` - ${formatCurrency(item.dailyRateCents)}`
        : "";

      return `${skillName}${amount}`;
    })
    .filter(Boolean);

  return labels.join(", ");
}

function formatNegotiation(invitation: Invitation) {
  const items = [
    invitation.proposedAmountCents
      ? `Oferta ${formatCurrency(invitation.proposedAmountCents)}`
      : "",
    invitation.counterAmountCents
      ? `Contraproposta ${formatCurrency(invitation.counterAmountCents)}`
      : "",
    invitation.agreedAmountCents
      ? `Acordado ${formatCurrency(invitation.agreedAmountCents)}`
      : "",
  ].filter(Boolean);

  return items.length ? items.join(" - ") : "Sem valor negociado.";
}

function formatAmountInput(amountCents?: number) {
  if (!amountCents) {
    return "";
  }

  return String(amountCents / 100);
}
