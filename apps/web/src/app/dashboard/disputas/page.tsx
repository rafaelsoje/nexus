"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, ShieldAlert } from "lucide-react";
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const disputableContracts = useMemo(
    () =>
      contracts.filter((contract) => disputableStatuses.has(contract.status)),
    [contracts],
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
        setContracts([]);
        setDisputes([]);
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
        caught instanceof Error ? caught.message : "Erro ao carregar disputas.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDispute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
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
      event.currentTarget.reset();
      setSuccess("Disputa aberta.");
      await loadDisputes();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao abrir disputa.",
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
      title="Disputas"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando disputas...</EmptyState> : null}

      {session.user.role === "ADMIN" ? (
        <EmptyState>
          A resolução administrativa de disputas será operada no próximo módulo
          do painel admin.
        </EmptyState>
      ) : (
        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Abrir disputa</h2>
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
                Abrir disputa
              </button>
            </form>
          </article>

          <ListPanel icon={<BriefcaseBusiness size={18} />} title="Histórico">
            {disputes.map((dispute) => (
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
