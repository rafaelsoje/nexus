"use client";

import { ClipboardList, Search } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { ListPanel } from "../../../components/dashboard-widgets";
import { EmptyState, Field, StatusMessage } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import type { AuditLog } from "../../../lib/dashboard-types";

export default function AuditPage() {
  const session = useRequiredSession();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filters, setFilters] = useState({
    action: "",
    dateFrom: "",
    dateTo: "",
    entity: "",
    userId: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const metrics = useMemo(
    () => ({
      actions: new Set(logs.map((log) => log.action)).size,
      entities: new Set(logs.map((log) => log.entity)).size,
      system: logs.filter((log) => !log.user).length,
      total: logs.length,
    }),
    [logs],
  );

  const loadLogs = useCallback(async (nextFilters = filters) => {
    setError("");
    setLoading(true);

    if (session?.user.role !== "ADMIN") {
      setLoading(false);
      return;
    }

    try {
      const query = new URLSearchParams();

      for (const [key, value] of Object.entries(nextFilters)) {
        if (value.trim()) {
          query.set(key, value.trim());
        }
      }

      const suffix = query.toString() ? `?${query.toString()}` : "";
      setLogs(await apiRequest<AuditLog[]>(`/api/admin/audit-logs${suffix}`));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao carregar auditoria.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters, session?.user.role]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadLogs();
  }, [loadLogs, session]);

  function handleFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadLogs();
  }

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={() => loadLogs()} />}
      eyebrow={session.user.role}
      title="Auditoria"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando auditoria...</EmptyState> : null}

      {session.user.role !== "ADMIN" ? (
        <EmptyState>
          Esta área é reservada para a operação administrativa da NEXO.
        </EmptyState>
      ) : (
        <>
          <section className="metrics">
            <article className="metric">
              <span>Logs</span>
              <strong>{metrics.total}</strong>
            </article>
            <article className="metric">
              <span>Ações</span>
              <strong>{metrics.actions}</strong>
            </article>
            <article className="metric">
              <span>Entidades</span>
              <strong>{metrics.entities}</strong>
            </article>
            <article className="metric">
              <span>Sistema</span>
              <strong>{metrics.system}</strong>
            </article>
          </section>

          <section className="dashboard-grid">
            <article className="panel report-panel">
              <div className="panel-header">
                <h2>Filtros</h2>
                <Search size={18} />
              </div>
              <form className="form compact" onSubmit={handleFilter}>
                <div className="form-grid filters-grid">
                  <Field label="Ação">
                    <input
                      onChange={(event) =>
                        updateFilter("action", event.target.value)
                      }
                      placeholder="PAYMENT, DISPUTE..."
                      value={filters.action}
                    />
                  </Field>
                  <Field label="Entidade">
                    <input
                      onChange={(event) =>
                        updateFilter("entity", event.target.value)
                      }
                      placeholder="Payment, Contract..."
                      value={filters.entity}
                    />
                  </Field>
                  <Field label="Usuário ID">
                    <input
                      onChange={(event) =>
                        updateFilter("userId", event.target.value)
                      }
                      placeholder="cuid do usuário"
                      value={filters.userId}
                    />
                  </Field>
                  <Field label="De">
                    <input
                      onChange={(event) =>
                        updateFilter("dateFrom", event.target.value)
                      }
                      type="date"
                      value={filters.dateFrom}
                    />
                  </Field>
                  <Field label="Até">
                    <input
                      onChange={(event) =>
                        updateFilter("dateTo", event.target.value)
                      }
                      type="date"
                      value={filters.dateTo}
                    />
                  </Field>
                </div>
                <div className="button-row">
                  <button className="primary-button" type="submit">
                    Filtrar
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      const empty = {
                        action: "",
                        dateFrom: "",
                        dateTo: "",
                        entity: "",
                        userId: "",
                      };
                      setFilters(empty);
                      void loadLogs(empty);
                    }}
                    type="button"
                  >
                    Limpar
                  </button>
                </div>
              </form>
            </article>

            <ListPanel icon={<ClipboardList size={18} />} title="Logs">
              {logs.length ? (
                logs.map((log) => <AuditLogRow key={log.id} log={log} />)
              ) : (
                <EmptyState>Nenhum log encontrado.</EmptyState>
              )}
            </ListPanel>
          </section>
        </>
      )}
    </DashboardShell>
  );
}

function AuditLogRow({ log }: Readonly<{ log: AuditLog }>) {
  return (
    <div className="list-row audit-row">
      <div>
        <strong>{formatAuditAction(log.action)}</strong>
        <span>
          {log.entity}
          {log.entityId ? ` - ${log.entityId}` : ""}
        </span>
        <span>
          {log.user?.name ?? "Sistema"} - {formatDate(log.createdAt)}
        </span>
        {log.user ? (
          <span>
            {log.user.role} - {log.user.email}
          </span>
        ) : null}
        {log.metadata ? <code>{formatMetadata(log.metadata)}</code> : null}
      </div>
    </div>
  );
}

function formatAuditAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("pt-BR");
}

function formatMetadata(metadata: unknown) {
  try {
    return JSON.stringify(metadata);
  } catch {
    return String(metadata);
  }
}
