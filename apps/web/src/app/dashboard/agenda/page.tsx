"use client";

import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Wallet,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { EmptyState, StatusMessage } from "../../../components/ui";
import { apiRequest, formatCurrency } from "../../../lib/api";
import type {
  AvailabilityItem,
  Contract,
  WalletData,
} from "../../../lib/dashboard-types";

type CalendarEntry = {
  id: string;
  dateKey: string;
  title: string;
  meta: string;
  kind: "work" | "blocked";
};

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const statusLabels: Record<string, string> = {
  ACTIVE: "Ativo",
  PAID: "Pago",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "No-show",
  PENDING: "Pendente",
  RELEASED: "Liberado",
};

export default function AgendaPage() {
  const session = useRequiredSession();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [availability, setAvailability] = useState<AvailabilityItem[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAgenda = useCallback(async () => {
    if (session?.user.role !== "FREELANCER") {
      setLoading(false);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const [loadedContracts, loadedAvailability, loadedWallet] =
        await Promise.all([
          apiRequest<Contract[]>("/api/contracts"),
          apiRequest<AvailabilityItem[]>("/api/availability"),
          apiRequest<WalletData>("/api/wallet"),
        ]);

      setContracts(loadedContracts);
      setAvailability(loadedAvailability);
      setWallet(loadedWallet);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao carregar agenda.",
      );
    } finally {
      setLoading(false);
    }
  }, [session]);

  const days = useMemo(() => buildMonthGrid(monthDate), [monthDate]);
  const entriesByDay = useMemo(
    () => groupEntries(contracts, availability),
    [availability, contracts],
  );
  const todayKey = toDateKey(new Date());

  const metrics = useMemo(() => {
    const now = new Date();
    const upcoming = contracts.filter(
      (contract) =>
        new Date(contract.startsAt) >= now &&
        !["CANCELLED", "NO_SHOW"].includes(contract.status),
    ).length;
    const completed = contracts.filter((contract) =>
      ["COMPLETED", "PAID"].includes(contract.status),
    ).length;
    const blocked = availability.filter((item) => !item.isAvailable).length;

    return [
      ["Próximos eventos", upcoming],
      ["Realizados", completed],
      ["Indisponibilidades", blocked],
      ["Saldo", formatCurrency(wallet?.balanceCents)],
    ];
  }, [availability, contracts, wallet]);

  const upcomingContracts = useMemo(
    () =>
      contracts
        .filter((contract) => new Date(contract.endsAt) >= new Date())
        .sort(
          (left, right) =>
            new Date(left.startsAt).getTime() -
            new Date(right.startsAt).getTime(),
        )
        .slice(0, 6),
    [contracts],
  );

  const receivedContracts = useMemo(
    () =>
      contracts
        .filter((contract) => ["COMPLETED", "PAID"].includes(contract.status))
        .sort(
          (left, right) =>
            new Date(right.startsAt).getTime() -
            new Date(left.startsAt).getTime(),
        )
        .slice(0, 5),
    [contracts],
  );

  if (!session) {
    return null;
  }

  function changeMonth(offset: number) {
    setMonthDate(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={loadAgenda} />}
      eyebrow={session.user.role}
      title="Agenda"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

      {session.user.role !== "FREELANCER" ? (
        <EmptyState>
          A agenda visual é focada no perfil profissional freelancer.
        </EmptyState>
      ) : null}

      {session.user.role === "FREELANCER" ? (
        <>
          <section className="metrics">
            {metrics.map(([label, value]) => (
              <article className="metric" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </section>

          {loading ? <EmptyState>Carregando agenda...</EmptyState> : null}

          {!loading ? (
            <section className="dashboard-grid">
              <article className="panel report-panel">
                <div className="calendar-toolbar">
                  <div>
                    <p className="eyebrow">Calendário profissional</p>
                    <h2>{formatMonth(monthDate)}</h2>
                  </div>
                  <div className="button-row">
                    <button
                      aria-label="Mês anterior"
                      className="secondary-button icon-action"
                      onClick={() => changeMonth(-1)}
                      type="button"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      className="secondary-button icon-action"
                      onClick={() => setMonthDate(startOfMonth(new Date()))}
                      type="button"
                    >
                      Hoje
                    </button>
                    <button
                      aria-label="Próximo mês"
                      className="secondary-button icon-action"
                      onClick={() => changeMonth(1)}
                      type="button"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>

                <div className="calendar-grid">
                  {weekdays.map((weekday) => (
                    <div className="calendar-weekday" key={weekday}>
                      {weekday}
                    </div>
                  ))}
                  {days.map((day) => {
                    const dayKey = toDateKey(day.date);
                    const entries = entriesByDay.get(dayKey) ?? [];

                    return (
                      <div
                        className={[
                          "calendar-day",
                          day.isCurrentMonth ? "" : "outside",
                          dayKey === todayKey ? "today" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        key={dayKey}
                      >
                        <div className="calendar-day-header">
                          <span>{day.date.getDate()}</span>
                        </div>
                        <div className="calendar-items">
                          {entries.slice(0, 3).map((entry) => (
                            <span
                              className={`calendar-pill ${entry.kind}`}
                              key={entry.id}
                              title={`${entry.title} - ${entry.meta}`}
                            >
                              {entry.title}
                            </span>
                          ))}
                          {entries.length > 3 ? (
                            <span className="calendar-more">
                              +{entries.length - 3}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <h2>Próximos eventos</h2>
                  <BriefcaseBusiness size={18} />
                </div>
                {upcomingContracts.length ? (
                  <div className="list">
                    {upcomingContracts.map((contract) => (
                      <div className="list-row" key={contract.id}>
                        <div>
                          <strong>{contract.event?.name ?? "Evento"}</strong>
                          <span>
                            {formatDateTime(contract.startsAt)} -{" "}
                            {contract.event?.location ?? "Local a confirmar"}
                          </span>
                          <small>
                            {contract.company?.companyName ?? "Empresa"} -{" "}
                            {statusLabels[contract.status] ?? contract.status}
                          </small>
                        </div>
                        <small>{formatCurrency(contract.amountCents)}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState>Nenhum evento futuro na agenda.</EmptyState>
                )}
              </article>

              <article className="panel">
                <div className="panel-header">
                  <h2>Recebimentos</h2>
                  <Wallet size={18} />
                </div>
                <strong className="wallet-balance">
                  {formatCurrency(wallet?.balanceCents)}
                </strong>
                {receivedContracts.length ? (
                  <div className="list">
                    {receivedContracts.map((contract) => (
                      <div className="list-row" key={contract.id}>
                        <div>
                          <strong>{contract.event?.name ?? "Evento"}</strong>
                          <span>{formatDateTime(contract.startsAt)}</span>
                          <small>
                            {contract.payment?.status
                              ? (statusLabels[contract.payment.status] ??
                                contract.payment.status)
                              : (statusLabels[contract.status] ??
                                contract.status)}
                          </small>
                        </div>
                        <small>
                          {formatCurrency(
                            contract.payment?.freelancerAmountCents ??
                              contract.amountCents,
                          )}
                        </small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState>Nenhum recebimento realizado ainda.</EmptyState>
                )}
              </article>

              <article className="panel">
                <div className="panel-header">
                  <h2>Indisponibilidades</h2>
                  <Clock size={18} />
                </div>
                {availability.length ? (
                  <div className="list">
                    {availability.map((item) => (
                      <div className="list-row" key={item.id}>
                        <div>
                          <strong>{item.reason ?? "Indisponível"}</strong>
                          <span>
                            {formatDateTime(item.startsAt)} -{" "}
                            {formatDateTime(item.endsAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState>Nenhuma indisponibilidade cadastrada.</EmptyState>
                )}
              </article>
            </section>
          ) : null}
        </>
      ) : null}
    </DashboardShell>
  );
}

function buildMonthGrid(monthDate: Date) {
  const firstDay = startOfMonth(monthDate);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      date,
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

function groupEntries(contracts: Contract[], availability: AvailabilityItem[]) {
  const entries = new Map<string, CalendarEntry[]>();

  contracts.forEach((contract) => {
    addRangeEntry(entries, contract.startsAt, contract.endsAt, {
      id: contract.id,
      dateKey: "",
      title: contract.event?.name ?? "Evento",
      meta: statusLabels[contract.status] ?? contract.status,
      kind: "work",
    });
  });

  availability.forEach((item) => {
    addRangeEntry(entries, item.startsAt, item.endsAt, {
      id: item.id,
      dateKey: "",
      title: item.reason ?? "Indisponível",
      meta: "Bloqueio de agenda",
      kind: "blocked",
    });
  });

  return entries;
}

function addRangeEntry(
  entries: Map<string, CalendarEntry[]>,
  startsAt: string,
  endsAt: string,
  entry: CalendarEntry,
) {
  const current = startOfDay(new Date(startsAt));
  const end = startOfDay(new Date(endsAt));

  while (current <= end) {
    const dateKey = toDateKey(current);
    const dayEntries = entries.get(dateKey) ?? [];
    dayEntries.push({ ...entry, dateKey, id: `${entry.id}-${dateKey}` });
    entries.set(dateKey, dayEntries);
    current.setDate(current.getDate() + 1);
  }
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
