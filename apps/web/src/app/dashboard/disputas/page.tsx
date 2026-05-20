"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Search, ShieldAlert } from "lucide-react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { ListPanel } from "../../../components/dashboard-widgets";
import { EmptyState, Field, StatusMessage } from "../../../components/ui";
import { apiRequest, formatCurrency } from "../../../lib/api";
import type { Contract, Dispute } from "../../../lib/dashboard-types";

const disputableStatuses = new Set([
  "PENDING_PAYMENT",
  "CONFIRMED",
  "COMPLETED",
  "NO_SHOW",
  "PAID",
]);

export default function DisputesPage() {
  const session = useRequiredSession();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const disputableContracts = useMemo(
    () =>
      contracts.filter((contract) => disputableStatuses.has(contract.status)),
    [contracts],
  );
  const filteredDisputes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return disputes.filter((dispute) => {
      const matchesStatus =
        statusFilter === "ALL" || dispute.status === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        [
          dispute.reason,
          dispute.details ?? "",
          dispute.contract?.event?.name ?? "",
          dispute.contract?.company?.companyName ?? "",
          dispute.contract?.freelancer?.displayName ?? "",
        ].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesStatus && matchesSearch;
    });
  }, [disputes, searchTerm, statusFilter]);
  const adminMetrics = useMemo(
    () => ({
      total: disputes.length,
      open: disputes.filter((dispute) => dispute.status === "OPEN").length,
      underReview: disputes.filter(
        (dispute) => dispute.status === "UNDER_REVIEW",
      ).length,
      resolved: disputes.filter((dispute) => dispute.status === "RESOLVED")
        .length,
    }),
    [disputes],
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadDisputes();
  }, [session]);

  async function loadDisputes() {
    setError("");
    setLoading(true);

    try {
      if (session?.user.role === "ADMIN") {
        setDisputes(await apiRequest<Dispute[]>("/api/admin/disputes"));
        setContracts([]);
        return;
      }

      const [loadedContracts, loadedDisputes] = await Promise.all([
        apiRequest<Contract[]>("/api/contracts"),
        apiRequest<Dispute[]>("/api/disputes"),
      ]);
      setContracts(loadedContracts);
      setDisputes(loadedDisputes);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao carregar contestações.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDispute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    setSuccess("");

    try {
      await apiRequest("/api/disputes", {
        method: "POST",
        body: JSON.stringify({
          contractId: String(form.get("contractId")),
          reason: String(form.get("reason")),
          details: String(form.get("details")),
        }),
      });
      formElement.reset();
      setSuccess("Contestação aberta.");
      await loadDisputes();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao abrir contestação.",
      );
    }
  }

  async function updateDisputeStatus(disputeId: string, status: string) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/admin/disputes/${disputeId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setSuccess("Status da contestação atualizado.");
      await loadDisputes();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao atualizar contestação.",
      );
    }
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={loadDisputes} />}
      eyebrow={session.user.role}
      title="Contestações"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando contestações...</EmptyState> : null}

      {session.user.role === "ADMIN" ? (
        <>
          <section className="metrics">
            <article className="metric">
              <span>Contestações</span>
              <strong>{adminMetrics.total}</strong>
            </article>
            <article className="metric">
              <span>Abertas</span>
              <strong>{adminMetrics.open}</strong>
            </article>
            <article className="metric">
              <span>Em análise</span>
              <strong>{adminMetrics.underReview}</strong>
            </article>
            <article className="metric">
              <span>Resolvidas</span>
              <strong>{adminMetrics.resolved}</strong>
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
                    placeholder="Evento, empresa, profissional ou motivo"
                    value={searchTerm}
                  />
                </label>
                <label className="field">
                  <span>Status</span>
                  <select
                    onChange={(event) => setStatusFilter(event.target.value)}
                    value={statusFilter}
                  >
                    <option value="ALL">Todos</option>
                    <option value="OPEN">Abertas</option>
                    <option value="UNDER_REVIEW">Em análise</option>
                    <option value="RESOLVED">Resolvidas</option>
                    <option value="REJECTED">Rejeitadas</option>
                  </select>
                </label>
                <div className="filter-summary">
                  <span>Resultado</span>
                  <strong>{filteredDisputes.length}</strong>
                </div>
              </div>
            </article>

            <ListPanel
              icon={<BriefcaseBusiness size={18} />}
              title="Contestações da plataforma"
            >
              {filteredDisputes.map((dispute) => (
                <div className="list-row" key={dispute.id}>
                  <div>
                    <strong>
                      {dispute.contract?.event?.name ?? dispute.reason}
                    </strong>
                    <span>
                      {dispute.contract?.company?.companyName ?? "Empresa"} -{" "}
                      {dispute.contract?.freelancer?.displayName ??
                        "Profissional"}
                    </span>
                    <span>
                      {dispute.reason} - {dispute.status}
                      {dispute.details ? ` - ${dispute.details}` : ""}
                    </span>
                  </div>
                  <div className="row-actions">
                    {dispute.status === "OPEN" ? (
                      <button
                        className="icon-action"
                        onClick={() =>
                          updateDisputeStatus(dispute.id, "UNDER_REVIEW")
                        }
                        type="button"
                      >
                        Em análise
                      </button>
                    ) : null}
                    {dispute.status !== "RESOLVED" ? (
                      <button
                        className="icon-action"
                        onClick={() =>
                          updateDisputeStatus(dispute.id, "RESOLVED")
                        }
                        type="button"
                      >
                        Resolver
                      </button>
                    ) : null}
                    {dispute.status !== "REJECTED" ? (
                      <button
                        className="icon-action ghost"
                        onClick={() =>
                          updateDisputeStatus(dispute.id, "REJECTED")
                        }
                        type="button"
                      >
                        Rejeitar
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </ListPanel>
          </section>
        </>
      ) : (
        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Abrir contestação</h2>
              <ShieldAlert size={18} />
            </div>
            <form className="form compact" onSubmit={handleCreateDispute}>
              <Field label="Contrato">
                <select name="contractId" required>
                  <option value="" disabled>
                    Selecione um contrato
                  </option>
                  {disputableContracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.event?.name ?? "Contrato"} -{" "}
                      {formatCurrency(contract.amountCents)} - {contract.status}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Motivo">
                <input
                  name="reason"
                  placeholder="No-show, divergência, pagamento..."
                  required
                />
              </Field>
              <Field label="Detalhes">
                <input name="details" placeholder="Descreva o ocorrido" />
              </Field>
              <button
                className="primary-button full"
                disabled={!disputableContracts.length}
                type="submit"
              >
                Abrir contestação
              </button>
            </form>
          </article>

          <ListPanel icon={<BriefcaseBusiness size={18} />} title="Histórico">
            {filteredDisputes.map((dispute) => (
              <div className="list-row" key={dispute.id}>
                <div>
                  <strong>
                    {dispute.contract?.event?.name ?? dispute.reason}
                  </strong>
                  <span>
                    {dispute.reason} - {dispute.status}
                    {dispute.details ? ` - ${dispute.details}` : ""}
                  </span>
                </div>
                <small>
                  {new Date(dispute.createdAt).toLocaleDateString("pt-BR")}
                </small>
              </div>
            ))}
          </ListPanel>
        </section>
      )}
    </DashboardShell>
  );
}
