"use client";

import { CalendarDays } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { ListPanel } from "../../../components/dashboard-widgets";
import { EmptyState, Field, StatusMessage } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import type { EventItem, Skill } from "../../../lib/dashboard-types";

export default function EventsPage() {
  const session = useRequiredSession();
  const [events, setEvents] = useState<EventItem[]>([]);
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

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setSuccess("");

    try {
      await apiRequest("/api/events", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name")),
          startsAt: String(form.get("startsAt")),
          endsAt: String(form.get("endsAt")),
          location: String(form.get("location")),
          city: String(form.get("city")),
          state: String(form.get("state")),
          eventType: String(form.get("eventType")),
          requirements: [
            {
              skillId: String(form.get("skillId")),
              quantity: Number(form.get("quantity")),
              dailyRateCents: Number(form.get("dailyRate")) * 100,
            },
          ],
        }),
      });
      event.currentTarget.reset();
      setSuccess("Evento criado.");
      await loadEvents();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao criar evento.",
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
              <h2>Criar evento</h2>
              <CalendarDays size={18} />
            </div>
            <form className="form compact" onSubmit={handleCreateEvent}>
              <Field label="Nome">
                <input name="name" required />
              </Field>
              <div className="form-grid">
                <Field label="Início">
                  <input name="startsAt" type="datetime-local" required />
                </Field>
                <Field label="Fim">
                  <input name="endsAt" type="datetime-local" required />
                </Field>
              </div>
              <Field label="Local">
                <input name="location" required />
              </Field>
              <div className="form-grid">
                <Field label="Cidade">
                  <input name="city" />
                </Field>
                <Field label="UF">
                  <input name="state" maxLength={2} />
                </Field>
              </div>
              <div className="form-grid">
                <Field label="Especialidade">
                  <select name="skillId" required>
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
                    defaultValue={1}
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
                  defaultValue={300}
                  required
                />
              </Field>
              <input name="eventType" type="hidden" value="Evento" />
              <button className="primary-button full" type="submit">
                Criar evento
              </button>
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
              </div>
              <small>{item.status}</small>
            </div>
          ))}
        </ListPanel>
      </section>
    </DashboardShell>
  );
}
