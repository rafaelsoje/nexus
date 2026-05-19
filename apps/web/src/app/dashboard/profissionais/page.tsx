"use client";

import { Send, Search, UsersRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { EmptyState, Field, StatusMessage } from "../../../components/ui";
import { apiRequest, formatCurrency } from "../../../lib/api";
import type {
  EventItem,
  Freelancer,
  Skill,
} from "../../../lib/dashboard-types";

export default function ProfessionalsPage() {
  const session = useRequiredSession();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedFreelancerIds, setSelectedFreelancerIds] = useState<string[]>(
    [],
  );
  const [selectedEventId, setSelectedEventId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadProfessionals();
  }, [session]);

  async function loadProfessionals() {
    setError("");
    setLoading(true);

    try {
      const [loadedSkills, loadedFreelancers, loadedEvents] = await Promise.all(
        [
          apiRequest<Skill[]>("/api/skills"),
          session?.user.role === "COMPANY" || session?.user.role === "ADMIN"
            ? apiRequest<Freelancer[]>("/api/freelancers")
            : Promise.resolve([]),
          session?.user.role === "COMPANY"
            ? apiRequest<EventItem[]>("/api/events")
            : Promise.resolve([]),
        ],
      );
      setSkills(loadedSkills);
      setFreelancers(loadedFreelancers);
      setEvents(loadedEvents);
      setSelectedFreelancerIds([]);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao carregar profissionais.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const eventId = String(form.get("eventId") ?? "");
    setError("");
    setSelectedEventId(eventId);

    try {
      const data = await apiRequest<Freelancer[]>(
        `/api/events/available-freelancers?startsAt=${encodeURIComponent(
          String(form.get("startsAt")),
        )}&endsAt=${encodeURIComponent(String(form.get("endsAt")))}&skillId=${encodeURIComponent(
          String(form.get("skillId")),
        )}`,
      );
      setFreelancers(data);
      setSelectedFreelancerIds([]);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao buscar profissionais.",
      );
    }
  }

  async function inviteFreelancer(freelancerId: string) {
    const eventId = selectedEventId || events[0]?.id;

    if (!eventId) {
      setError("Selecione um evento antes de enviar convites.");
      return;
    }

    try {
      await apiRequest("/api/invitations", {
        method: "POST",
        body: JSON.stringify({
          eventId,
          freelancerId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          message: "Convite enviado pela plataforma NEXO.",
        }),
      });
      setSuccess("Convite enviado.");
      setSelectedFreelancerIds((current) =>
        current.filter((item) => item !== freelancerId),
      );
      await loadProfessionals();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao enviar convite.",
      );
    }
  }

  async function inviteSelectedFreelancers() {
    const eventId = selectedEventId || events[0]?.id;

    if (!eventId) {
      setError("Selecione um evento antes de enviar convites.");
      return;
    }

    if (!selectedFreelancerIds.length) {
      setError("Selecione pelo menos um profissional.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const result = await apiRequest<{
        totals: { invited: number; skipped: number };
      }>("/api/invitations/bulk", {
        method: "POST",
        body: JSON.stringify({
          eventId,
          freelancerIds: selectedFreelancerIds,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          message: "Convite enviado pela plataforma NEXO.",
        }),
      });
      setSelectedFreelancerIds([]);
      setSuccess(
        `${result.totals.invited} convite(s) enviado(s). ${result.totals.skipped} ignorado(s).`,
      );
      await loadProfessionals();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao enviar convites.",
      );
    }
  }

  function toggleFreelancerSelection(freelancerId: string) {
    setSelectedFreelancerIds((current) =>
      current.includes(freelancerId)
        ? current.filter((item) => item !== freelancerId)
        : [...current, freelancerId],
    );
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={loadProfessionals} />}
      eyebrow={session.user.role}
      title="Profissionais"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando profissionais...</EmptyState> : null}

      <section className="dashboard-grid">
        {session.user.role === "COMPANY" ? (
          <article className="panel">
            <div className="panel-header">
              <h2>Buscar disponíveis</h2>
              <Search size={18} />
            </div>
            <form className="form compact" onSubmit={handleSearch}>
              <Field label="Evento para convite">
                <select name="eventId" defaultValue={selectedEventId} required>
                  <option value="" disabled>
                    Selecione um evento
                  </option>
                  {events.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="form-grid">
                <Field label="Início">
                  <input name="startsAt" type="datetime-local" required />
                </Field>
                <Field label="Fim">
                  <input name="endsAt" type="datetime-local" required />
                </Field>
              </div>
              <Field label="Especialidade">
                <select name="skillId" required>
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </select>
              </Field>
              <button className="secondary-button full" type="submit">
                Buscar disponíveis
              </button>
            </form>
          </article>
        ) : null}

        <article className="panel report-panel">
          <div className="panel-header">
            <h2>Base de profissionais</h2>
            <div className="row-actions">
              {session.user.role === "COMPANY" ? (
                <button
                  className="icon-action"
                  disabled={!selectedFreelancerIds.length}
                  onClick={inviteSelectedFreelancers}
                  type="button"
                >
                  <Send size={14} />
                  Convidar selecionados
                </button>
              ) : null}
              <UsersRound size={18} />
            </div>
          </div>
          <div className="list">
            {freelancers.map((freelancer) => (
              <div className="list-row" key={freelancer.id}>
                <div className="selectable-row-content">
                  {session.user.role === "COMPANY" ? (
                    <input
                      aria-label={`Selecionar ${freelancer.displayName ?? "profissional"}`}
                      checked={selectedFreelancerIds.includes(freelancer.id)}
                      className="compact-checkbox"
                      disabled={freelancer.isAvailable === false}
                      onChange={() => toggleFreelancerSelection(freelancer.id)}
                      type="checkbox"
                    />
                  ) : null}
                  <div>
                    <strong>{freelancer.displayName ?? "Profissional"}</strong>
                    <span>
                      {freelancer.city ?? "Cidade não informada"}
                      {freelancer.dailyRateCents
                        ? ` - ${formatCurrency(freelancer.dailyRateCents)}`
                        : ""}
                      {freelancer.isAvailable === false
                        ? ` - ${freelancer.blockingReason}`
                        : ""}
                    </span>
                  </div>
                </div>
                {session.user.role === "COMPANY" ? (
                  <button
                    className="icon-action"
                    disabled={freelancer.isAvailable === false}
                    onClick={() => inviteFreelancer(freelancer.id)}
                  >
                    {freelancer.isAvailable === false
                      ? "Indisponível"
                      : "Convidar"}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </section>
    </DashboardShell>
  );
}
