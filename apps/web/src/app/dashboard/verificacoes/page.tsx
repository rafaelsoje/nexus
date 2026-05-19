"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, ShieldCheck, UserCheck } from "lucide-react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { ListPanel } from "../../../components/dashboard-widgets";
import { EmptyState, StatusMessage } from "../../../components/ui";
import { apiRequest, formatCurrency } from "../../../lib/api";
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

export default function VerificationsPage() {
  const session = useRequiredSession();
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [freelancers, setFreelancers] = useState<AdminFreelancer[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const pendingCompanies = useMemo(
    () => companies.filter((company) => company.verificationStatus === "PENDING"),
    [companies],
  );
  const pendingFreelancers = useMemo(
    () =>
      freelancers.filter(
        (freelancer) => freelancer.verificationStatus === "PENDING",
      ),
    [freelancers],
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadVerifications();
  }, [session]);

  async function loadVerifications() {
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
  }

  async function updateCompanyStatus(
    companyId: string,
    status: VerificationStatus,
  ) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/admin/companies/${companyId}/verification`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setSuccess("Status da empresa atualizado.");
      await loadVerifications();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao atualizar empresa.",
      );
    }
  }

  async function updateFreelancerStatus(
    freelancerId: string,
    status: VerificationStatus,
  ) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/admin/freelancers/${freelancerId}/verification`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
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
                    </div>
                    <VerificationActions
                      currentStatus={company.verificationStatus}
                      onApprove={() =>
                        updateCompanyStatus(company.id, "VERIFIED")
                      }
                      onReject={() => updateCompanyStatus(company.id, "REJECTED")}
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
                    </div>
                    <VerificationActions
                      currentStatus={freelancer.verificationStatus}
                      onApprove={() =>
                        updateFreelancerStatus(freelancer.id, "VERIFIED")
                      }
                      onReject={() =>
                        updateFreelancerStatus(freelancer.id, "REJECTED")
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
    </DashboardShell>
  );
}

function VerificationActions({
  currentStatus,
  onApprove,
  onReject,
  onReset,
}: Readonly<{
  currentStatus: VerificationStatus;
  onApprove: () => void;
  onReject: () => void;
  onReset: () => void;
}>) {
  return (
    <div className="row-actions">
      <button
        className="icon-action"
        disabled={currentStatus === "VERIFIED"}
        onClick={onApprove}
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
