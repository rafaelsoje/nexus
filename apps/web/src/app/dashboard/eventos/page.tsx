"use client";

import { CalendarDays, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { ListPanel } from "../../../components/dashboard-widgets";
import { EmptyState, Field, StatusMessage } from "../../../components/ui";
import { apiRequest, formatCurrency } from "../../../lib/api";
import type { EventItem, Skill } from "../../../lib/dashboard-types";

type RequirementRow = {
  key: string;
  skillId: string;
  quantity: number;
  dailyRate: number;
};

const emptyRequirement: RequirementRow = {
  key: "requirement-new",
  skillId: "",
  quantity: 1,
  dailyRate: 300,
};

export default function EventsPage() {
  const session = useRequiredSession();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [requirementRows, setRequirementRows] = useState<RequirementRow[]>([
    emptyRequirement,
  ]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const adminMetrics = useMemo(
    () => ({
      total: events.length,
      open: events.filter((event) => event.status === "OPEN").length,
      confirmed: events.filter((event) => event.status === "CONFIRMED").length,
      contracts: events.reduce(
        (total, event) => total + (event.contracts?.length ?? 0),
        0,
      ),
    }),
    [events],
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadEvents();
  }, [session]);

  async function loadEvents() {
    setError("");
    setLoading(true);

    try {
      const [loadedSkills, loadedEvents] = await Promise.all([
        apiRequest<Skill[]>("/api/skills"),
        session?.user.role === "ADMIN"
          ? apiRequest<EventItem[]>("/api/admin/events")
          : session?.user.role === "COMPANY"
            ? apiRequest<EventItem[]>("/api/events")
            : Promise.resolve([]),
      ]);
      setSkills(loadedSkills);
      setEvents(loadedEvents);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao carregar eventos.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    setSuccess("");

    try {
      const requirements = requirementRows
        .filter((row) => row.skillId)
        .map((row) => ({
          skillId: row.skillId,
          quantity: row.quantity,
          dailyRateCents: row.dailyRate * 100,
        }));

      if (!requirements.length) {
        setError("Informe pelo menos uma especialidade para o evento.");
        return;
      }

      const payload = {
        name: String(form.get("name")),
        startsAt: String(form.get("startsAt")),
        endsAt: String(form.get("endsAt")),
        location: String(form.get("location")),
        city: String(form.get("city")),
        state: String(form.get("state")),
        description: String(form.get("description")),
        eventType: String(form.get("eventType")),
        desiredProfessionals: requirements.reduce(
          (total, requirement) => total + requirement.quantity,
          0,
        ),
        requirements,
      };
      await apiRequest(
        editingEvent ? `/api/events/${editingEvent.id}` : "/api/events",
        {
          method: editingEvent ? "PATCH" : "POST",
          body: JSON.stringify({
            ...payload,
          }),
        },
      );
      formElement.reset();
      resetEventForm();
      setSuccess(editingEvent ? "Evento atualizado." : "Evento criado.");
      await loadEvents();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao salvar evento.",
      );
    }
  }

  function addRequirementRow() {
    setRequirementRows((current) => [...current, createEmptyRequirement()]);
  }

  function removeRequirementRow(key: string) {
    setRequirementRows((current) =>
      current.length === 1 ? current : current.filter((row) => row.key !== key),
    );
  }

  function updateRequirementRow(
    key: string,
    field: keyof Omit<RequirementRow, "key">,
    value: string | number,
  ) {
    setRequirementRows((current) =>
      current.map((row) =>
        row.key === key
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  }

  function startEditingEvent(item: EventItem) {
    setEditingEvent(item);
    setRequirementRows(
      item.requirements?.length
        ? item.requirements.map((requirement, index) => ({
            key: requirement.id ?? `${item.id}-${index}`,
            skillId: requirement.skillId,
            quantity: requirement.quantity,
            dailyRate: (requirement.dailyRateCents ?? 30000) / 100,
          }))
        : [createEmptyRequirement()],
    );
  }

  function resetEventForm() {
    setEditingEvent(null);
    setRequirementRows([createEmptyRequirement()]);
  }

  async function handleDuplicateEvent(eventId: string) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/events/${eventId}/duplicate`, { method: "POST" });
      setSuccess("Evento duplicado.");
      await loadEvents();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao duplicar evento.",
      );
    }
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={loadEvents} />}
      eyebrow={session.user.role}
      title="Eventos"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando eventos...</EmptyState> : null}

      {session.user.role === "ADMIN" ? (
        <section className="metrics">
          <article className="metric">
            <span>Eventos</span>
            <strong>{adminMetrics.total}</strong>
          </article>
          <article className="metric">
            <span>Abertos</span>
            <strong>{adminMetrics.open}</strong>
          </article>
          <article className="metric">
            <span>Confirmados</span>
            <strong>{adminMetrics.confirmed}</strong>
          </article>
          <article className="metric">
            <span>Contratos</span>
            <strong>{adminMetrics.contracts}</strong>
          </article>
        </section>
      ) : null}

      <section className="dashboard-grid">
        {session.user.role === "COMPANY" ? (
          <article className="panel">
            <div className="panel-header">
              <h2>{editingEvent ? "Editar evento" : "Criar evento"}</h2>
              <CalendarDays size={18} />
            </div>
            <form
              className="form compact"
              key={editingEvent?.id ?? "create-event"}
              onSubmit={handleSubmitEvent}
            >
              <Field label="Nome">
                <input
                  defaultValue={editingEvent?.name}
                  name="name"
                  required
                />
              </Field>
              <div className="form-grid">
                <Field label="Início">
                  <input
                    defaultValue={toDateTimeLocal(editingEvent?.startsAt)}
                    name="startsAt"
                    type="datetime-local"
                    required
                  />
                </Field>
                <Field label="Fim">
                  <input
                    defaultValue={toDateTimeLocal(editingEvent?.endsAt)}
                    name="endsAt"
                    type="datetime-local"
                    required
                  />
                </Field>
              </div>
              <Field label="Local">
                <input
                  defaultValue={editingEvent?.location}
                  name="location"
                  required
                />
              </Field>
              <div className="form-grid">
                <Field label="Cidade">
                  <input defaultValue={editingEvent?.city} name="city" />
                </Field>
                <Field label="UF">
                  <input
                    defaultValue={editingEvent?.state}
                    name="state"
                    maxLength={2}
                  />
                </Field>
              </div>
              <Field label="Descrição">
                <input
                  defaultValue={editingEvent?.description}
                  name="description"
                  placeholder="Briefing, acesso, uniforme, horários..."
                />
              </Field>
              <div className="requirement-editor">
                <div className="panel-header">
                  <h3>Funções do evento</h3>
                  <button
                    className="icon-action"
                    onClick={addRequirementRow}
                    type="button"
                  >
                    <Plus size={14} />
                    Adicionar
                  </button>
                </div>
                {requirementRows.map((row) => (
                  <div className="requirement-row" key={row.key}>
                    <Field label="Especialidade">
                      <select
                        onChange={(event) =>
                          updateRequirementRow(
                            row.key,
                            "skillId",
                            event.target.value,
                          )
                        }
                        required
                        value={row.skillId}
                      >
                        <option value="" disabled>
                          Selecione
                        </option>
                        {skills.map((skill) => (
                          <option key={skill.id} value={skill.id}>
                            {skill.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Qtd.">
                      <input
                        min={1}
                        onChange={(event) =>
                          updateRequirementRow(
                            row.key,
                            "quantity",
                            Number(event.target.value),
                          )
                        }
                        required
                        type="number"
                        value={row.quantity}
                      />
                    </Field>
                    <Field label="Diária">
                      <input
                        min={0}
                        onChange={(event) =>
                          updateRequirementRow(
                            row.key,
                            "dailyRate",
                            Number(event.target.value),
                          )
                        }
                        required
                        type="number"
                        value={row.dailyRate}
                      />
                    </Field>
                    <button
                      aria-label="Remover função"
                      className="icon-action ghost"
                      disabled={requirementRows.length === 1}
                      onClick={() => removeRequirementRow(row.key)}
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <input
                name="eventType"
                type="hidden"
                value={editingEvent?.eventType ?? "Evento"}
              />
              <button className="primary-button full" type="submit">
                {editingEvent ? "Salvar alterações" : "Criar evento"}
              </button>
              {editingEvent ? (
                <button
                  className="secondary-button full"
                  onClick={resetEventForm}
                  type="button"
                >
                  Cancelar edição
                </button>
              ) : null}
            </form>
          </article>
        ) : null}

        <ListPanel icon={<CalendarDays size={18} />} title="Eventos">
          {events.map((item) => (
            <div className="list-row" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span>
                  {new Date(item.startsAt).toLocaleString("pt-BR")} -{" "}
                  {item.location}
                </span>
                {session.user.role === "ADMIN" ? (
                  <span>
                    {item.company?.companyName ?? "Empresa"} -{" "}
                    {item.invitations?.length ?? 0} convite(s) -{" "}
                    {item.contracts?.length ?? 0} contrato(s)
                  </span>
                ) : null}
                <span>{formatRequirements(item)}</span>
              </div>
              <div className="row-actions">
                <small>{item.status}</small>
                {session.user.role === "COMPANY" ? (
                  <>
                    <button
                      className="icon-action"
                      onClick={() => startEditingEvent(item)}
                      type="button"
                    >
                      <Pencil size={14} />
                      Editar
                    </button>
                    <button
                      className="icon-action ghost"
                      onClick={() => handleDuplicateEvent(item.id)}
                      type="button"
                    >
                      <Copy size={14} />
                      Duplicar
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </ListPanel>
      </section>
    </DashboardShell>
  );
}

function formatRequirements(item: EventItem) {
  if (!item.requirements?.length) {
    return "Nenhum requisito informado";
  }

  return item.requirements
    .map((requirement) => {
      const skill = requirement.skill?.name ?? "Especialidade";
      const rate = requirement.dailyRateCents
        ? ` - ${formatCurrency(requirement.dailyRateCents)}`
        : "";

      return `${skill}: ${requirement.quantity} vaga(s)${rate}`;
    })
    .join(" | ");
}

function toDateTimeLocal(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function createEmptyRequirement(): RequirementRow {
  return {
    ...emptyRequirement,
    key: `requirement-${Date.now()}-${Math.random()}`,
  };
}
