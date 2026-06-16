"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, FileText, UserCheck } from "lucide-react";
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
import { apiFileRequest, apiRequest, formatCurrency } from "../../../lib/api";
import type {
  AdminCompany,
  AdminFreelancer,
  VerificationStatus,
} from "../../../lib/dashboard-types";

const statusLabels: Record<VerificationStatus, string> = {
  PENDING: "Pendente",
  VERIFIED: "Verificado",
  REJECTED: "Reprovado",
};

type RejectionTarget = {
  id: string;
  kind: "company" | "freelancer";
  name: string;
};

export default function VerificationsPage() {
  const session = useRequiredSession();
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [freelancers, setFreelancers] = useState<AdminFreelancer[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [rejectionTarget, setRejectionTarget] =
    useState<RejectionTarget | null>(null);

  const pendingCompanies = useMemo(
    () =>
      companies.filter((company) => company.verificationStatus === "PENDING"),
    [companies],
  );
  const pendingFreelancers = useMemo(
    () =>
      freelancers.filter(
        (freelancer) => freelancer.verificationStatus === "PENDING",
      ),
    [freelancers],
  );

  const loadVerifications = useCallback(async () => {
    setError("");
    setLoading(true);

    if (session?.user.role !== "ADMIN") {
      setLoading(false);
      return;
    }

    try {
      const [loadedCompanies, loadedFreelancers] = await Promise.all([
        apiRequest<AdminCompany[]>("/api/admin/companies"),
        apiRequest<AdminFreelancer[]>("/api/admin/freelancers"),
      ]);
      setCompanies(loadedCompanies);
      setFreelancers(loadedFreelancers);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao carregar verificações.",
      );
    } finally {
      setLoading(false);
    }
  }, [session?.user.role]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadVerifications();
  }, [loadVerifications, session]);

  async function updateCompanyStatus(
    companyId: string,
    status: VerificationStatus,
    message?: string,
  ) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/admin/companies/${companyId}/verification`, {
        method: "PATCH",
        body: JSON.stringify({ message, status }),
      });
      setSuccess("Status da empresa atualizado.");
      await loadVerifications();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao atualizar empresa.",
      );
    }
  }

  async function updateFreelancerStatus(
    freelancerId: string,
    status: VerificationStatus,
    message?: string,
  ) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/admin/freelancers/${freelancerId}/verification`, {
        method: "PATCH",
        body: JSON.stringify({ message, status }),
      });
      setSuccess("Status do profissional atualizado.");
      await loadVerifications();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao atualizar profissional.",
      );
    }
  }

  async function openDocument(documentId: string) {
    setError("");

    try {
      const blob = await apiFileRequest(`/api/documents/${documentId}/file`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao abrir documento.",
      );
    }
  }

  function openRejectionDialog(target: RejectionTarget) {
    setError("");
    setSuccess("");
    setRejectionTarget(target);
    setRejectionMessage(
      "Não conseguimos validar os documentos enviados. Por favor, envie uma nova versão legível, completa e dentro do prazo de validade.",
    );
  }

  async function confirmRejection() {
    const message = rejectionMessage.trim();

    if (!rejectionTarget || !message) {
      setError("Informe uma mensagem explicando o que precisa ser corrigido.");
      return;
    }

    if (rejectionTarget.kind === "company") {
      await updateCompanyStatus(rejectionTarget.id, "REJECTED", message);
    } else {
      await updateFreelancerStatus(rejectionTarget.id, "REJECTED", message);
    }

    setRejectionTarget(null);
    setRejectionMessage("");
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={loadVerifications} />}
      eyebrow={session.user.role}
      title="Verificações"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando verificações...</EmptyState> : null}

      {session.user.role !== "ADMIN" ? (
        <EmptyState>
          Esta área é reservada para a operação administrativa da NEXO.
        </EmptyState>
      ) : (
        <>
          <section className="metrics">
            <div className="metric">
              <span>Empresas pendentes</span>
              <strong>{pendingCompanies.length}</strong>
            </div>
            <div className="metric">
              <span>Profissionais pendentes</span>
              <strong>{pendingFreelancers.length}</strong>
            </div>
            <div className="metric">
              <span>Empresas verificadas</span>
              <strong>
                {
                  companies.filter(
                    (company) => company.verificationStatus === "VERIFIED",
                  ).length
                }
              </strong>
            </div>
            <div className="metric">
              <span>Profissionais verificados</span>
              <strong>
                {
                  freelancers.filter(
                    (freelancer) =>
                      freelancer.verificationStatus === "VERIFIED",
                  ).length
                }
              </strong>
            </div>
          </section>

          <section className="dashboard-grid">
            <ListPanel icon={<Building2 size={18} />} title="Empresas">
              {companies.length ? (
                companies.map((company) => (
                  <div className="list-row" key={company.id}>
                    <div>
                      <strong>{company.companyName}</strong>
                      <span>
                        {company.document ?? "Documento não informado"} -{" "}
                        {company.city ?? "Cidade não informada"}
                        {company.state ? `/${company.state}` : ""} -{" "}
                        {statusLabels[company.verificationStatus]}
                      </span>
                      <span>
                        Responsável: {company.responsibleName} -{" "}
                        {company.user?.email ?? company.email}
                      </span>
                      <DocumentSummary
                        documents={company.verificationDocuments ?? []}
                        onOpenDocument={openDocument}
                      />
                    </div>
                    <VerificationActions
                      currentStatus={company.verificationStatus}
                      hasDocuments={Boolean(
                        company.verificationDocuments?.length,
                      )}
                      onApprove={() =>
                        updateCompanyStatus(company.id, "VERIFIED")
                      }
                      onReject={() =>
                        openRejectionDialog({
                          id: company.id,
                          kind: "company",
                          name: company.companyName,
                        })
                      }
                      onReset={() => updateCompanyStatus(company.id, "PENDING")}
                    />
                  </div>
                ))
              ) : (
                <EmptyState>Nenhuma empresa cadastrada.</EmptyState>
              )}
            </ListPanel>

            <ListPanel icon={<UserCheck size={18} />} title="Profissionais">
              {freelancers.length ? (
                freelancers.map((freelancer) => (
                  <div className="list-row" key={freelancer.id}>
                    <div>
                      <strong>
                        {freelancer.displayName ??
                          freelancer.user?.name ??
                          "Profissional"}
                      </strong>
                      <span>
                        {freelancer.city ?? "Cidade não informada"}
                        {freelancer.state ? `/${freelancer.state}` : ""} -{" "}
                        {formatCurrency(freelancer.dailyRateCents)} -{" "}
                        {statusLabels[freelancer.verificationStatus]}
                      </span>
                      <span>
                        {(freelancer.skills ?? [])
                          .map(({ skill }) => skill.name)
                          .join(", ") || "Especialidades não informadas"}
                      </span>
                      <DocumentSummary
                        documents={freelancer.verificationDocuments ?? []}
                        onOpenDocument={openDocument}
                      />
                    </div>
                    <VerificationActions
                      currentStatus={freelancer.verificationStatus}
                      hasDocuments={Boolean(
                        freelancer.verificationDocuments?.length,
                      )}
                      onApprove={() =>
                        updateFreelancerStatus(freelancer.id, "VERIFIED")
                      }
                      onReject={() =>
                        openRejectionDialog({
                          id: freelancer.id,
                          kind: "freelancer",
                          name:
                            freelancer.displayName ??
                            freelancer.user?.name ??
                            "Profissional",
                        })
                      }
                      onReset={() =>
                        updateFreelancerStatus(freelancer.id, "PENDING")
                      }
                    />
                  </div>
                ))
              ) : (
                <EmptyState>Nenhum profissional cadastrado.</EmptyState>
              )}
            </ListPanel>
          </section>
        </>
      )}
      <ConfirmationDialog
        confirmLabel="Reprovar e notificar"
        dangerous
        description={
          <div className="form compact modal-form">
            <p className="modal-copy">
              Escreva a orientação que será enviada para{" "}
              <strong>{rejectionTarget?.name}</strong>. Use a mensagem para
              pedir um novo envio quando o arquivo estiver ilegível, incompleto
              ou divergente dos dados cadastrados.
            </p>
            <Field label="Mensagem para o usuário">
              <textarea
                onChange={(event) => setRejectionMessage(event.target.value)}
                rows={5}
                value={rejectionMessage}
              />
            </Field>
          </div>
        }
        isOpen={Boolean(rejectionTarget)}
        onCancel={() => {
          setRejectionTarget(null);
          setRejectionMessage("");
        }}
        onConfirm={confirmRejection}
        title="Reprovar verificação?"
      />
    </DashboardShell>
  );
}

function DocumentSummary({
  documents,
  onOpenDocument,
}: Readonly<{
  documents: Array<{
    id: string;
    category: string;
    originalName: string;
    sizeBytes: number;
  }>;
  onOpenDocument: (documentId: string) => void;
}>) {
  if (!documents.length) {
    return (
      <span className="inline-note">
        <FileText size={14} /> Sem documentos enviados
      </span>
    );
  }

  return (
    <div className="document-links">
      {documents.map((document) => (
        <button
          className="inline-link-button"
          key={document.id}
          onClick={() => onOpenDocument(document.id)}
          type="button"
        >
          <FileText size={14} />
          {document.originalName}
        </button>
      ))}
    </div>
  );
}

function VerificationActions({
  currentStatus,
  hasDocuments,
  onApprove,
  onReject,
  onReset,
}: Readonly<{
  currentStatus: VerificationStatus;
  hasDocuments: boolean;
  onApprove: () => void;
  onReject: () => void;
  onReset: () => void;
}>) {
  return (
    <div className="row-actions">
      <button
        className="icon-action"
        disabled={currentStatus === "VERIFIED" || !hasDocuments}
        onClick={onApprove}
        title={
          !hasDocuments
            ? "Envie ao menos um documento antes de aprovar."
            : undefined
        }
        type="button"
      >
        Aprovar
      </button>
      <button
        className="icon-action ghost"
        disabled={currentStatus === "REJECTED"}
        onClick={onReject}
        type="button"
      >
        Reprovar
      </button>
      {currentStatus !== "PENDING" ? (
        <button className="icon-action ghost" onClick={onReset} type="button">
          Revisar
        </button>
      ) : null}
    </div>
  );
}
