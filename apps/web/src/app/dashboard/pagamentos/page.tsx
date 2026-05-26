"use client";

import { BriefcaseBusiness, CreditCard, Wallet } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { ListPanel } from "../../../components/dashboard-widgets";
import {
  ConfirmationDialog,
  EmptyState,
  Field,
  StatusMessage,
} from "../../../components/ui";
import { apiRequest, formatCurrency } from "../../../lib/api";
import type {
  Contract,
  EventItem,
  Payment,
  Payout,
  WalletData,
} from "../../../lib/dashboard-types";

type AdminPayment = Payment & {
  event?: Contract["event"];
};

type WebhookEvent = {
  id: string;
  gateway: string;
  eventType: string;
  gatewayEventId: string;
  processed: boolean;
  createdAt: string;
};

type PendingConfirmation = {
  confirmLabel?: string;
  description: string;
  onConfirm: () => void;
  title: string;
};

const transactionTypeLabels: Record<string, string> = {
  CREDIT: "Crédito",
  DEBIT: "Débito",
  FEE: "Taxa",
  PAYOUT: "Repasse",
  REFUND: "Estorno",
};

const contractStatusLabels: Record<string, string> = {
  CANCELLED: "Cancelado",
  COMPLETED: "Concluído",
  CONFIRMED: "Confirmado",
  DISPUTED: "Em contestação",
  NO_SHOW: "Ausência",
  PAID: "Pago",
  PENDING_PAYMENT: "Aguardando pagamento",
};

const paymentStatusLabels: Record<string, string> = {
  AUTHORIZED: "Autorizado",
  CHARGEBACK: "Contestação bancária",
  FAILED: "Falhou",
  PAID: "Pago",
  PENDING: "Pendente",
  REFUNDED: "Estornado",
  RELEASED: "Liberado",
  WAITING_PAYMENT: "Aguardando pagamento",
  WAITING_RELEASE: "Aguardando liberação",
  BLOCKED: "Bloqueado",
  SCHEDULED: "Agendado",
  PROCESSING: "Processando",
  CANCELLED: "Cancelado",
};

const splitActionLabels = {
  release: "Liberar",
  refund: "Estornar",
  unblock: "Desbloquear",
};

const splitActionDescriptions = {
  release:
    "O valor líquido do split será creditado na carteira do profissional.",
  refund:
    "O split será estornado e o contrato poderá voltar para pagamento pendente.",
  unblock:
    "O split bloqueado voltará para aguardando liberação, desde que a disputa já permita.",
};

const contractActionLabels = {
  CANCELLED: "Cancelar",
  COMPLETED: "Concluir",
  NO_SHOW: "Marcar ausência",
};

const contractActionDescriptions = {
  CANCELLED:
    "O contrato será cancelado e sairá do fluxo ativo de pagamento e execução.",
  COMPLETED:
    "O contrato será marcado como concluído e poderá iniciar o fluxo de liberação financeira.",
  NO_SHOW:
    "O contrato será marcado como ausência e poderá afetar o fluxo de repasse.",
};

export default function PaymentsPage() {
  const session = useRequiredSession();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [adminPayments, setAdminPayments] = useState<AdminPayment[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmation, setConfirmation] =
    useState<PendingConfirmation | null>(null);

  const adminMetrics = useMemo(
    () => ({
      total: adminPayments.length,
      grossAmountCents: adminPayments.reduce(
        (total, payment) => total + payment.grossAmountCents,
        0,
      ),
      freelancerAmountCents: adminPayments.reduce(
        (total, payment) =>
          total +
          (payment.totalFreelancerAmountCents ??
            payment.freelancerNetAmountCents ??
            payment.freelancerAmountCents),
        0,
      ),
      platformFeeCents: adminPayments.reduce(
        (total, payment) =>
          total + (payment.platformAmountCents ?? payment.platformFeeCents),
        0,
      ),
      pendingRelease: adminPayments.filter(
        (payment) => payment.status === "PAID",
      ).length,
    }),
    [adminPayments],
  );
  const payableEventGroups = useMemo(() => {
    const groups = new Map<
      string,
      { event?: EventItem; contracts: Contract[] }
    >();

    for (const contract of contracts) {
      if (contract.status !== "PENDING_PAYMENT") {
        continue;
      }

      const eventId = contract.event?.id ?? contract.id;
      const group = groups.get(eventId) ?? {
        event: contract.event,
        contracts: [],
      };
      group.contracts.push(contract);
      groups.set(eventId, group);
    }

    return Array.from(groups.entries()).map(([eventId, group]) => ({
      eventId,
      ...group,
    }));
  }, [contracts]);

  const loadPayments = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      if (session?.user.role === "ADMIN") {
        const [data, webhookData, payoutData] = await Promise.all([
          apiRequest<AdminPayment[]>("/api/admin/payments"),
          apiRequest<WebhookEvent[]>("/api/admin/payment-webhooks"),
          apiRequest<Payout[]>("/api/admin/payouts"),
        ]);
        setAdminPayments(data);
        setWebhooks(webhookData);
        setPayouts(payoutData);
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
  }, [session?.user.role]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadPayments();
  }, [loadPayments, session]);

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

  async function payEvent(eventId: string) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/payments/events/${eventId}/pay`, {
        method: "POST",
      });
      setSuccess(
        "Pagamento do evento realizado. Os splits foram reservados por profissional.",
      );
      await loadPayments();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao pagar evento.",
      );
    }
  }

  async function topUpWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    const formElement = event.currentTarget;

    confirmSensitive({
      confirmLabel: "Carregar saldo",
      description: `Confirmar carga simulada de ${formatCurrency(amountToCents(amount))} na carteira da empresa?`,
      onConfirm: () => void topUpWalletAmount(amount, formElement),
      title: "Carregar saldo?",
    });
  }

  async function topUpWalletAmount(amount: number, form: HTMLFormElement) {
    try {
      await apiRequest("/api/wallet/top-up", {
        method: "POST",
        body: JSON.stringify({
          amountCents: amountToCents(amount),
          description: "Carga simulada pela tela de pagamentos",
        }),
      });
      form.reset();
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

  async function requestPayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    const formElement = event.currentTarget;

    confirmSensitive({
      confirmLabel: "Solicitar saque",
      description: `Confirmar solicitação de saque de ${formatCurrency(amountToCents(amount))}?`,
      onConfirm: () => void requestPayoutAmount(amount, formElement),
      title: "Solicitar saque?",
    });
  }

  async function requestPayoutAmount(amount: number, form: HTMLFormElement) {
    try {
      await apiRequest("/api/wallet/payouts", {
        method: "POST",
        body: JSON.stringify({
          amountCents: amountToCents(amount),
          description: "Saque solicitado pelo dashboard",
        }),
      });
      form.reset();
      setSuccess("Saque solicitado. A operação vai processar o payout.");
      await loadPayments();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao solicitar saque.",
      );
    }
  }

  async function updatePayoutStatus(payoutId: string, status: string) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/admin/payouts/${payoutId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setSuccess("Payout atualizado.");
      await loadPayments();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao atualizar payout.",
      );
    }
  }

  function confirmSensitive(action: PendingConfirmation) {
    setConfirmation(action);
  }

  async function reprocessWebhook(webhookId: string) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/admin/payment-webhooks/${webhookId}/reprocess`, {
        method: "POST",
      });
      setSuccess("Webhook reprocessado.");
      await loadPayments();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao reprocessar webhook.",
      );
    }
  }

  async function updateSplit(
    splitId: string,
    action: "release" | "refund" | "unblock",
  ) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/payments/splits/${splitId}/${action}`, {
        method: "POST",
      });
      setSuccess("Split atualizado.");
      await loadPayments();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao atualizar split.",
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
      setSuccess("Pagamento liberado para o profissional.");
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
      const result = await apiRequest<{
        reminders: { sent: number };
        releases: { released: number; eligible: number };
      }>("/api/payments/process-due-releases", { method: "POST" });
      setSuccess(
        `${result.releases.released} repasse(s) liberado(s) de ${result.releases.eligible} elegível(is). ${result.reminders.sent} lembrete(s) enviado(s).`,
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

  function confirmContractStatus(contract: Contract, status: string) {
    const label =
      contractActionLabels[status as keyof typeof contractActionLabels] ??
      "Atualizar";
    const description =
      contractActionDescriptions[
        status as keyof typeof contractActionDescriptions
      ] ?? "O status do contrato será atualizado.";

    confirmSensitive({
      confirmLabel: label,
      description,
      onConfirm: () => void updateContractStatus(contract.id, status),
      title: `${label} contrato?`,
    });
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
                  <strong>{formatTransactionType(transaction.type)}</strong>
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
            <form className="form compact" onSubmit={requestPayout}>
              <Field label="Solicitar saque">
                <input
                  min="1"
                  name="amount"
                  placeholder="250,00"
                  required
                  step="0.01"
                  type="number"
                />
              </Field>
              <button className="primary-button" type="submit">
                Solicitar saque
              </button>
            </form>
            {wallet?.payouts?.slice(0, 5).map((payout) => (
              <div className="list-row" key={payout.id}>
                <div>
                  <strong>Saque</strong>
                  <span>{formatPaymentStatus(payout.status)}</span>
                </div>
                <small>{formatCurrency(payout.amountCents)}</small>
              </div>
            ))}
            {wallet?.transactions?.map((transaction) => (
              <div className="list-row" key={transaction.id}>
                <div>
                  <strong>{formatTransactionType(transaction.type)}</strong>
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
              <p>Pagamento(s) aguardando liberação para o profissional.</p>
              <button
                className="primary-button full"
                onClick={() =>
                  confirmSensitive({
                    confirmLabel: "Processar",
                    description:
                      "Os repasses vencidos elegíveis serão liberados e lembretes pendentes poderão ser enviados.",
                    onConfirm: () => void processDueReleases(),
                    title: "Processar repasses vencidos?",
                  })
                }
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
                    <strong>{payment.event?.name ?? "Pagamento"}</strong>
                    <span>
                      {payment.company?.companyName ?? "Empresa"} -{" "}
                      {payment.splits?.length ?? 0} profissional(is)
                    </span>
                    <span>
                      Cobrado{" "}
                      {formatCurrency(
                        payment.amountToChargeCompanyCents ??
                          payment.grossAmountCents,
                      )}{" "}
                      - repasse{" "}
                      {formatCurrency(
                        payment.totalFreelancerAmountCents ??
                          payment.freelancerNetAmountCents ??
                          payment.freelancerAmountCents,
                      )}{" "}
                      - plataforma{" "}
                      {formatCurrency(
                        payment.platformAmountCents ?? payment.platformFeeCents,
                      )}{" "}
                      - {formatPaymentStatus(payment.status)}
                    </span>
                    <span>
                      Taxa empresa{" "}
                      {formatCurrency(
                        payment.companyFeeAmountCents ??
                          payment.platformFeeCents,
                      )}{" "}
                      - desconto profissional{" "}
                      {formatCurrency(payment.freelancerFeeAmountCents ?? 0)} -
                      gateway{" "}
                      {formatCurrency(payment.gatewayFeeAmountCents ?? 0)}
                    </span>
                    {payment.splits?.map((split) => (
                      <div className="split-row" key={split.id}>
                        <span>
                          {split.freelancer?.displayName ?? "Profissional"}:{" "}
                          {formatCurrency(split.freelancerNetAmountCents)} -{" "}
                          {formatPaymentStatus(split.releaseStatus)}
                        </span>
                        <span>
                          Bruto {formatCurrency(split.grossAmountCents)} - taxas{" "}
                          {formatCurrency(split.platformFeeAmountCents)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="row-actions">
                    <Link
                      className="icon-action"
                      href={`/dashboard/pagamentos/${payment.id}`}
                    >
                      Detalhes
                    </Link>
                    {payment.checkoutUrl ? (
                      <Link className="icon-action" href={payment.checkoutUrl}>
                        Checkout
                      </Link>
                    ) : null}
                    {payment.status === "PAID" ? (
                      <button
                        className="icon-action"
                        onClick={() =>
                          confirmSensitive({
                            confirmLabel: "Liberar",
                            description:
                              "Os repasses elegíveis deste pagamento serão enviados para as carteiras dos profissionais.",
                            onConfirm: () => void releasePayment(payment.id),
                            title: "Liberar repasses?",
                          })
                        }
                        type="button"
                      >
                        Liberar todos
                      </button>
                    ) : null}
                  </div>
                  {payment.splits?.length ? (
                    <div className="row-actions split-actions">
                      {payment.splits.map((split) => (
                        <SplitActions
                          key={split.id}
                          onUpdate={(splitId, action) =>
                            confirmSensitive({
                              confirmLabel: splitActionLabels[action],
                              description: splitActionDescriptions[action],
                              onConfirm: () => void updateSplit(splitId, action),
                              title: `${splitActionLabels[action]} split?`,
                            })
                          }
                          split={split}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </ListPanel>

            <ListPanel icon={<CreditCard size={18} />} title="Webhooks">
              {webhooks.length ? (
                webhooks.map((webhook) => (
                  <div className="list-row" key={webhook.id}>
                    <div>
                      <strong>{webhook.eventType}</strong>
                      <span>
                        {webhook.gateway} - {webhook.gatewayEventId}
                      </span>
                      <span>
                        {webhook.processed ? "Processado" : "Pendente"} -{" "}
                        {new Date(webhook.createdAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <button
                      className="icon-action"
                      onClick={() =>
                        confirmSensitive({
                          confirmLabel: "Reprocessar",
                          description:
                            "O payload salvo será aplicado novamente e pode alterar status financeiro do pagamento.",
                          onConfirm: () => void reprocessWebhook(webhook.id),
                          title: "Reprocessar webhook?",
                        })
                      }
                      type="button"
                    >
                      Reprocessar
                    </button>
                  </div>
                ))
              ) : (
                <EmptyState>Nenhum webhook recebido.</EmptyState>
              )}
            </ListPanel>

            <ListPanel icon={<Wallet size={18} />} title="Payouts">
              {payouts.length ? (
                payouts.map((payout) => (
                  <div className="list-row" key={payout.id}>
                    <div>
                      <strong>
                        {payout.freelancer?.displayName ?? "Freelancer"}
                      </strong>
                      <span>{formatPaymentStatus(payout.status)}</span>
                      <span>{new Date(payout.createdAt).toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="row-actions">
                      <small>{formatCurrency(payout.amountCents)}</small>
                      {["SCHEDULED", "PROCESSING"].includes(payout.status) ? (
                        <>
                          <button
                            className="icon-action"
                            onClick={() =>
                              confirmSensitive({
                                confirmLabel: "Pagar",
                                description:
                                  "O payout será marcado como pago no ambiente simulado.",
                                onConfirm: () =>
                                  void updatePayoutStatus(payout.id, "PAID"),
                                title: "Confirmar payout?",
                              })
                            }
                            type="button"
                          >
                            Pagar
                          </button>
                          <button
                            className="icon-action"
                            onClick={() =>
                              confirmSensitive({
                                confirmLabel: "Marcar falha",
                                description:
                                  "O payout será marcado como falho e o valor voltará para a carteira quando aplicável.",
                                onConfirm: () =>
                                  void updatePayoutStatus(payout.id, "FAILED"),
                                title: "Marcar payout como falho?",
                              })
                            }
                            type="button"
                          >
                            Falhar
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState>Nenhum payout solicitado.</EmptyState>
              )}
            </ListPanel>
          </>
        ) : (
          <>
            {session.user.role === "COMPANY" ? (
              <ListPanel
                icon={<BriefcaseBusiness size={18} />}
                title="Pagamentos por evento"
              >
                {payableEventGroups.length ? (
                  payableEventGroups.map((group) => (
                    <div className="list-row" key={group.eventId}>
                      <div>
                        <strong>{group.event?.name ?? "Evento"}</strong>
                        <span>
                          {group.contracts.length} contrato(s) pendente(s) -
                          total {formatCurrency(eventTotal(group.contracts))}
                        </span>
                        <span>
                          Profissionais:{" "}
                          {group.contracts
                            .map(
                              (contract) =>
                                contract.freelancer?.displayName ??
                                "Profissional",
                            )
                            .join(", ")}
                        </span>
                        <span>
                          Saldo usado{" "}
                          {formatCurrency(
                            Math.min(
                              wallet?.balanceCents ?? 0,
                              eventTotal(group.contracts),
                            ),
                          )}{" "}
                          - complemento{" "}
                          {formatCurrency(
                            Math.max(
                              eventTotal(group.contracts) -
                                (wallet?.balanceCents ?? 0),
                              0,
                            ),
                          )}
                        </span>
                      </div>
                      <button
                        className="icon-action"
                        onClick={() =>
                          confirmSensitive({
                            confirmLabel: "Pagar evento",
                            description: `Confirmar pagamento de ${formatCurrency(eventTotal(group.contracts))} para ${group.contracts.length} contrato(s)?`,
                            onConfirm: () => void payEvent(group.eventId),
                            title: "Pagar evento?",
                          })
                        }
                        type="button"
                      >
                        Pagar evento
                      </button>
                    </div>
                  ))
                ) : (
                  <EmptyState>Nenhum evento aguardando pagamento.</EmptyState>
                )}
              </ListPanel>
            ) : null}

            <ListPanel icon={<BriefcaseBusiness size={18} />} title="Contratos">
              {contracts.map((contract) => (
                <div className="list-row" key={contract.id}>
                  <div>
                    <strong>{contract.event?.name ?? "Contrato"}</strong>
                    <span>
                      {formatCurrency(contract.amountCents)} -{" "}
                      {formatContractStatus(contract.status)}
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
                        onClick={() =>
                          confirmSensitive({
                            confirmLabel: "Pagar",
                            description: `Confirmar pagamento de ${formatCurrency(contractTotal(contract))} para este contrato?`,
                            onConfirm: () => void payContract(contract.id),
                            title: "Pagar contrato?",
                          })
                        }
                        type="button"
                      >
                        Pagar
                      </button>
                    ) : null}
                    <ContractStatusActions
                      contract={contract}
                      role={session.user.role}
                      onUpdate={confirmContractStatus}
                    />
                  </div>
                </div>
              ))}
            </ListPanel>

            <ListPanel icon={<CreditCard size={18} />} title="Pagamentos">
              {payments.map((payment) => (
                <div className="list-row" key={payment.id}>
                  <div>
                    <strong>{payment.event?.name ?? "Pagamento"}</strong>
                    <span>
                      Cobrado{" "}
                      {formatCurrency(
                        payment.amountToChargeCompanyCents ??
                          payment.grossAmountCents,
                      )}{" "}
                      - repasse{" "}
                      {formatCurrency(
                        payment.totalFreelancerAmountCents ??
                          payment.freelancerNetAmountCents ??
                          payment.freelancerAmountCents,
                      )}{" "}
                      - {formatPaymentStatus(payment.status)}
                    </span>
                    <span>
                      Carteira {formatCurrency(payment.walletAmountCents ?? 0)}{" "}
                      - complemento gateway{" "}
                      {formatCurrency(payment.gatewayAmountCents ?? 0)}
                    </span>
                    {payment.splits?.map((split) => (
                      <span key={split.id}>
                        {split.contract?.freelancer?.displayName ??
                          split.freelancer?.displayName ??
                          "Profissional"}
                        : {formatCurrency(split.freelancerNetAmountCents)} -{" "}
                        {formatPaymentStatus(split.releaseStatus)}
                      </span>
                    ))}
                  </div>
                  {payment.checkoutUrl ? (
                    <Link className="icon-action" href={payment.checkoutUrl}>
                      Abrir checkout
                    </Link>
                  ) : null}
                </div>
              ))}
            </ListPanel>
          </>
        )}
      </section>
      <ConfirmationDialog
        confirmLabel={confirmation?.confirmLabel}
        description={confirmation?.description ?? ""}
        isOpen={Boolean(confirmation)}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          const action = confirmation?.onConfirm;
          setConfirmation(null);
          action?.();
        }}
        title={confirmation?.title ?? ""}
      />
    </DashboardShell>
  );
}

function formatTransactionType(type: string) {
  return transactionTypeLabels[type] ?? type;
}

function formatContractStatus(status: string) {
  return contractStatusLabels[status] ?? status;
}

function formatPaymentStatus(status: string) {
  return paymentStatusLabels[status] ?? status;
}

function eventTotal(contracts: Contract[]) {
  return contracts.reduce(
    (total, contract) =>
      total + contract.amountCents + contract.platformFeeCents,
    0,
  );
}

function amountToCents(amount: number) {
  return Math.round(amount * 100);
}

function ContractStatusActions({
  contract,
  onUpdate,
  role,
}: Readonly<{
  contract: Contract;
  onUpdate: (contract: Contract, status: string) => void;
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
          onClick={() => onUpdate(contract, "COMPLETED")}
          type="button"
        >
          Concluir
        </button>
      ) : null}
      {role === "COMPANY" && canFinish ? (
        <button
          className="icon-action ghost"
          onClick={() => onUpdate(contract, "NO_SHOW")}
          type="button"
        >
          Marcar ausência
        </button>
      ) : null}
      {canCancel ? (
        <button
          className="icon-action ghost"
          onClick={() => onUpdate(contract, "CANCELLED")}
          type="button"
        >
          Cancelar
        </button>
      ) : null}
    </>
  );
}

function SplitActions({
  onUpdate,
  split,
}: Readonly<{
  onUpdate: (splitId: string, action: "release" | "refund" | "unblock") => void;
  split: NonNullable<Payment["splits"]>[number];
}>) {
  const canRelease = split.releaseStatus === "WAITING_RELEASE";
  const canRefund = !["PAID", "REFUNDED"].includes(split.releaseStatus);
  const canUnblock = split.releaseStatus === "BLOCKED";
  const label = split.freelancer?.displayName ?? "Split";

  if (!canRelease && !canRefund && !canUnblock) {
    return null;
  }

  return (
    <div className="split-action-group">
      <small>{label}</small>
      {canRelease ? (
        <button
          className="icon-action"
          onClick={() => onUpdate(split.id, "release")}
          type="button"
        >
          Liberar
        </button>
      ) : null}
      {canUnblock ? (
        <button
          className="icon-action"
          onClick={() => onUpdate(split.id, "unblock")}
          type="button"
        >
          Desbloquear
        </button>
      ) : null}
      {canRefund ? (
        <button
          className="icon-action ghost"
          onClick={() => onUpdate(split.id, "refund")}
          type="button"
        >
          Estornar
        </button>
      ) : null}
    </div>
  );
}
