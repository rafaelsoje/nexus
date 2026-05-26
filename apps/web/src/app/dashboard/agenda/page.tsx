"use client";

import type {
  DateSelectArg,
  EventDropArg,
  EventClickArg,
  EventInput,
} from "@fullcalendar/core";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, {
  type EventResizeDoneArg,
} from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { BriefcaseBusiness, Clock, Wallet, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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

const statusLabels: Record<string, string> = {
  ACTIVE: "Ativo",
  AUTHORIZED: "Autorizado",
  PAID: "Pago",
  PENDING_PAYMENT: "Aguardando pagamento",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Ausência",
  PENDING: "Pendente",
  RELEASED: "Liberado",
  DISPUTED: "Contestado",
};

type AgendaDetail =
  | { kind: "work"; contract: Contract }
  | { kind: "blocked"; item: AvailabilityItem };

export default function AgendaPage() {
  const session = useRequiredSession();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [availability, setAvailability] = useState<AvailabilityItem[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<AgendaDetail | null>(
    null,
  );
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

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadAgenda();
  }, [loadAgenda, session]);

  const calendarEvents = useMemo<EventInput[]>(
    () => [
      ...contracts.map((contract) => ({
        id: `contract-${contract.id}`,
        title: contract.event?.name ?? "Evento",
        start: contract.startsAt,
        end: contract.endsAt,
        editable: false,
        classNames: [
          "nexo-calendar-event",
          "nexo-calendar-event-work",
          `status-${contract.status.toLowerCase().replaceAll("_", "-")}`,
        ],
        extendedProps: {
          contractId: contract.id,
          kind: "work",
          status: contract.status,
          meta: `${contract.company?.companyName ?? "Empresa"} - ${formatCurrency(contract.amountCents)}`,
        },
      })),
      ...availability.map((item) => ({
        id: `availability-${item.id}`,
        title: item.reason ?? "Indisponível",
        start: item.startsAt,
        end: item.endsAt,
        editable: true,
        durationEditable: true,
        startEditable: true,
        classNames: ["nexo-calendar-event", "nexo-calendar-event-blocked"],
        extendedProps: {
          availabilityId: item.id,
          kind: "blocked",
          meta: "Bloqueio de agenda",
          reason: item.reason ?? "Indisponível",
        },
      })),
    ],
    [availability, contracts],
  );

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

  function openAgendaDetail(click: EventClickArg) {
    const { kind, contractId, availabilityId } = click.event.extendedProps;

    if (kind === "work" && typeof contractId === "string") {
      const contract = contracts.find((item) => item.id === contractId);

      if (contract) {
        setSelectedDetail({ kind: "work", contract });
      }
    }

    if (kind === "blocked" && typeof availabilityId === "string") {
      const item = availability.find((entry) => entry.id === availabilityId);

      if (item) {
        setSelectedDetail({ kind: "blocked", item });
      }
    }
  }

  function closeAgendaDetail() {
    setSelectedDetail(null);
  }

  async function createAvailabilityBlock(selection: DateSelectArg) {
    if (!selection.start || !selection.end) {
      return;
    }

    setError("");

    try {
      await apiRequest<AvailabilityItem>("/api/availability", {
        method: "POST",
        body: JSON.stringify({
          startsAt: selection.start.toISOString(),
          endsAt: selection.end.toISOString(),
          isAvailable: false,
          reason: "Indisponível",
        }),
      });
      selection.view.calendar.unselect();
      await loadAgenda();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao criar indisponibilidade.",
      );
    }
  }

  async function updateAvailabilityBlock(
    change: EventDropArg | EventResizeDoneArg,
  ) {
    const availabilityId = change.event.extendedProps.availabilityId;

    if (
      typeof availabilityId !== "string" ||
      !change.event.start ||
      !change.event.end
    ) {
      change.revert();
      return;
    }

    setError("");

    try {
      await apiRequest<AvailabilityItem>(
        `/api/availability/${availabilityId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            startsAt: change.event.start.toISOString(),
            endsAt: change.event.end.toISOString(),
            isAvailable: false,
            reason:
              typeof change.event.extendedProps.reason === "string"
                ? change.event.extendedProps.reason
                : "Indisponível",
          }),
        },
      );
      await loadAgenda();
    } catch (caught) {
      change.revert();
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao atualizar indisponibilidade.",
      );
    }
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
                <div className="calendar-shell">
                  <FullCalendar
                    allDaySlot={false}
                    buttonText={{
                      day: "Dia",
                      month: "Mês",
                      today: "Hoje",
                      week: "Semana",
                    }}
                    dayMaxEvents={3}
                    editable
                    eventAllow={(_dropInfo, draggedEvent) =>
                      draggedEvent?.extendedProps.kind === "blocked"
                    }
                    eventClassNames={(arg) =>
                      arg.isMirror ? ["is-mirror"] : []
                    }
                    eventContent={(arg) => (
                      <div className="fc-event-card">
                        <strong>{arg.event.title}</strong>
                        <span>
                          {arg.timeText}
                          {arg.event.extendedProps.meta
                            ? ` - ${arg.event.extendedProps.meta}`
                            : ""}
                        </span>
                      </div>
                    )}
                    eventClick={openAgendaDetail}
                    eventDrop={updateAvailabilityBlock}
                    eventResize={updateAvailabilityBlock}
                    events={calendarEvents}
                    firstDay={1}
                    headerToolbar={{
                      left: "prev,next today",
                      center: "title",
                      right: "dayGridMonth,timeGridWeek,timeGridDay",
                    }}
                    height="auto"
                    initialView="dayGridMonth"
                    locale={ptBrLocale}
                    nowIndicator
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    select={createAvailabilityBlock}
                    selectable
                    selectMirror
                    slotLabelFormat={{
                      hour: "2-digit",
                      minute: "2-digit",
                    }}
                    slotMinTime="06:00:00"
                    slotMaxTime="24:00:00"
                    weekends
                  />
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
                            {firstPaymentSplit(contract)?.payment?.status
                              ? (statusLabels[
                                  firstPaymentSplit(contract)?.payment
                                    ?.status ?? ""
                                ] ??
                                firstPaymentSplit(contract)?.payment?.status)
                              : (statusLabels[contract.status] ??
                                contract.status)}
                          </small>
                        </div>
                        <small>
                          {formatCurrency(
                            firstPaymentSplit(contract)
                              ?.freelancerNetAmountCents ??
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

          {selectedDetail ? (
            <AgendaDetailModal
              detail={selectedDetail}
              onClose={closeAgendaDetail}
            />
          ) : null}
        </>
      ) : null}
    </DashboardShell>
  );
}

function AgendaDetailModal({
  detail,
  onClose,
}: Readonly<{ detail: AgendaDetail; onClose: () => void }>) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const isWork = detail.kind === "work";
  const title = isWork
    ? (detail.contract.event?.name ?? "Evento")
    : (detail.item.reason ?? "Indisponível");

  return (
    <div
      aria-modal="true"
      className="agenda-modal-backdrop"
      onMouseDown={onClose}
      role="dialog"
    >
      <article
        className="agenda-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="agenda-modal-header">
          <div>
            <span>{isWork ? "Evento confirmado" : "Bloqueio de agenda"}</span>
            <h2>{title}</h2>
          </div>
          <button
            aria-label="Fechar detalhes"
            className="agenda-modal-close"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </header>

        {isWork ? (
          <ContractDetails contract={detail.contract} />
        ) : (
          <AvailabilityDetails item={detail.item} />
        )}
      </article>
    </div>
  );
}

function ContractDetails({ contract }: Readonly<{ contract: Contract }>) {
  return (
    <div className="agenda-detail-grid">
      <DetailItem label="Empresa" value={contract.company?.companyName} />
      <DetailItem
        label="Status"
        value={statusLabels[contract.status] ?? contract.status}
      />
      <DetailItem label="Início" value={formatDateTime(contract.startsAt)} />
      <DetailItem label="Fim" value={formatDateTime(contract.endsAt)} />
      <DetailItem label="Local" value={contract.event?.location} />
      <DetailItem label="Cidade" value={formatPlace(contract)} />
      <DetailItem
        label="Valor combinado"
        value={formatCurrency(contract.amountCents)}
      />
      <DetailItem
        label="Taxa da plataforma"
        value={formatCurrency(contract.platformFeeCents)}
      />
      <DetailItem
        label="Pagamento"
        value={
          firstPaymentSplit(contract)?.payment?.status
            ? (statusLabels[
                firstPaymentSplit(contract)?.payment?.status ?? ""
              ] ?? firstPaymentSplit(contract)?.payment?.status)
            : "Ainda não informado"
        }
      />
      <DetailItem
        label="Recebimento"
        value={formatCurrency(
          firstPaymentSplit(contract)?.freelancerNetAmountCents ??
            contract.amountCents,
        )}
      />
    </div>
  );
}

function AvailabilityDetails({ item }: Readonly<{ item: AvailabilityItem }>) {
  return (
    <div className="agenda-detail-grid">
      <DetailItem label="Motivo" value={item.reason ?? "Indisponível"} />
      <DetailItem
        label="Tipo"
        value={item.isAvailable ? "Disponível" : "Indisponível"}
      />
      <DetailItem label="Início" value={formatDateTime(item.startsAt)} />
      <DetailItem label="Fim" value={formatDateTime(item.endsAt)} />
    </div>
  );
}

function DetailItem({
  label,
  value,
}: Readonly<{ label: string; value?: string | null }>) {
  return (
    <div className="agenda-detail-item">
      <span>{label}</span>
      <strong>{value || "Não informado"}</strong>
    </div>
  );
}

function formatPlace(contract: Contract) {
  const city = contract.event?.city;
  const state = contract.event?.state;

  if (city && state) {
    return `${city}/${state}`;
  }

  return city ?? state ?? "Não informado";
}

function firstPaymentSplit(contract: Contract) {
  return contract.paymentSplits?.[0] ?? null;
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    year: "numeric",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
