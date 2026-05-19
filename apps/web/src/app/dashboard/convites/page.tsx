"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { ListPanel } from "../../../components/dashboard-widgets";
import { EmptyState, StatusMessage } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
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
              </div>
              {session.user.role === "FREELANCER" &&
              invitation.status === "PENDING" ? (
                <div className="row-actions">
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
            </div>
          ))}
        </ListPanel>
      </section>
    </DashboardShell>
  );
}
