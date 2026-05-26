"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Search, ShieldCheck, UserCog } from "lucide-react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { ListPanel } from "../../../components/dashboard-widgets";
import { EmptyState, StatusMessage } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import type {
  AdminAccessLevel,
  AdminUser,
} from "../../../lib/dashboard-types";

const adminAccessOptions: Array<{
  value: AdminAccessLevel;
  label: string;
}> = [
  { value: "OWNER", label: "Owner" },
  { value: "MANAGER", label: "Gestão" },
  { value: "FINANCE", label: "Financeiro" },
  { value: "SUPPORT", label: "Suporte" },
  { value: "VERIFICATION", label: "Verificação" },
  { value: "READONLY", label: "Leitura" },
];

const adminAccessLabels: Record<AdminAccessLevel, string> = {
  OWNER: "Owner",
  MANAGER: "Gestão",
  FINANCE: "Financeiro",
  SUPPORT: "Suporte",
  VERIFICATION: "Verificação",
  READONLY: "Leitura",
};

export default function AdministratorsPage() {
  const session = useRequiredSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [accessFilter, setAccessFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const administrators = useMemo(
    () => users.filter((user) => user.role === "ADMIN"),
    [users],
  );
  const currentAdmin = useMemo(
    () => administrators.find((user) => user.id === session?.user.id),
    [administrators, session?.user.id],
  );
  const canManageAdmins =
    currentAdmin?.adminProfile?.accessLevel === "OWNER" ||
    currentAdmin?.adminProfile?.accessLevel === "MANAGER";
  const activeAdmins = useMemo(
    () => administrators.filter((user) => user.isActive).length,
    [administrators],
  );
  const ownerAdmins = useMemo(
    () =>
      administrators.filter(
        (user) => user.adminProfile?.accessLevel === "OWNER",
      ).length,
    [administrators],
  );
  const filteredAdmins = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return administrators.filter((user) => {
      const accessLevel = user.adminProfile?.accessLevel ?? "READONLY";
      const matchesAccess =
        accessFilter === "ALL" || accessLevel === accessFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" ? user.isActive : !user.isActive);
      const matchesSearch =
        !normalizedSearch ||
        [user.name, user.email, user.phone ?? ""].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        );

      return matchesAccess && matchesStatus && matchesSearch;
    });
  }, [accessFilter, administrators, searchTerm, statusFilter]);

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
        caught instanceof Error
          ? caught.message
          : "Erro ao carregar administradores.",
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

  async function createAdminUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    setSuccess("");
    setTemporaryPassword("");
    setCreatingAdmin(true);

    const password = String(form.get("password") ?? "");

    try {
      const created = await apiRequest<AdminUser>("/api/admin/users/admins", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name")),
          email: String(form.get("email")),
          phone: String(form.get("phone") || ""),
          password: password || undefined,
          accessLevel: String(form.get("accessLevel")),
        }),
      });
      formElement.reset();
      if (created.temporaryPassword) {
        setTemporaryPassword(created.temporaryPassword);
      }
      setSuccess("Administrador criado.");
      await loadUsers();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao criar administrador.",
      );
    } finally {
      setCreatingAdmin(false);
    }
  }

  async function updateAdminAccess(userId: string, accessLevel: AdminAccessLevel) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/admin/users/${userId}/admin-access`, {
        method: "PATCH",
        body: JSON.stringify({ accessLevel }),
      });
      setSuccess("Nível de acesso atualizado.");
      await loadUsers();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao atualizar nível de acesso.",
      );
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
      setSuccess(isActive ? "Administrador ativado." : "Administrador desativado.");
      await loadUsers();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao atualizar administrador.",
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
      title="Administradores"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando administradores...</EmptyState> : null}

      {session.user.role !== "ADMIN" ? (
        <EmptyState>
          Esta área é reservada para a operação administrativa da NEXO.
        </EmptyState>
      ) : (
        <>
          <section className="metrics">
            <article className="metric">
              <span>Total</span>
              <strong>{administrators.length}</strong>
            </article>
            <article className="metric">
              <span>Ativos</span>
              <strong>{activeAdmins}</strong>
            </article>
            <article className="metric">
              <span>Owners</span>
              <strong>{ownerAdmins}</strong>
            </article>
            <article className="metric">
              <span>Seu nível</span>
              <strong>
                {currentAdmin?.adminProfile?.accessLevel
                  ? adminAccessLabels[currentAdmin.adminProfile.accessLevel]
                  : "-"}
              </strong>
            </article>
          </section>

          <section className="dashboard-grid">
            {canManageAdmins ? (
              <article className="panel report-panel">
                <div className="panel-header">
                  <h2>Novo administrador</h2>
                  <KeyRound size={18} />
                </div>
                <form
                  className="form-grid filters-grid"
                  onSubmit={createAdminUser}
                >
                  <label className="field">
                    <span>Nome</span>
                    <input name="name" placeholder="Nome completo" required />
                  </label>
                  <label className="field">
                    <span>E-mail</span>
                    <input
                      name="email"
                      placeholder="admin@nexo.local"
                      required
                      type="email"
                    />
                  </label>
                  <label className="field">
                    <span>Telefone</span>
                    <input name="phone" placeholder="(00) 00000-0000" />
                  </label>
                  <label className="field">
                    <span>Nível</span>
                    <select name="accessLevel" defaultValue="SUPPORT">
                      {adminAccessOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Senha</span>
                    <input
                      minLength={8}
                      name="password"
                      placeholder="Gerar automaticamente"
                      type="password"
                    />
                  </label>
                  <button
                    className="primary-button full"
                    disabled={creatingAdmin}
                    type="submit"
                  >
                    {creatingAdmin ? "Criando..." : "Criar administrador"}
                  </button>
                </form>
                {temporaryPassword ? (
                  <div className="dev-token">
                    <span>Senha temporária</span>
                    <strong>{temporaryPassword}</strong>
                    <button
                      className="secondary-button"
                      onClick={() =>
                        navigator.clipboard.writeText(temporaryPassword)
                      }
                      type="button"
                    >
                      Copiar senha
                    </button>
                  </div>
                ) : null}
              </article>
            ) : null}

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
                  <span>Nível</span>
                  <select
                    onChange={(event) => setAccessFilter(event.target.value)}
                    value={accessFilter}
                  >
                    <option value="ALL">Todos</option>
                    {adminAccessOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
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
                  <strong>{filteredAdmins.length}</strong>
                </div>
              </div>
            </article>

            <ListPanel icon={<ShieldCheck size={18} />} title="Equipe NEXO">
              {filteredAdmins.map((user) => (
                <div
                  className={`list-row ${user.isActive ? "" : "inactive-row"}`}
                  key={user.id}
                >
                  <div>
                    <strong>{user.name}</strong>
                    <span>
                      {user.email} - {user.isActive ? "Ativo" : "Inativo"}
                    </span>
                    <span>
                      Acesso:{" "}
                      {
                        adminAccessLabels[
                          user.adminProfile?.accessLevel ?? "READONLY"
                        ]
                      }
                      {user.phone ? ` - ${user.phone}` : ""}
                    </span>
                  </div>
                  <div className="row-actions">
                    <select
                      aria-label="Nível de acesso administrativo"
                      disabled={!canManageAdmins || user.id === session.user.id}
                      onChange={(event) =>
                        updateAdminAccess(
                          user.id,
                          event.target.value as AdminAccessLevel,
                        )
                      }
                      value={user.adminProfile?.accessLevel ?? "READONLY"}
                    >
                      {adminAccessOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className={
                        user.isActive ? "icon-action ghost" : "icon-action"
                      }
                      disabled={!canManageAdmins || user.id === session.user.id}
                      onClick={() => updateUserStatus(user.id, !user.isActive)}
                      type="button"
                    >
                      {user.isActive ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </div>
              ))}
              {!filteredAdmins.length && !loading ? (
                <EmptyState>Nenhum administrador encontrado.</EmptyState>
              ) : null}
            </ListPanel>

            <article className="panel">
              <div className="panel-header">
                <h2>Níveis de acesso</h2>
                <UserCog size={18} />
              </div>
              <p>
                Owner e gestão administram a equipe interna. Financeiro opera
                pagamentos, suporte acompanha usuários e disputas, verificação
                analisa cadastros e leitura apenas consulta dados.
              </p>
            </article>
          </section>
        </>
      )}
    </DashboardShell>
  );
}
