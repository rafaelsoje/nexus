"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, UserCog, UsersRound } from "lucide-react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { ListPanel } from "../../../components/dashboard-widgets";
import {
  EmptyState,
  PaginationControls,
  StatusMessage,
} from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import type { AdminUser } from "../../../lib/dashboard-types";

const roleLabels: Record<AdminUser["role"], string> = {
  ADMIN: "Administrador",
  COMPANY: "Empresa",
  FREELANCER: "Freelancer",
};

const statusLabels = {
  ACTIVE: "Ativo",
  ARCHIVED: "Arquivada",
  INACTIVE: "Inativo",
} as const;

const usersPageSize = 10;

export default function UsersPage() {
  const session = useRequiredSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const platformUsers = useMemo(
    () => users.filter((user) => user.role !== "ADMIN"),
    [users],
  );
  const visiblePlatformUsers = useMemo(
    () => platformUsers.filter((user) => !user.isArchived),
    [platformUsers],
  );
  const activeUsers = useMemo(
    () => visiblePlatformUsers.filter((user) => user.isActive).length,
    [visiblePlatformUsers],
  );
  const companies = useMemo(
    () => visiblePlatformUsers.filter((user) => user.role === "COMPANY").length,
    [visiblePlatformUsers],
  );
  const freelancers = useMemo(
    () =>
      visiblePlatformUsers.filter((user) => user.role === "FREELANCER").length,
    [visiblePlatformUsers],
  );
  const archivedUsers = useMemo(
    () => platformUsers.filter((user) => user.isArchived).length,
    [platformUsers],
  );
  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return platformUsers.filter((user) => {
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "ALL"
          ? !user.isArchived
          : statusFilter === "ARCHIVED"
            ? user.isArchived
            : statusFilter === "ACTIVE"
              ? user.isActive && !user.isArchived
              : !user.isActive && !user.isArchived;
      const matchesSearch =
        !normalizedSearch ||
        [user.name, user.email, user.phone ?? ""].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        );

      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [platformUsers, roleFilter, searchTerm, statusFilter]);
  const paginatedUsers = useMemo(
    () =>
      filteredUsers.slice(
        (currentPage - 1) * usersPageSize,
        currentPage * usersPageSize,
      ),
    [currentPage, filteredUsers],
  );

  const loadUsers = useCallback(async () => {
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
  }, [session?.user.role]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadUsers();
  }, [loadUsers, session]);

  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, searchTerm, statusFilter]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / usersPageSize));

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredUsers.length]);

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
              <strong>{visiblePlatformUsers.length}</strong>
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
            <article className="metric">
              <span>Arquivadas</span>
              <strong>{archivedUsers}</strong>
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
                  <span>Tipo</span>
                  <select
                    onChange={(event) => setRoleFilter(event.target.value)}
                    value={roleFilter}
                  >
                    <option value="ALL">Todos</option>
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
                    <option value="ARCHIVED">Arquivadas</option>
                  </select>
                </label>
                <div className="filter-summary">
                  <span>Resultado</span>
                  <strong>{filteredUsers.length}</strong>
                </div>
              </div>
            </article>

            <ListPanel icon={<UsersRound size={18} />} title="Usuários">
              {paginatedUsers.map((user) => (
                <div
                  className={`list-row ${user.isActive ? "" : "inactive-row"}`}
                  key={user.id}
                >
                  <div>
                    <strong>{user.name}</strong>
                    <span>
                      {user.email} - {roleLabels[user.role]} -{" "}
                      {getUserStatusLabel(user)}
                    </span>
                    <span>
                      Cadastro em{" "}
                      {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                      {user.phone ? ` - ${user.phone}` : ""}
                    </span>
                  </div>
                  <div className="row-actions">
                    {user.isArchived ? (
                      <span className="status-pill">
                        {statusLabels.ARCHIVED}
                      </span>
                    ) : (
                      <button
                        className={
                          user.isActive ? "icon-action ghost" : "icon-action"
                        }
                        onClick={() =>
                          updateUserStatus(user.id, !user.isActive)
                        }
                        type="button"
                      >
                        {user.isActive ? "Desativar" : "Ativar"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!filteredUsers.length && !loading ? (
                <EmptyState>Nenhum usuário encontrado.</EmptyState>
              ) : null}
              <PaginationControls
                itemLabel="usuários"
                onPageChange={setCurrentPage}
                page={currentPage}
                pageSize={usersPageSize}
                totalItems={filteredUsers.length}
              />
            </ListPanel>

            <article className="panel">
              <div className="panel-header">
                <h2>Controle de acesso</h2>
                <UserCog size={18} />
              </div>
              <p>
                Esta tela lista apenas contas de empresas e freelancers. A
                equipe interna da NEXO fica separada no menu do perfil. Contas
                arquivadas foram anonimizadas e permanecem apenas para histórico
                operacional.
              </p>
            </article>
          </section>
        </>
      )}
    </DashboardShell>
  );
}

function getUserStatusLabel(user: AdminUser) {
  if (user.isArchived) {
    return statusLabels.ARCHIVED;
  }

  return user.isActive ? statusLabels.ACTIVE : statusLabels.INACTIVE;
}
