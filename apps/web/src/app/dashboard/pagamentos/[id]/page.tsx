"use client";

import {
  ArrowLeft,
  CreditCard,
  History,
  RotateCcw,
  ShieldAlert,
  Split,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../../components/dashboard-shell";
import { ListPanel } from "../../../../components/dashboard-widgets";
import {
  ConfirmationDialog,
  EmptyState,
  StatusMessage,
} from "../../../../components/ui";
import { apiRequest, formatCurrency } from "../../../../lib/api";
import type {
  AuditLog,
  Contract,
  PaymentDetail,
  PaymentWebhookLog,
  Payout,
} from "../../../../lib/dashboard-types";

type SplitAction = "release" | "refund" | "unblock";
type PendingConfirmation = {
  confirmLabel?: string;
  description: string;
  onConfirm: () => void;
  title: string;
};
type PaymentSplitDetail = NonNullable<PaymentDetail["splits"]>[number] & {
  gatewayRecipientId?: string;
  gatewayWalletId?: string;
  freelancerFeeAmountCents?: number;
  gatewayFeeAmountCents?: number;
  payout?: Payout;
  contract?: Contract & {
    disputes?: Array<{
      id: string;
      reason: string;
      status: string;
      details?: string;
      createdAt: string;
    }>;
  };
};

const paymentStatusLabels: Record<string, string> = {
  AUTHORIZED: "Autorizado",
  CHARGEBACK: "Chargeback",
  CANCELLED: "Cancelado",
  DISPUTED: "Em contestação",
  FAILED: "Falhou",
  PAID: "Pago",
  PENDING: "Pendente",
  REFUNDED: "Estornado",
  RELEASED: "Liberado",
  WAITING_PAYMENT: "Aguardando pagamento",
  WAITING_RELEASE: "Aguardando liberação",
  BLOCKED: "Bloqueado",
  RESERVED: "Reservado",
};

const webhookActions = {
  chargeback: { event: "PAYMENT_CHARGEBACK", status: "CHARGEBACK" },
  refund: { event: "PAYMENT_REFUNDED", status: "REFUNDED" },
};

const splitActionLabels: Record<SplitAction, string> = {
  release: "Liberar",
  refund: "Estornar",
  unblock: "Desbloquear",
};

const splitActionDescriptions: Record<SplitAction, string> = {
  release:
    "O valor líquido do split será creditado na carteira do profissional.",
  refund:
    "O split será estornado e o contrato poderá voltar para pagamento pendente.",
  unblock:
    "O split bloqueado voltará para aguardando liberação, desde que a disputa já permita.",
};

export default function PaymentDetailPage() {
  const session = useRequiredSession();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmation, setConfirmation] =
    useState<PendingConfirmation | null>(null);

  const splits = useMemo(
    () => (payment?.splits ?? []) as PaymentSplitDetail[],
    [payment],
  );

  const loadPayment = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      setPayment(
        await apiRequest<PaymentDetail>(`/api/admin/payments/${params.id}`),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao carregar pagamento.",
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (session.user.role !== "ADMIN") {
      router.push("/dashboard/pagamentos");
      return;
    }

    void loadPayment();
  }, [loadPayment, router, session]);

  async function updateSplit(splitId: string, action: SplitAction) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/payments/splits/${splitId}/${action}`, {
        method: "POST",
      });
      setSuccess("Split atualizado.");
      await loadPayment();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao atualizar split.",
      );
    }
  }

  async function releaseAll() {
    if (!payment) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/payments/${payment.id}/release`, {
        method: "POST",
      });
      setSuccess("Repasses elegíveis liberados.");
      await loadPayment();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao liberar repasses.",
      );
    }
  }

  async function sendSimulatedWebhook(action: keyof typeof webhookActions) {
    if (!payment?.gatewayPaymentId) {
      setError("Pagamento sem identificador do gateway.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const data = webhookActions[action];
      await apiRequest("/api/payment-webhooks/simulated", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          gatewayEventId: `${payment.gatewayPaymentId}_${data.status}_${Date.now()}`,
          transactionId: payment.gatewayPaymentId,
        }),
      });
      setSuccess("Webhook simulado enviado.");
      await loadPayment();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao enviar webhook.",
      );
    }
  }

  async function reprocessWebhook(webhookId: string) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/admin/payment-webhooks/${webhookId}/reprocess`, {
        method: "POST",
      });
      setSuccess("Webhook reprocessado.");
      await loadPayment();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao reprocessar webhook.",
      );
    }
  }

  function confirmSensitive(action: PendingConfirmation) {
    setConfirmation(action);
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={loadPayment} />}
      eyebrow="ADMIN"
      title="Detalhe do pagamento"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando pagamento...</EmptyState> : null}

      <div className="button-row">
        <Link className="secondary-button" href="/dashboard/pagamentos">
          <ArrowLeft size={18} />
          Voltar
        </Link>
        {payment?.checkoutUrl ? (
          <Link className="secondary-button" href={payment.checkoutUrl}>
            <CreditCard size={18} />
            Checkout
          </Link>
        ) : null}
        {payment?.status === "PAID" ? (
          <button
            className="primary-button"
            onClick={() =>
              confirmSensitive({
                confirmLabel: "Liberar",
                description:
                  "Os repasses elegíveis deste pagamento serão enviados para as carteiras dos profissionais.",
                onConfirm: () => void releaseAll(),
                title: "Liberar repasses?",
              })
            }
            type="button"
          >
            <Wallet size={18} />
            Liberar elegíveis
          </button>
        ) : null}
      </div>

      {payment ? (
        <>
          <section className="metrics">
            <article className="metric">
              <span>Status</span>
              <strong>{formatStatus(payment.status)}</strong>
            </article>
            <article className="metric">
              <span>Cobrado</span>
              <strong>
                {formatCurrency(
                  payment.amountToChargeCompanyCents ?? payment.grossAmountCents,
                )}
              </strong>
            </article>
            <article className="metric">
              <span>Repasse líquido</span>
              <strong>
                {formatCurrency(
                  payment.totalFreelancerAmountCents ??
                    payment.freelancerNetAmountCents ??
                    payment.freelancerAmountCents,
                )}
              </strong>
            </article>
            <article className="metric">
              <span>Taxa NEXO</span>
              <strong>
                {formatCurrency(payment.platformAmountCents ?? payment.platformFeeCents)}
              </strong>
            </article>
          </section>

          <section className="dashboard-grid payment-detail-grid">
            <ListPanel icon={<CreditCard size={18} />} title="Resumo">
              <DetailRow label="Evento" value={payment.event?.name ?? "-"} />
              <DetailRow label="Empresa" value={payment.company?.companyName ?? "-"} />
              <DetailRow label="Gateway" value={payment.gateway ?? "simulated"} />
              <DetailRow
                label="ID gateway"
                value={payment.gatewayPaymentId ?? payment.gatewayTransactionId ?? "-"}
              />
              <DetailRow
                label="Carteira"
                value={formatCurrency(payment.walletAmountCents ?? 0)}
              />
              <DetailRow
                label="Complemento gateway"
                value={formatCurrency(payment.gatewayAmountCents ?? 0)}
              />
              <div className="button-row">
                <button
                  className="secondary-button"
                  disabled={payment.status === "REFUNDED"}
                  onClick={() =>
                    confirmSensitive({
                      confirmLabel: "Simular estorno",
                      description:
                        "O webhook de estorno será enviado e pode devolver valores pendentes para a empresa.",
                      onConfirm: () => void sendSimulatedWebhook("refund"),
                      title: "Simular estorno?",
                    })
                  }
                  type="button"
                >
                  <RotateCcw size={18} />
                  Simular estorno
                </button>
                <button
                  className="secondary-button"
                  disabled={payment.status === "CHARGEBACK"}
                  onClick={() =>
                    confirmSensitive({
                      confirmLabel: "Simular chargeback",
                      description:
                        "O webhook de chargeback será enviado e pode bloquear splits pendentes.",
                      onConfirm: () => void sendSimulatedWebhook("chargeback"),
                      title: "Simular chargeback?",
                    })
                  }
                  type="button"
                >
                  <ShieldAlert size={18} />
                  Simular chargeback
                </button>
              </div>
            </ListPanel>

            <ListPanel icon={<Split size={18} />} title="Splits">
              {splits.length ? (
                splits.map((split) => (
                  <div className="list-row payment-split-card" key={split.id}>
                    <div>
                      <strong>
                        {split.freelancer?.displayName ??
                          split.contract?.freelancer?.displayName ??
                          "Profissional"}
                      </strong>
                      <span>
                        {formatStatus(split.releaseStatus)} - contrato{" "}
                        {formatStatus(split.contract?.status ?? "-")}
                      </span>
                      <span>
                        Bruto {formatCurrency(split.grossAmountCents)} - liquido{" "}
                        {formatCurrency(split.freelancerNetAmountCents)} - taxas{" "}
                        {formatCurrency(split.platformFeeAmountCents)}
                      </span>
                      <span>
                        Recebedor {split.gatewayRecipientId ?? "-"} - carteira{" "}
                        {split.gatewayWalletId ?? "-"}
                      </span>
                      {split.contract?.disputes?.length ? (
                        <span>
                          Contestação:{" "}
                          {split.contract.disputes
                            .map((dispute) => formatStatus(dispute.status))
                            .join(", ")}
                        </span>
                      ) : null}
                      {split.payout ? (
                        <span>
                          Payout {formatStatus(split.payout.status)} -{" "}
                          {formatCurrency(split.payout.amountCents)}
                        </span>
                      ) : null}
                    </div>
                    <SplitActions
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
                  </div>
                ))
              ) : (
                <EmptyState>Nenhum split encontrado.</EmptyState>
              )}
            </ListPanel>

            <ListPanel icon={<History size={18} />} title="Webhooks">
              {payment.webhooks?.length ? (
                payment.webhooks.map((webhook) => (
                  <WebhookRow
                    key={webhook.id}
                    onReprocess={(webhookId) =>
                      confirmSensitive({
                        confirmLabel: "Reprocessar",
                        description:
                          "O payload salvo será aplicado novamente e pode alterar status financeiro do pagamento.",
                        onConfirm: () => void reprocessWebhook(webhookId),
                        title: "Reprocessar webhook?",
                      })
                    }
                    webhook={webhook}
                  />
                ))
              ) : (
                <EmptyState>Nenhum webhook relacionado.</EmptyState>
              )}
            </ListPanel>

            <ListPanel icon={<History size={18} />} title="Auditoria">
              {payment.auditLogs?.length ? (
                payment.auditLogs.map((log) => (
                  <AuditRow key={log.id} log={log} />
                ))
              ) : (
                <EmptyState>Nenhum log encontrado.</EmptyState>
              )}
            </ListPanel>
          </section>
        </>
      ) : null}
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

function DetailRow({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SplitActions({
  onUpdate,
  split,
}: Readonly<{
  onUpdate: (splitId: string, action: SplitAction) => void;
  split: PaymentSplitDetail;
}>) {
  const canRelease = split.releaseStatus === "WAITING_RELEASE";
  const canRefund = !["PAID", "REFUNDED"].includes(split.releaseStatus);
  const canUnblock = split.releaseStatus === "BLOCKED";

  return (
    <div className="row-actions">
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

function WebhookRow({
  onReprocess,
  webhook,
}: Readonly<{
  onReprocess: (webhookId: string) => void;
  webhook: PaymentWebhookLog;
}>) {
  return (
    <div className="list-row">
      <div>
        <strong>{webhook.eventType}</strong>
        <span>
          {webhook.gateway} - {webhook.gatewayEventId}
        </span>
        <span>
          {webhook.processed ? "Processado" : "Pendente"} -{" "}
          {formatDate(webhook.createdAt)}
        </span>
      </div>
      <button
        className="icon-action"
        onClick={() => onReprocess(webhook.id)}
        type="button"
      >
        Reprocessar
      </button>
    </div>
  );
}

function AuditRow({ log }: Readonly<{ log: AuditLog }>) {
  return (
    <div className="list-row">
      <div>
        <strong>{formatAuditAction(log.action)}</strong>
        <span>
          {log.entity}
          {log.entityId ? ` - ${log.entityId}` : ""}
        </span>
        <span>
          {log.user?.name ?? "Sistema"} - {formatDate(log.createdAt)}
        </span>
        {log.metadata ? <code>{formatMetadata(log.metadata)}</code> : null}
      </div>
    </div>
  );
}

function formatStatus(status: string) {
  return paymentStatusLabels[status] ?? status;
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("pt-BR");
}

function formatAuditAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMetadata(metadata: unknown) {
  try {
    return JSON.stringify(metadata);
  } catch {
    return String(metadata);
  }
}
