"use client";

import { CheckCircle2, CreditCard, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, StatusMessage } from "../../../../components/ui";
import { formatCurrency, publicApiRequest } from "../../../../lib/api";
import type { Payment } from "../../../../lib/dashboard-types";

const webhookEvents = {
  approve: { event: "PAYMENT_APPROVED", status: "PAID" },
  cancel: { event: "PAYMENT_FAILED", status: "CANCELLED" },
  fail: { event: "PAYMENT_FAILED", status: "FAILED" },
};

export default function SimulatedCheckoutPage() {
  const params = useParams<{ gatewayPaymentId: string }>();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const loadPayment = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      setPayment(
        await publicApiRequest<Payment>(
          `/api/payment-webhooks/simulated/checkout/${params.gatewayPaymentId}`,
        ),
      );
    } catch {
      setError("Checkout simulado não encontrado.");
    } finally {
      setLoading(false);
    }
  }, [params.gatewayPaymentId]);

  useEffect(() => {
    void loadPayment();
  }, [loadPayment]);

  async function sendWebhook(action: keyof typeof webhookEvents) {
    setError("");
    setSuccess("");

    try {
      const data = webhookEvents[action];
      await publicApiRequest("/api/payment-webhooks/simulated", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          gatewayEventId: `${params.gatewayPaymentId}_${data.status}`,
          transactionId: params.gatewayPaymentId,
        }),
      });
      setSuccess("Webhook simulado enviado.");
      await loadPayment();
    } catch {
      setError("Erro ao enviar webhook simulado.");
    }
  }

  return (
    <main className="auth-shell checkout-shell">
      <section className="auth-card checkout-card">
        <p className="eyebrow">Checkout simulado</p>
        <h1>Pagamento NEXO</h1>
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? (
          <StatusMessage type="success">{success}</StatusMessage>
        ) : null}
        {loading ? <EmptyState>Carregando checkout...</EmptyState> : null}

        {payment ? (
          <div className="checkout-summary">
            <div className="wallet-preview">
              <div>
                <span>{payment.event?.name ?? "Evento"}</span>
                <strong>
                  {formatCurrency(
                    payment.amountToChargeCompanyCents ??
                      payment.grossAmountCents,
                  )}
                </strong>
              </div>
              <CreditCard size={22} />
            </div>
            <div className="payment-timeline">
              <div>
                <span>Status</span>
                <strong>{payment.status}</strong>
              </div>
              <div>
                <span>Carteira</span>
                <strong>{formatCurrency(payment.walletAmountCents ?? 0)}</strong>
              </div>
              <div>
                <span>Gateway</span>
                <strong>{formatCurrency(payment.gatewayAmountCents ?? 0)}</strong>
              </div>
            </div>
            <div className="list">
              {payment.splits?.map((split) => (
                <div className="list-row" key={split.id}>
                  <div>
                    <strong>
                      {split.freelancer?.displayName ??
                        split.contract?.freelancer?.displayName ??
                        "Profissional"}
                    </strong>
                    <span>{split.releaseStatus}</span>
                  </div>
                  <small>{formatCurrency(split.freelancerNetAmountCents)}</small>
                </div>
              ))}
            </div>
            <div className="button-row">
              <button
                className="primary-button"
                disabled={payment.status === "PAID"}
                onClick={() => sendWebhook("approve")}
                type="button"
              >
                <CheckCircle2 size={18} />
                Aprovar
              </button>
              <button
                className="secondary-button"
                disabled={payment.status === "PAID"}
                onClick={() => sendWebhook("fail")}
                type="button"
              >
                <XCircle size={18} />
                Falhar
              </button>
              <button
                className="secondary-button"
                disabled={payment.status === "PAID"}
                onClick={() => sendWebhook("cancel")}
                type="button"
              >
                Cancelar
              </button>
            </div>
            <Link className="secondary-button full" href="/dashboard/pagamentos">
              Voltar ao dashboard
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
