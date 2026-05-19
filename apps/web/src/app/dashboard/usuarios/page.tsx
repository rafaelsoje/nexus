"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserCog, UsersRound } from "lucide-react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { ListPanel } from "../../../components/dashboard-widgets";
import { EmptyState, StatusMessage } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import type { AdminUser } from "../../../lib/dashboard-types";

const roleLabels: Record<AdminUser["role"], string> = {
  ADMIN: "Admin",
  COMPANY: "Empresa",
  FREELANCER: "Freelancer",
};

export default function UsersPage() {
  const session = useRequiredSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const activeUsers = useMemo(
    () => users.filter((user) => user.isActive).length,
    [users],
  );
  const companies = useMemo(
    () => users.filter((user) => user.role === "COMPANY").length,
    [users],
  );
  const freelancers = useMemo(
    () => users.filter((user) => user.role === "FREELANCER").length,
    [users],
  );
  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" ? user.isActive : !user.isActive);
      const matchesSearch =
        !normalizedSearch ||
        [user.name, user.email, user.phone ?? ""].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        );

      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [roleFilter, searchTerm, statusFilter, users]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadUsers();
  }, [session]);

  async function loadUsers() {
    setError("");
    setLoading(true);

    if (session?.user.role !== "ADMIN") {
      setLoading(false);
      return;
    }

    try {
      setUsers(await apiRequest<AdminUser[]>("/api/admin/users"));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao carregar usuários.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateUserStatus(userId: string, isActive: boolean) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
      setSuccess(isActive ? "Usuário ativado." : "Usuário desativado.");
      await loadUsers();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao atualizar usuário.",
      );
    }
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={loadUsers} />}
      eyebrow={session.user.role}
      title="Usuários"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando usuários...</EmptyState> : null}

      {session.user.role !== "ADMIN" ? (
        <EmptyState>
          Esta área é reservada para a operação administrativa da NEXO.
        </EmptyState>
      ) : (
        <>
          <section className="metrics">
            <article className="metric">
              <span>Total</span>
              <strong>{users.length}</strong>
            </article>
            <article className="metric">
              <span>Ativos</span>
              <strong>{activeUsers}</strong>
            </article>
            <article className="metric">
              <span>Empresas</span>
              <strong>{companies}</strong>
            </article>
            <article className="metric">
              <span>Freelancers</span>
              <strong>{freelancers}</strong>
            </article>
          </section>

          <section className="dashboard-grid">
            <article className="panel report-panel">
              <div className="panel-header">
                <h2>Filtros</h2>
                <Search size={18} />
              </div>
              <div className="form-grid filters-grid">
                <label className="field">
                  <span>Buscar</span>
                  <input
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Nome, e-mail ou telefone"
                    value={searchTerm}
                  />
                </label>
                <label className="field">
                  <span>Papel</span>
                  <select
                    onChange={(event) => setRoleFilter(event.target.value)}
                    value={roleFilter}
                  >
                    <option value="ALL">Todos</option>
                    <option value="ADMIN">Admin</option>
                    <option value="COMPANY">Empresa</option>
                    <option value="FREELANCER">Freelancer</option>
                  </select>
                </label>
                <label className="field">
                  <span>Status</span>
                  <select
                    onChange={(event) => setStatusFilter(event.target.value)}
                    value={statusFilter}
                  >
                    <option value="ALL">Todos</option>
                    <option value="ACTIVE">Ativos</option>
                    <option value="INACTIVE">Inativos</option>
                  </select>
                </label>
                <div className="filter-summary">
                  <span>Resultado</span>
                  <strong>{filteredUsers.length}</strong>
                </div>
              </div>
            </article>

            <ListPanel icon={<UsersRound size={18} />} title="Acessos">
              {filteredUsers.map((user) => (
                <div
                  className={`list-row ${user.isActive ? "" : "inactive-row"}`}
                  key={user.id}
                >
                  <div>
                    <strong>{user.name}</strong>
                    <span>
                      {user.email} - {roleLabels[user.role]} -{" "}
                      {user.isActive ? "Ativo" : "Inativo"}
                    </span>
                    <span>
                      Cadastro em{" "}
                      {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                      {user.phone ? ` - ${user.phone}` : ""}
                    </span>
                  </div>
                  <div className="row-actions">
                    <button
                      className={
                        user.isActive ? "icon-action ghost" : "icon-action"
                      }
                      disabled={user.id === session.user.id && user.isActive}
                      onClick={() => updateUserStatus(user.id, !user.isActive)}
                      type="button"
                    >
                      {user.isActive ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </div>
              ))}
            </ListPanel>

            <article className="panel">
              <div className="panel-header">
                <h2>Controle de acesso</h2>
                <UserCog size={18} />
              </div>
              <p>
                Ao desativar um usuário, o refresh token é invalidado e novos
                logins passam a ser recusados.
              </p>
            </article>
          </section>
        </>
      )}
    </DashboardShell>
  );
}
