"use client";

import { CalendarDays, Copy, Pencil } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { ListPanel } from "../../../components/dashboard-widgets";
import { EmptyState, Field, StatusMessage } from "../../../components/ui";
import { apiRequest, formatCurrency } from "../../../lib/api";
import type { EventItem, Skill } from "../../../lib/dashboard-types";

export default function EventsPage() {
  const session = useRequiredSession();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

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
        session?.user.role === "COMPANY"
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
    const form = new FormData(event.currentTarget);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: String(form.get("name")),
        startsAt: String(form.get("startsAt")),
        endsAt: String(form.get("endsAt")),
        location: String(form.get("location")),
        city: String(form.get("city")),
        state: String(form.get("state")),
        description: String(form.get("description")),
        eventType: String(form.get("eventType")),
        desiredProfessionals: Number(form.get("desiredProfessionals")),
        requirements: [
          {
            skillId: String(form.get("skillId")),
            quantity: Number(form.get("quantity")),
            dailyRateCents: Number(form.get("dailyRate")) * 100,
          },
        ],
      };
      await apiRequest(editingEvent ? `/api/events/${editingEvent.id}` : "/api/events", {
        method: editingEvent ? "PATCH" : "POST",
        body: JSON.stringify({
          ...payload,
        }),
      });
      event.currentTarget.reset();
      setEditingEvent(null);
      setSuccess(editingEvent ? "Evento atualizado." : "Evento criado.");
      await loadEvents();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao salvar evento.",
      );
    }
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
              <div className="form-grid">
                <Field label="Especialidade">
                  <select
                    defaultValue={editingEvent?.requirements?.[0]?.skillId}
                    name="skillId"
                    required
                  >
                    {skills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Qtd.">
                  <input
                    name="quantity"
                    type="number"
                    defaultValue={editingEvent?.requirements?.[0]?.quantity ?? 1}
                    min={1}
                    required
                  />
                </Field>
              </div>
              <Field label="Diária">
                <input
                  name="dailyRate"
                  type="number"
                  min={0}
                  defaultValue={
                    (editingEvent?.requirements?.[0]?.dailyRateCents ?? 30000) /
                    100
                  }
                  required
                />
              </Field>
              <input
                name="desiredProfessionals"
                type="hidden"
                value={editingEvent?.desiredProfessionals ?? 1}
              />
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
                  onClick={() => setEditingEvent(null)}
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
                <span>{formatRequirements(item)}</span>
              </div>
              <div className="row-actions">
                <small>{item.status}</small>
                {session.user.role === "COMPANY" ? (
                  <>
                    <button
                      className="icon-action"
                      onClick={() => setEditingEvent(item)}
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
