"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Copy, Send, UsersRound } from "lucide-react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { apiRequest } from "../../../lib/api";
import type {
  CompanyMemberRole,
  CompanyTeam,
  CompanyTeamInvitation,
} from "../../../lib/dashboard-types";

const roles: Array<{ value: Exclude<CompanyMemberRole, "OWNER">; label: string }> =
  [
    { value: "ADMIN", label: "Administrador" },
    { value: "OPERATOR", label: "Operação" },
    { value: "FINANCE", label: "Financeiro" },
    { value: "VIEWER", label: "Leitura" },
  ];

const roleLabels: Record<CompanyMemberRole, string> = {
  OWNER: "Dono",
  ADMIN: "Administrador",
  FINANCE: "Financeiro",
  OPERATOR: "Operação",
  VIEWER: "Leitura",
};

const invitationStatusLabels: Record<CompanyTeamInvitation["status"], string> = {
  ACCEPTED: "Aceito",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
  PENDING: "Pendente",
};

export default function CompanyTeamPage() {
  const session = useRequiredSession();
  const [team, setTeam] = useState<CompanyTeam | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] =
    useState<Exclude<CompanyMemberRole, "OWNER">>("OPERATOR");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<CompanyTeamInvitation | null>(
    null,
  );

  const loadTeam = useCallback(async () => {
    if (!session || session.user.role !== "COMPANY") {
      return;
    }

    const data = await apiRequest<CompanyTeam>("/api/companies/team");
    setTeam(data);
  }, [session]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setLastInvite(null);

    try {
      const invitation = await apiRequest<CompanyTeamInvitation>(
        "/api/companies/team/invitations",
        {
          method: "POST",
          body: JSON.stringify({ email, role }),
        },
      );
      setLastInvite(invitation);
      setMessage("Convite criado.");
      setEmail("");
      await loadTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar convite.");
    } finally {
      setLoading(false);
    }
  }

  const inviteLink =
    typeof window !== "undefined" && lastInvite?.token
      ? `${window.location.origin}/convite/empresa?token=${lastInvite.token}`
      : "";

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={loadTeam} />}
      eyebrow="Empresa"
      title="Equipe"
    >
      {error ? <p className="status-message error">{error}</p> : null}
      {message ? <p className="status-message success">{message}</p> : null}

      <div className="grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Acesso</span>
              <h2>Convidar usuário</h2>
            </div>
            <Send size={20} />
          </div>

          <form className="form" onSubmit={inviteMember}>
            <label className="field">
              <span>E-mail</span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="usuario@empresa.com"
              />
            </label>
            <label className="field">
              <span>Papel</span>
              <select
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as Exclude<CompanyMemberRole, "OWNER">)
                }
              >
                {roles.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="primary-button full"
              disabled={loading}
              type="submit"
            >
              <Send size={16} />
              {loading ? "Criando convite..." : "Criar convite"}
            </button>
          </form>

          {inviteLink ? (
            <div className="dev-token">
              <span>Link de aceite</span>
              <strong>{inviteLink}</strong>
              <button
                className="secondary-button"
                type="button"
                onClick={() => navigator.clipboard.writeText(inviteLink)}
              >
                <Copy size={16} />
                Copiar link
              </button>
            </div>
          ) : null}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Membros</span>
              <h2>Usuários vinculados</h2>
            </div>
            <UsersRound size={20} />
          </div>

          <div className="list">
            {team?.members.map((member) => (
              <article className="list-row" key={member.id}>
                <div>
                  <strong>{member.user.name}</strong>
                  <span>{member.user.email}</span>
                </div>
                <small>{roleLabels[member.role]}</small>
              </article>
            ))}
            {team && !team.members.length ? (
              <p className="empty-state">Nenhum membro encontrado.</p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel-header">
          <div>
            <span className="eyebrow">Convites</span>
            <h2>Pendentes</h2>
          </div>
        </div>
        <div className="list">
          {team?.invitations.map((invitation) => (
            <article className="list-row" key={invitation.id}>
              <div>
                <strong>{invitation.email}</strong>
                <span>
                  {roleLabels[invitation.role]} · expira em{" "}
                  {new Date(invitation.expiresAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <small>{invitationStatusLabels[invitation.status]}</small>
            </article>
          ))}
          {team && !team.invitations.length ? (
            <p className="empty-state">Nenhum convite pendente.</p>
          ) : null}
        </div>
      </section>
    </DashboardShell>
  );
}
