"use client";

import { Bell } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
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

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadInvitations();
  }, [session]);

  async function loadInvitations() {
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
  }

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

      <section className="dashboard-grid">
        <ListPanel
          icon={<Bell size={18} />}
          title={
            session.user.role === "FREELANCER"
              ? "Convites recebidos"
              : "Convites enviados"
          }
        >
          {invitations.map((invitation) => (
            <div className="list-row" key={invitation.id}>
              <div>
                <strong>
                  {invitation.event?.name ??
                    invitation.freelancer?.displayName ??
                    "Convite"}
                </strong>
                <span>
                  {invitation.company?.companyName ??
                    invitation.freelancer?.displayName ??
                    "Participante"}{" "}
                  - {invitation.status}
                </span>
                <small>{formatNegotiation(invitation)}</small>
              </div>
              {invitation.status === "PENDING" ? (
                <form className="inline-negotiation" onSubmit={proposeAmount}>
                  <input
                    name="invitationId"
                    type="hidden"
                    value={invitation.id}
                  />
                  <input
                    min={0}
                    name="amount"
                    placeholder="Valor"
                    step="0.01"
                    type="number"
                  />
                  <input
                    name="message"
                    placeholder="Mensagem da proposta"
                  />
                  <button className="icon-action" type="submit">
                    Propor
                  </button>
                </form>
              ) : null}
              {session.user.role === "FREELANCER" &&
              invitation.status === "PENDING" ? (
                <div className="row-actions">
                  {invitation.proposedAmountCents ? (
                    <button
                      className="icon-action"
                      onClick={() => acceptAmount(invitation.id)}
                      type="button"
                    >
                      Aceitar valor
                    </button>
                  ) : null}
                  <button
                    className="icon-action"
                    onClick={() => respondInvitation(invitation.id, "accept")}
                  >
                    Aceitar
                  </button>
                  <button
                    className="icon-action ghost"
                    onClick={() => respondInvitation(invitation.id, "decline")}
                  >
                    Recusar
                  </button>
                </div>
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
