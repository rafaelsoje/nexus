import type React from "react";
import { BriefcaseBusiness } from "lucide-react";
import { formatCurrency } from "../lib/api";
import type { ReportSummary } from "../lib/dashboard-types";
import { EmptyState } from "./ui";

export function ListPanel({
  children,
  icon,
  title,
}: Readonly<{
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}>) {
  return (
    <article className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
        {icon}
      </div>
      <div className="list">
        {children || <EmptyState>Nenhum item encontrado.</EmptyState>}
      </div>
    </article>
  );
}

export function ReportPanel({
  reportSummary,
}: Readonly<{ reportSummary: ReportSummary | null }>) {
  const totals = reportSummary?.totals ?? {};
  const moneyKeys = new Set([
    "grossAmountCents",
    "freelancerAmountCents",
    "platformFeeCents",
    "balanceCents",
  ]);
  const labels: Record<string, string> = {
    users: "Usuários",
    companies: "Empresas",
    freelancers: "Freelancers",
    events: "Eventos",
    contracts: "Contratos",
    payments: "Pagamentos",
    grossAmountCents: "Volume pago",
    freelancerAmountCents: "Repasse",
    platformFeeCents: "Taxa plataforma",
    balanceCents: "Saldo",
  };

  return (
    <article className="panel report-panel">
      <div className="panel-header">
        <h2>Relatórios</h2>
        <BriefcaseBusiness size={18} />
      </div>
      <div className="report-grid">
        {Object.entries(totals).map(([key, value]) => (
          <div className="report-tile" key={key}>
            <span>{labels[key] ?? key}</span>
            <strong>
              {moneyKeys.has(key) ? formatCurrency(value) : value}
            </strong>
          </div>
        ))}
      </div>
      {reportSummary?.contractStatus.length ? (
        <div className="status-strip">
          {reportSummary.contractStatus.map((item) => (
            <span key={item.status}>
              {item.status}: {item.count}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
