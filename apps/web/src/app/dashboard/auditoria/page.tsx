"use client";

import { ClipboardList, Search } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { ListPanel } from "../../../components/dashboard-widgets";
import {
  EmptyState,
  Field,
  PaginationControls,
  StatusMessage,
} from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import type { AuditLog } from "../../../lib/dashboard-types";

const logsPageSize = 20;

export default function AuditPage() {
  const session = useRequiredSession();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filters, setFilters] = useState({
    action: "",
    dateFrom: "",
    dateTo: "",
    entity: "",
    userId: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const metrics = useMemo(
    () => ({
      actions: new Set(logs.map((log) => log.action)).size,
      entities: new Set(logs.map((log) => log.entity)).size,
      system: logs.filter((log) => !log.user).length,
      total: logs.length,
    }),
    [logs],
  );
  const paginatedLogs = useMemo(
    () =>
      logs.slice(
        (currentPage - 1) * logsPageSize,
        currentPage * logsPageSize,
      ),
    [currentPage, logs],
  );

  const loadLogs = useCallback(async (nextFilters = filters) => {
    setError("");
    setLoading(true);

    if (session?.user.role !== "ADMIN") {
      setLoading(false);
      return;
    }

    try {
      const query = new URLSearchParams();

      for (const [key, value] of Object.entries(nextFilters)) {
        if (value.trim()) {
          query.set(key, normalizeAuditFilter(key, value.trim()));
        }
      }

      const suffix = query.toString() ? `?${query.toString()}` : "";
      setLogs(await apiRequest<AuditLog[]>(`/api/admin/audit-logs${suffix}`));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao carregar auditoria.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters, session?.user.role]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadLogs();
  }, [loadLogs, session]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(logs.length / logsPageSize));

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, logs.length]);

  function handleFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCurrentPage(1);
    void loadLogs();
  }

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={() => loadLogs()} />}
      eyebrow={session.user.role}
      title="Auditoria"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando auditoria...</EmptyState> : null}

      {session.user.role !== "ADMIN" ? (
        <EmptyState>
          Esta área é reservada para a operação administrativa da NEXO.
        </EmptyState>
      ) : (
        <>
          <section className="metrics">
            <article className="metric">
              <span>Logs</span>
              <strong>{metrics.total}</strong>
            </article>
            <article className="metric">
              <span>Ações</span>
              <strong>{metrics.actions}</strong>
            </article>
            <article className="metric">
              <span>Entidades</span>
              <strong>{metrics.entities}</strong>
            </article>
            <article className="metric">
              <span>Sistema</span>
              <strong>{metrics.system}</strong>
            </article>
          </section>

          <section className="dashboard-grid">
            <article className="panel report-panel">
              <div className="panel-header">
                <h2>Filtros</h2>
                <Search size={18} />
              </div>
              <form className="form compact" onSubmit={handleFilter}>
                <div className="form-grid filters-grid">
                  <Field label="Ação">
                    <input
                      onChange={(event) =>
                        updateFilter("action", event.target.value)
                      }
                      placeholder="Pagamento, disputa..."
                      value={filters.action}
                    />
                  </Field>
                  <Field label="Entidade">
                    <input
                      onChange={(event) =>
                        updateFilter("entity", event.target.value)
                      }
                      placeholder="Pagamento, contrato..."
                      value={filters.entity}
                    />
                  </Field>
                  <Field label="Usuário ID">
                    <input
                      onChange={(event) =>
                        updateFilter("userId", event.target.value)
                      }
                      placeholder="cuid do usuário"
                      value={filters.userId}
                    />
                  </Field>
                  <Field label="De">
                    <input
                      onChange={(event) =>
                        updateFilter("dateFrom", event.target.value)
                      }
                      type="date"
                      value={filters.dateFrom}
                    />
                  </Field>
                  <Field label="Até">
                    <input
                      onChange={(event) =>
                        updateFilter("dateTo", event.target.value)
                      }
                      type="date"
                      value={filters.dateTo}
                    />
                  </Field>
                </div>
                <div className="button-row">
                  <button className="primary-button" type="submit">
                    Filtrar
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      const empty = {
                        action: "",
                        dateFrom: "",
                        dateTo: "",
                        entity: "",
                        userId: "",
                      };
                      setFilters(empty);
                      setCurrentPage(1);
                      void loadLogs(empty);
                    }}
                    type="button"
                  >
                    Limpar
                  </button>
                </div>
              </form>
            </article>

            <ListPanel
              className="full-width-panel"
              icon={<ClipboardList size={18} />}
              title="Logs"
            >
              {logs.length ? (
                paginatedLogs.map((log) => (
                  <AuditLogRow key={log.id} log={log} />
                ))
              ) : (
                <EmptyState>Nenhum log encontrado.</EmptyState>
              )}
              <PaginationControls
                itemLabel="logs"
                onPageChange={setCurrentPage}
                page={currentPage}
                pageSize={logsPageSize}
                totalItems={logs.length}
              />
            </ListPanel>
          </section>
        </>
      )}
    </DashboardShell>
  );
}

function AuditLogRow({ log }: Readonly<{ log: AuditLog }>) {
  return (
    <div className="list-row audit-row">
      <div>
        <strong>{formatAuditAction(log.action)}</strong>
        <span>
          {formatAuditEntity(log.entity)}
          {log.entityId ? ` - ${log.entityId}` : ""}
        </span>
        <span>
          {log.user?.name ?? "Sistema"} - {formatDate(log.createdAt)}
        </span>
        {log.user ? (
          <span>
            {formatAuditRole(log.user.role)} - {log.user.email}
          </span>
        ) : null}
        {log.metadata ? <code>{formatMetadata(log.metadata)}</code> : null}
      </div>
    </div>
  );
}

const auditActionLabels: Record<string, string> = {
  ADMIN_ACCESS_UPDATED: "Acesso administrativo atualizado",
  ADMIN_GATEWAY_ACCOUNT_VIEWED: "Conta de recebimento visualizada pelo admin",
  ADMIN_GATEWAY_ACCOUNTS_LISTED: "Contas de recebimento listadas pelo admin",
  ADMIN_USER_CREATED: "Administrador criado",
  APPLICATION_CREATED: "Candidatura criada",
  APPLICATION_STATUS_UPDATED: "Status da candidatura atualizado",
  AUTO_PAYMENT_SPLIT_RELEASED: "Split de pagamento liberado automaticamente",
  COMPANY_VERIFICATION_UPDATED: "Verificação da empresa atualizada",
  DISPUTE_FINANCIAL_RESOLUTION_APPLIED:
    "Resolução financeira da contestação aplicada",
  DISPUTE_STATUS_UPDATED: "Status da contestação atualizado",
  EVENT_CANCELLED: "Evento cancelado",
  EVENT_CREATED: "Evento criado",
  EVENT_DELETED: "Evento excluído",
  EVENT_DUPLICATED: "Evento duplicado",
  EVENT_UPDATED: "Evento atualizado",
  FREELANCER_VERIFICATION_UPDATED: "Verificação do profissional atualizada",
  GATEWAY_ACCOUNT_CREATED: "Conta de recebimento criada",
  GATEWAY_ACCOUNT_ERROR: "Erro na conta de recebimento",
  GATEWAY_ACCOUNT_RECHECKED: "Conta de recebimento revalidada",
  INVITATION_ACCEPTED: "Convite aceito",
  INVITATION_CANCELLED: "Convite cancelado",
  INVITATION_CREATED: "Convite criado",
  INVITATION_DECLINED: "Convite recusado",
  PAYMENT_CREATED: "Pagamento criado",
  PAYMENT_MARKETPLACE_CREATED: "Pagamento marketplace criado",
  PAYMENT_SPLIT_BLOCKED_BY_CONTRACT_STATUS:
    "Split bloqueado pelo status do contrato",
  PAYMENT_SPLIT_BLOCKED_BY_DISPUTE: "Split bloqueado por contestação",
  PAYMENT_SPLIT_RELEASED: "Split de pagamento liberado",
  PAYMENT_STATUS_UPDATED: "Status do pagamento atualizado",
  PAYMENT_WEBHOOK_REPROCESSED: "Webhook de pagamento reprocessado",
  PAYOUT_STATUS_UPDATED: "Status do saque atualizado",
  POST_EVENT_REVIEW_REMINDER_SENT: "Lembrete de avaliação enviado",
  USER_PASSWORD_CHANGED: "Senha alterada",
  USER_SELF_ANONYMIZED: "Conta anonimizada pelo usuário",
  USER_SELF_UPDATED: "Dados da própria conta atualizados",
  USER_STATUS_UPDATED: "Status do usuário atualizado",
  VERIFICATION_DOCUMENT_DELETED: "Documento de verificação excluído",
  VERIFICATION_DOCUMENT_UPLOADED: "Documento de verificação enviado",
};

const auditEntityLabels: Record<string, string> = {
  Application: "Candidatura",
  ChatThread: "Conversa",
  CompanyProfile: "Empresa",
  Contract: "Contrato",
  Dispute: "Contestação",
  Event: "Evento",
  FreelancerProfile: "Profissional",
  GatewayAccount: "Conta de recebimento",
  Invitation: "Convite",
  Payment: "Pagamento",
  PaymentSplit: "Split de pagamento",
  PaymentWebhookEvent: "Webhook de pagamento",
  Payout: "Saque",
  Review: "Avaliação",
  User: "Usuário",
  VerificationDocument: "Documento de verificação",
};

const auditRoleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  COMPANY: "Empresa",
  FREELANCER: "Profissional",
};

const metadataKeyLabels: Record<string, string> = {
  accessLevel: "nivelAcesso",
  amountCents: "valorCentavos",
  companyFeeCents: "taxaEmpresaCentavos",
  contractId: "contratoId",
  count: "total",
  eventId: "eventoId",
  freelancerFeeCents: "taxaProfissionalCentavos",
  gatewayFeeCents: "taxaGatewayCentavos",
  gatewayPaymentId: "pagamentoGatewayId",
  gatewayTransactionId: "transacaoGatewayId",
  isActive: "ativo",
  message: "mensagem",
  paymentId: "pagamentoId",
  payoutId: "saqueId",
  previousStatus: "statusAnterior",
  reason: "motivo",
  role: "perfil",
  splitId: "splitId",
  status: "status",
  targetUserRole: "perfilDoUsuario",
  transactionId: "transacaoId",
  verificationDocumentsRemoved: "documentosVerificacaoRemovidos",
};

const metadataValueLabels: Record<string, string> = {
  ACCEPTED: "Aceito",
  ADMIN: "Administrador",
  CANCELLED: "Cancelado",
  COMPANY: "Empresa",
  COMPLETED: "Concluído",
  CONFIRMED: "Confirmado",
  DECLINED: "Recusado",
  DISPUTED: "Em contestação",
  FAILED: "Falhou",
  FINANCE: "Financeiro",
  FREELANCER: "Profissional",
  MANAGER: "Gerente",
  OWNER: "Owner",
  PAID: "Pago",
  PENDING: "Pendente",
  READONLY: "Somente leitura",
  REJECTED: "Reprovado",
  RELEASED: "Liberado",
  SUPPORT: "Suporte",
  VERIFICATION: "Verificação",
  VERIFIED: "Verificado",
};

const auditFilterTerms: Record<string, Record<string, string>> = {
  action: {
    administrador: "ADMIN",
    candidatura: "APPLICATION",
    contestacao: "DISPUTE",
    contestação: "DISPUTE",
    contrato: "CONTRACT",
    documento: "DOCUMENT",
    empresa: "COMPANY",
    evento: "EVENT",
    pagamento: "PAYMENT",
    profissional: "FREELANCER",
    saque: "PAYOUT",
    split: "SPLIT",
    usuario: "USER",
    usuário: "USER",
    verificacao: "VERIFICATION",
    verificação: "VERIFICATION",
  },
  entity: {
    avaliacao: "Review",
    avaliação: "Review",
    candidatura: "Application",
    contestacao: "Dispute",
    contestação: "Dispute",
    contrato: "Contract",
    conversa: "ChatThread",
    documento: "VerificationDocument",
    empresa: "CompanyProfile",
    evento: "Event",
    pagamento: "Payment",
    profissional: "FreelancerProfile",
    saque: "Payout",
    split: "PaymentSplit",
    usuario: "User",
    usuário: "User",
    webhook: "PaymentWebhookEvent",
  },
};

function normalizeAuditFilter(key: string, value: string) {
  return auditFilterTerms[key]?.[value.toLowerCase()] ?? value;
}

function formatAuditAction(action: string) {
  return auditActionLabels[action] ?? formatUnknownCode(action);
}

function formatAuditEntity(entity: string) {
  return auditEntityLabels[entity] ?? entity;
}

function formatAuditRole(role: string) {
  return auditRoleLabels[role] ?? formatUnknownCode(role);
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("pt-BR");
}

function formatMetadata(metadata: unknown) {
  try {
    return JSON.stringify(formatMetadataValue(metadata));
  } catch {
    return String(metadata);
  }
}

function formatMetadataValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => formatMetadataValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        metadataKeyLabels[key] ?? key,
        formatMetadataValue(item),
      ]),
    );
  }

  if (typeof value === "string") {
    return metadataValueLabels[value] ?? value;
  }

  return value;
}

function formatUnknownCode(code: string) {
  return code
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
