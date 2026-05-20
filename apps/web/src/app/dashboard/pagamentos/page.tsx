"use client";

import { BriefcaseBusiness, CreditCard, Wallet } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { ListPanel } from "../../../components/dashboard-widgets";
import { EmptyState, Field, StatusMessage } from "../../../components/ui";
import { apiRequest, formatCurrency } from "../../../lib/api";
import type {
  Contract,
  Payment,
  WalletData,
} from "../../../lib/dashboard-types";

type AdminPayment = Payment & {
  contract?: Contract;
};

export default function PaymentsPage() {
  const session = useRequiredSession();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [adminPayments, setAdminPayments] = useState<AdminPayment[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const adminMetrics = useMemo(
    () => ({
      total: adminPayments.length,
      grossAmountCents: adminPayments.reduce(
        (total, payment) => total + payment.grossAmountCents,
        0,
      ),
      freelancerAmountCents: adminPayments.reduce(
        (total, payment) => total + payment.freelancerAmountCents,
        0,
      ),
      platformFeeCents: adminPayments.reduce(
        (total, payment) => total + payment.platformFeeCents,
        0,
      ),
      pendingRelease: adminPayments.filter(
        (payment) => payment.status === "PAID",
      ).length,
    }),
    [adminPayments],
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadPayments();
  }, [session]);

  async function loadPayments() {
    setError("");
    setLoading(true);

    try {
      if (session?.user.role === "ADMIN") {
        const data = await apiRequest<AdminPayment[]>("/api/admin/payments");
        setAdminPayments(data);
        return;
      }

      const [loadedContracts, loadedPayments] = await Promise.all([
        apiRequest<Contract[]>("/api/contracts"),
        apiRequest<Payment[]>("/api/payments"),
      ]);
      setContracts(loadedContracts);
      setPayments(loadedPayments);

      if (
        session?.user.role === "FREELANCER" ||
        session?.user.role === "COMPANY"
      ) {
        setWallet(await apiRequest<WalletData>("/api/wallet"));
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao carregar pagamentos.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function payContract(contractId: string) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/payments/contracts/${contractId}/pay`, {
        method: "POST",
      });
      setSuccess(
        "Pagamento realizado. Saldo da carteira aplicado quando disponível.",
      );
      await loadPayments();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao pagar contrato.",
      );
    }
  }

  async function topUpWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));

    try {
      await apiRequest("/api/wallet/top-up", {
        method: "POST",
        body: JSON.stringify({
          amountCents: Math.round(amount * 100),
          description: "Carga simulada pela tela de pagamentos",
        }),
      });
      event.currentTarget.reset();
      setSuccess("Saldo carregado na carteira da empresa.");
      await loadPayments();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao carregar saldo da carteira.",
      );
    }
  }

  function contractTotal(contract: Contract) {
    return contract.amountCents + contract.platformFeeCents;
  }

  async function releasePayment(paymentId: string) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/payments/${paymentId}/release`, {
        method: "POST",
      });
      setSuccess("Pagamento liberado para o freelancer.");
      await loadPayments();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao liberar pagamento.",
      );
    }
  }

  async function processDueReleases() {
    setError("");
    setSuccess("");

    try {
      const result = await apiRequest<{ released: number; eligible: number }>(
        "/api/payments/process-due-releases",
        { method: "POST" },
      );
      setSuccess(
        `${result.released} repasse(s) liberado(s) de ${result.eligible} elegível(is).`,
      );
      await loadPayments();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao processar repasses vencidos.",
      );
    }
  }

  async function updateContractStatus(contractId: string, status: string) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/contracts/${contractId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setSuccess("Contrato atualizado.");
      await loadPayments();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao atualizar contrato.",
      );
    }
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={loadPayments} />}
      eyebrow={session.user.role}
      title="Pagamentos"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando pagamentos...</EmptyState> : null}

      {session.user.role === "ADMIN" ? (
        <section className="metrics">
          <article className="metric">
            <span>Pagamentos</span>
            <strong>{adminMetrics.total}</strong>
          </article>
          <article className="metric">
            <span>Volume bruto</span>
            <strong>{formatCurrency(adminMetrics.grossAmountCents)}</strong>
          </article>
          <article className="metric">
            <span>Repasse</span>
            <strong>
              {formatCurrency(adminMetrics.freelancerAmountCents)}
            </strong>
          </article>
          <article className="metric">
            <span>Taxa NEXO</span>
            <strong>{formatCurrency(adminMetrics.platformFeeCents)}</strong>
          </article>
        </section>
      ) : null}

      <section className="dashboard-grid">
        {session.user.role === "COMPANY" ? (
          <ListPanel icon={<Wallet size={18} />} title="Carteira da empresa">
            <div className="wallet-balance">
              {formatCurrency(wallet?.balanceCents)}
            </div>
            <form className="form compact" onSubmit={topUpWallet}>
              <Field label="Carregar saldo">
                <input
                  min="1"
                  name="amount"
                  placeholder="500,00"
                  required
                  step="0.01"
                  type="number"
                />
              </Field>
              <button className="primary-button" type="submit">
                Carregar saldo
              </button>
            </form>
            {wallet?.transactions?.slice(0, 5).map((transaction) => (
              <div className="list-row" key={transaction.id}>
                <div>
                  <strong>{transaction.type}</strong>
                  <span>{transaction.description ?? "Transação"}</span>
                </div>
                <small>{formatCurrency(transaction.amountCents)}</small>
              </div>
            ))}
          </ListPanel>
        ) : null}

        {session.user.role === "FREELANCER" ? (
          <ListPanel icon={<Wallet size={18} />} title="Carteira">
            <div className="wallet-balance">
              {formatCurrency(wallet?.balanceCents)}
            </div>
            {wallet?.transactions?.map((transaction) => (
              <div className="list-row" key={transaction.id}>
                <div>
                  <strong>{transaction.type}</strong>
                  <span>{transaction.description ?? "Transação"}</span>
                </div>
                <small>{formatCurrency(transaction.amountCents)}</small>
              </div>
            ))}
          </ListPanel>
        ) : null}

        {session.user.role === "ADMIN" ? (
          <>
            <article className="panel">
              <div className="panel-header">
                <h2>Fila de repasse</h2>
                <Wallet size={18} />
              </div>
              <div className="admin-count">{adminMetrics.pendingRelease}</div>
              <p>Pagamento(s) aguardando liberação para o freelancer.</p>
              <button
                className="primary-button full"
                onClick={processDueReleases}
                type="button"
              >
                Processar vencidos
              </button>
            </article>

            <ListPanel
              icon={<CreditCard size={18} />}
              title="Pagamentos da plataforma"
            >
              {adminPayments.map((payment) => (
                <div className="list-row" key={payment.id}>
                  <div>
                    <strong>
                      {payment.contract?.event?.name ?? "Pagamento"}
                    </strong>
                    <span>
                      {payment.contract?.company?.companyName ?? "Empresa"} -{" "}
                      {payment.contract?.freelancer?.displayName ??
                        "Profissional"}
                    </span>
                    <span>
                      Bruto {formatCurrency(payment.grossAmountCents)} - repasse{" "}
                      {formatCurrency(payment.freelancerAmountCents)} - taxa{" "}
                      {formatCurrency(payment.platformFeeCents)} -{" "}
                      {payment.status}
                    </span>
                  </div>
                  {payment.status === "PAID" ? (
                    <button
                      className="icon-action"
                      onClick={() => releasePayment(payment.id)}
                      type="button"
                    >
                      Liberar
                    </button>
                  ) : null}
                </div>
              ))}
            </ListPanel>
          </>
        ) : (
          <>
            <ListPanel icon={<BriefcaseBusiness size={18} />} title="Contratos">
              {contracts.map((contract) => (
                <div className="list-row" key={contract.id}>
                  <div>
                    <strong>{contract.event?.name ?? "Contrato"}</strong>
                    <span>
                      {formatCurrency(contract.amountCents)} - {contract.status}
                    </span>
                    {session.user.role === "COMPANY" &&
                    contract.status === "PENDING_PAYMENT" ? (
                      <span>
                        Total com taxa:{" "}
                        {formatCurrency(contractTotal(contract))} | saldo usado:{" "}
                        {formatCurrency(
                          Math.min(
                            wallet?.balanceCents ?? 0,
                            contractTotal(contract),
                          ),
                        )}{" "}
                        | complemento:{" "}
                        {formatCurrency(
                          Math.max(
                            contractTotal(contract) -
                              (wallet?.balanceCents ?? 0),
                            0,
                          ),
                        )}
                      </span>
                    ) : null}
                  </div>
                  <div className="row-actions">
                    {session.user.role === "COMPANY" &&
                    contract.status === "PENDING_PAYMENT" ? (
                      <button
                        className="icon-action"
                        onClick={() => payContract(contract.id)}
                        type="button"
                      >
                        Pagar
                      </button>
                    ) : null}
                    <ContractStatusActions
                      contract={contract}
                      role={session.user.role}
                      onUpdate={updateContractStatus}
                    />
                  </div>
                </div>
              ))}
            </ListPanel>

            <ListPanel icon={<CreditCard size={18} />} title="Pagamentos">
              {payments.map((payment) => (
                <div className="list-row" key={payment.id}>
                  <div>
                    <strong>
                      {payment.contract?.event?.name ?? "Pagamento"}
                    </strong>
                    <span>
                      {formatCurrency(payment.grossAmountCents)} -{" "}
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </ListPanel>
          </>
        )}
      </section>
    </DashboardShell>
  );
}

function ContractStatusActions({
  contract,
  onUpdate,
  role,
}: Readonly<{
  contract: Contract;
  onUpdate: (contractId: string, status: string) => void;
  role: string;
}>) {
  const canCancel = ["PENDING_PAYMENT", "CONFIRMED"].includes(contract.status);
  const canFinish = contract.status === "CONFIRMED";

  if (role !== "COMPANY" && role !== "FREELANCER") {
    return null;
  }

  return (
    <>
      {canFinish ? (
        <button
          className="icon-action"
          onClick={() => onUpdate(contract.id, "COMPLETED")}
          type="button"
        >
          Concluir
        </button>
      ) : null}
      {role === "COMPANY" && canFinish ? (
        <button
          className="icon-action ghost"
          onClick={() => onUpdate(contract.id, "NO_SHOW")}
          type="button"
        >
          No-show
        </button>
      ) : null}
      {canCancel ? (
        <button
          className="icon-action ghost"
          onClick={() => onUpdate(contract.id, "CANCELLED")}
          type="button"
        >
          Cancelar
        </button>
      ) : null}
    </>
  );
}
