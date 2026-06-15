"use client";

import { CalendarDays, FileText } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { EmptyState, StatusMessage } from "../../../components/ui";
import { apiRequest, formatCurrency } from "../../../lib/api";
import type { Contract } from "../../../lib/dashboard-types";

const statusLabels: Record<string, string> = {
  CANCELLED: "Cancelado",
  COMPLETED: "Concluído",
  CONFIRMED: "Confirmado",
  DISPUTED: "Em contestação",
  NO_SHOW: "No-show",
  PAID: "Pago",
  PENDING_PAYMENT: "Pendente de pagamento",
};

export default function ContractsPage() {
  const session = useRequiredSession();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const loadContracts = useCallback(async () => {
    if (!session || session.user.role === "ADMIN") {
      setLoading(false);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await apiRequest<Contract[]>("/api/contracts");
      setContracts(data);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao carregar contratos.",
      );
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void loadContracts();
  }, [loadContracts]);

  async function updateContractStatus(contractId: string, status: string) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/contracts/${contractId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setSuccess("Contrato atualizado.");
      await loadContracts();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao atualizar contrato.",
      );
    }
  }

  const metrics = useMemo(
    () => ({
      total: contracts.length,
      pending: contracts.filter((item) => item.status === "PENDING_PAYMENT")
        .length,
      confirmed: contracts.filter((item) => item.status === "CONFIRMED").length,
      closed: contracts.filter((item) =>
        ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(item.status),
      ).length,
    }),
    [contracts],
  );

  if (!session) {
    return null;
  }

  if (session.user.role === "ADMIN") {
    return (
      <DashboardShell eyebrow={session.user.role} title="Contratos">
        <EmptyState>
          A visão administrativa de contratos fica distribuída em eventos,
          pagamentos e auditoria.
        </EmptyState>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={loadContracts} />}
      eyebrow={session.user.role}
      title="Contratos"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando contratos...</EmptyState> : null}

      <section className="metrics">
        <article className="metric">
          <span>Contratos</span>
          <strong>{metrics.total}</strong>
        </article>
        <article className="metric">
          <span>Pendentes</span>
          <strong>{metrics.pending}</strong>
        </article>
        <article className="metric">
          <span>Confirmados</span>
          <strong>{metrics.confirmed}</strong>
        </article>
        <article className="metric">
          <span>Encerrados</span>
          <strong>{metrics.closed}</strong>
        </article>
      </section>

      <section className="panel report-panel">
        <div className="panel-header">
          <h2>Lista de contratos</h2>
          <FileText size={18} />
        </div>
        <div className="list">
          {contracts.map((contract) => (
            <article className="list-row" key={contract.id}>
              <div>
                <strong>{contract.event?.name ?? "Evento"}</strong>
                <span>
                  {session.user.role === "COMPANY"
                    ? contract.freelancer?.displayName ??
                      contract.freelancer?.user?.name ??
                      "Profissional"
                    : contract.company?.companyName ?? "Empresa"}
                  {" - "}
                  {formatDateTime(contract.startsAt)}
                </span>
                <small>
                  {statusLabels[contract.status] ?? contract.status} -{" "}
                  {formatCurrency(contract.amountCents)}
                </small>
              </div>
              <div className="row-actions">
                <small className="status-pill">
                  {statusLabels[contract.status] ?? contract.status}
                </small>
                {contract.status === "PENDING_PAYMENT" ? (
                  <button
                    className="icon-action ghost"
                    onClick={() =>
                      updateContractStatus(contract.id, "CANCELLED")
                    }
                    type="button"
                  >
                    Cancelar
                  </button>
                ) : null}
                {contract.status === "CONFIRMED" ? (
                  <>
                    <button
                      className="icon-action"
                      onClick={() =>
                        updateContractStatus(contract.id, "COMPLETED")
                      }
                      type="button"
                    >
                      Concluir
                    </button>
                    {session.user.role === "COMPANY" ? (
                      <button
                        className="icon-action ghost"
                        onClick={() =>
                          updateContractStatus(contract.id, "NO_SHOW")
                        }
                        type="button"
                      >
                        No-show
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            </article>
          ))}
          {!loading && !contracts.length ? (
            <EmptyState>Nenhum contrato encontrado.</EmptyState>
          ) : null}
        </div>
      </section>
    </DashboardShell>
  );
}

function formatDateTime(date: string) {
  return (
    <span>
      <CalendarDays size={14} />{" "}
      {new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(date))}
    </span>
  );
}
