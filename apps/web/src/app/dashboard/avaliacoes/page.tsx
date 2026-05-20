"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Star } from "lucide-react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { ListPanel } from "../../../components/dashboard-widgets";
import { EmptyState, Field, StatusMessage } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import type { Contract, Review } from "../../../lib/dashboard-types";

const reviewableStatuses = new Set(["PAID", "COMPLETED"]);

export default function ReviewsPage() {
  const session = useRequiredSession();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const reviewableContracts = useMemo(
    () =>
      contracts.filter((contract) => reviewableStatuses.has(contract.status)),
    [contracts],
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadReviews();
  }, [session]);

  async function loadReviews() {
    setError("");
    setLoading(true);

    try {
      if (session?.user.role === "ADMIN") {
        setContracts([]);
        setReviews([]);
        return;
      }

      const [loadedContracts, loadedReviews] = await Promise.all([
        apiRequest<Contract[]>("/api/contracts"),
        apiRequest<Review[]>("/api/reviews"),
      ]);
      setContracts(loadedContracts);
      setReviews(loadedReviews);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao carregar avaliações.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const rating = Number(form.get("overallRating"));
    const role = session?.user.role;
    setError("");
    setSuccess("");

    const basePayload = {
      contractId: String(form.get("contractId")),
      overallRating: rating,
      comment: String(form.get("comment")),
    };

    const rolePayload =
      role === "COMPANY"
        ? {
            punctuality: rating,
            technicalQuality: rating,
            professionalPosture: rating,
            communication: rating,
          }
        : {
            organization: rating,
            informationClarity: rating,
            payment: rating,
            professionalTreatment: rating,
          };

    try {
      await apiRequest("/api/reviews", {
        method: "POST",
        body: JSON.stringify({ ...basePayload, ...rolePayload }),
      });
      formElement.reset();
      setSuccess("Avaliação enviada.");
      await loadReviews();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao enviar avaliação.",
      );
    }
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={loadReviews} />}
      eyebrow={session.user.role}
      title="Avaliações"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando avaliações...</EmptyState> : null}

      {session.user.role === "ADMIN" ? (
        <EmptyState>
          Avaliações são criadas por empresas e freelancers após contratos pagos
          ou concluídos.
        </EmptyState>
      ) : (
        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Nova avaliação</h2>
              <Star size={18} />
            </div>
            <form className="form compact" onSubmit={handleCreateReview}>
              <Field label="Contrato">
                <select name="contractId" required>
                  <option value="" disabled>
                    Selecione um contrato
                  </option>
                  {reviewableContracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.event?.name ?? "Contrato"} - {contract.status}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nota geral">
                <select name="overallRating" required>
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Comentário">
                <input name="comment" placeholder="Resumo da experiência" />
              </Field>
              <button
                className="primary-button full"
                disabled={!reviewableContracts.length}
                type="submit"
              >
                Enviar avaliação
              </button>
            </form>
          </article>

          <ListPanel icon={<BriefcaseBusiness size={18} />} title="Histórico">
            {reviews.map((review) => (
              <div className="list-row" key={review.id}>
                <div>
                  <strong>{review.contract?.event?.name ?? "Avaliação"}</strong>
                  <span>
                    Nota {review.overallRating} -{" "}
                    {review.comment || "Sem comentário"}
                  </span>
                </div>
                <small>
                  {new Date(review.createdAt).toLocaleDateString("pt-BR")}
                </small>
              </div>
            ))}
          </ListPanel>
        </section>
      )}
    </DashboardShell>
  );
}
