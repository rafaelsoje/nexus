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
        <strong>{formatAuditTitle(log)}</strong>
        <span>
          Registro: {formatAuditEntity(log.entity)}
        </span>
        <span>
          {formatAuditActor(log)} - {formatDate(log.createdAt)}
        </span>
        {log.user ? (
          <span>
            {formatAuditUserDetails(log)}
          </span>
        ) : null}
        {log.metadata ? <MetadataSummary metadata={log.metadata} /> : null}
      </div>
    </div>
  );
}

function MetadataSummary({ metadata }: Readonly<{ metadata: unknown }>) {
  const entries = getMetadataEntries(metadata);

  if (!entries.length) {
    return null;
  }

  return (
    <dl className="audit-metadata">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt>{formatMetadataKey(key)}</dt>
          <dd>{formatMetadataDisplayEntry(key, value)}</dd>
        </div>
      ))}
    </dl>
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
  MARKETPLACE_PAYMENT_CREATED: "Pagamento marketplace criado",
  PAYMENT_CREATED: "Pagamento criado",
  PAYMENT_MARKETPLACE_CREATED: "Pagamento marketplace criado",
  PAYMENT_SPLIT_BLOCKED_BY_CONTRACT_STATUS:
    "Split bloqueado pelo status do contrato",
  PAYMENT_SPLIT_BLOCKED_BY_DISPUTE: "Split bloqueado por contestação",
  PAYMENT_SPLIT_REFUNDED: "Split de pagamento estornado",
  PAYMENT_SPLIT_RELEASED: "Split de pagamento liberado",
  PAYMENT_SPLIT_UNBLOCKED: "Split de pagamento desbloqueado",
  PAYMENT_CHARGEBACK_BLOCKED_SPLITS:
    "Chargeback bloqueou splits de pagamento",
  PAYMENT_REFUNDED_SPLITS: "Splits de pagamento estornados",
  PAYMENT_STATUS_UPDATED: "Status do pagamento atualizado",
  PAYMENT_WEBHOOK_PROCESSED: "Webhook de pagamento processado",
  PAYMENT_WEBHOOK_REPROCESSED: "Webhook de pagamento reprocessado",
  PAYOUT_REQUESTED: "Saque solicitado",
  PAYOUT_STATUS_UPDATED: "Status do saque atualizado",
  POST_EVENT_REVIEW_REMINDER_SENT: "Lembrete de avaliação enviado",
  USER_LOGGED_IN: "Usuário entrou no sistema",
  USER_PASSWORD_CHANGED: "Senha alterada",
  USER_REGISTERED: "Usuário cadastrado",
  USER_SELF_ANONYMIZED: "Conta excluída pelo usuário",
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
  Wallet: "Carteira",
};

const auditRoleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  COMPANY: "Empresa",
  FREELANCER: "Profissional",
};

const metadataKeyLabels: Record<string, string> = {
  accessLevel: "Nível de acesso",
  affectedSplits: "Splits afetados",
  amountCents: "Valor",
  amountToChargeCompanyCents: "Total cobrado da empresa",
  blockedAt: "Bloqueado em",
  blockedSplits: "Splits bloqueados",
  category: "Categoria",
  companyId: "Empresa",
  companyFeeCents: "Taxa da empresa",
  contractId: "Contrato",
  contractIds: "Contratos",
  creditedCompanyWallet: "Crédito na carteira da empresa",
  count: "Total",
  deadlineAt: "Prazo",
  eventId: "Evento",
  fields: "Campos alterados",
  freelancerFeeCents: "Taxa do profissional",
  freelancerId: "Profissional",
  gatewayAmountCents: "Valor no gateway",
  gatewayFeeCents: "Taxa do gateway",
  gatewayPaymentId: "Pagamento no gateway",
  gatewayTransactionId: "Transação no gateway",
  grossAmountCents: "Valor bruto",
  isActive: "Ativo",
  kycStatus: "Status KYC",
  message: "Mensagem",
  mimeType: "Tipo do arquivo",
  netAmountCents: "Valor líquido",
  paymentId: "Pagamento",
  payoutId: "Saque",
  previousStatus: "Status anterior",
  reason: "Motivo",
  refunded: "Estornado",
  refundAmountCents: "Valor estornado",
  releasedAt: "Liberado em",
  requestedAt: "Solicitado em",
  resolution: "Resolução",
  role: "Perfil",
  sentAt: "Enviado em",
  sizeBytes: "Tamanho do arquivo",
  splitId: "Split",
  splitIds: "Splits",
  status: "Status",
  targetUserRole: "Perfil do usuário",
  transactionId: "Transação",
  verificationDocumentsRemoved: "Documentos de verificação removidos",
  webhookEventId: "Evento do webhook",
};

const metadataValueLabels: Record<string, string> = {
  ACCEPTED: "Aceito",
  ADMIN: "Administrador",
  CANCELLED: "Cancelado",
  CHARGEBACK: "Chargeback",
  COMPANY: "Empresa",
  COMPLETED: "Concluído",
  CONFIRMED: "Confirmado",
  CONTRACT_CANCELLED: "Contrato cancelado",
  DECLINED: "Recusado",
  DISPUTED: "Em contestação",
  FAILED: "Falhou",
  FINANCE: "Financeiro",
  FREELANCER: "Profissional",
  MANAGER: "Gerente",
  NO_SHOW: "Não compareceu",
  NO_SHOW_REPORTED: "Falta reportada",
  OWNER: "Dono",
  PAID: "Pago",
  PENDING: "Pendente",
  READONLY: "Somente leitura",
  REJECTED: "Reprovado",
  RELEASED: "Liberado",
  REFUNDED: "Estornado",
  SUPPORT: "Suporte",
  VERIFICATION: "Verificação",
  VERIFIED: "Verificado",
  document: "Documento",
  identity: "Identidade",
  image: "Imagem",
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

function formatAuditTitle(log: AuditLog) {
  if (log.action === "USER_REGISTERED" && isDeletedUser(log.user)) {
    return "Conta cadastrada (atualmente excluída)";
  }

  return formatAuditAction(log.action);
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

function formatAuditActor(log: AuditLog) {
  if (!log.user) {
    return "Sistema";
  }

  if (isDeletedUser(log.user)) {
    return `Conta atualmente excluída: ${log.user.name}`;
  }

  return log.user.name;
}

function formatAuditUserDetails(log: AuditLog) {
  if (!log.user) {
    return "";
  }

  const role = formatAuditRole(log.user.role);

  if (isDeletedUser(log.user)) {
    return `${role} atualmente excluída - e-mail anonimizado: ${log.user.email}`;
  }

  return `${role} - ${log.user.email}`;
}

function isDeletedUser(user: AuditLog["user"]) {
  return Boolean(user?.email.startsWith("deleted-"));
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("pt-BR");
}

function getMetadataEntries(metadata: unknown): Array<[string, unknown]> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [["Detalhes", metadata]];
  }

  return Object.entries(metadata);
}

function formatMetadataKey(key: string) {
  return metadataKeyLabels[key] ?? formatUnknownCode(key);
}

function formatMetadataDisplayValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => formatMetadataDisplayValue(item)).join(", ");
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(
        ([key, item]) =>
          `${formatMetadataKey(key)}: ${formatMetadataDisplayEntry(key, item)}`,
      )
      .join("; ");
  }

  if (typeof value === "string") {
    if (isIsoDateString(value)) {
      return formatDate(value);
    }

    return metadataValueLabels[value] ?? formatIdentifier(value);
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }

  if (value === null || value === undefined) {
    return "Não informado";
  }

  return String(value);
}

function formatMetadataDisplayEntry(key: string, value: unknown) {
  if (typeof value === "number" && key.toLowerCase().endsWith("cents")) {
    return formatCurrencyFromCents(value);
  }

  if (typeof value === "number" && key === "sizeBytes") {
    return formatFileSize(value);
  }

  if (typeof value === "string" && key === "mimeType") {
    return formatMimeType(value);
  }

  return formatMetadataDisplayValue(value);
}

function formatCurrencyFromCents(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value / 100);
}

function formatFileSize(value: number) {
  const isMegaByte = value >= 1_048_576;
  const unit = isMegaByte ? "MB" : "KB";
  const divisor = isMegaByte ? 1_048_576 : 1024;

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: isMegaByte ? 1 : 0,
  }).format(value / divisor) + ` ${unit}`;
}

function formatMimeType(value: string) {
  const mimeLabels: Record<string, string> = {
    "application/pdf": "PDF",
    "image/jpeg": "JPG",
    "image/png": "PNG",
    "image/webp": "WebP",
  };

  return mimeLabels[value] ?? value;
}

function formatIdentifier(value: string) {
  if (!isInternalId(value)) {
    return value;
  }

  return `${value.slice(0, 8)}...`;
}

function isInternalId(value: string) {
  return /^c[a-z0-9]{12,}$/i.test(value);
}

function isIsoDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
}

function formatUnknownCode(code: string) {
  return code
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
