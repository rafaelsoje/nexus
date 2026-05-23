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

    if (session.user.role === "FREELANCER") {
      setLoading(false);
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
    const params = new URLSearchParams({
      startsAt: String(form.get("startsAt")),
      endsAt: String(form.get("endsAt")),
    });
    const optionalFilters = [
      ["skillId", String(form.get("skillId") ?? "")],
      ["city", String(form.get("city") ?? "")],
      ["search", String(form.get("search") ?? "")],
      ["tools", String(form.get("tools") ?? "")],
      ["transportation", String(form.get("transportation") ?? "")],
      ["minDailyRateCents", centsFromCurrencyInput(form.get("minDailyRate"))],
      ["maxDailyRateCents", centsFromCurrencyInput(form.get("maxDailyRate"))],
    ];
    setError("");
    setSelectedEventId(eventId);

    try {
      optionalFilters.forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });

      const data = await apiRequest<Freelancer[]>(
        `/api/events/available-freelancers?${params.toString()}`,
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

  if (session.user.role === "FREELANCER") {
    return (
      <DashboardShell eyebrow={session.user.role} title="Profissionais">
        <EmptyState>
          A busca e o convite de profissionais ficam disponíveis para empresas.
          Para acompanhar trabalhos, use Oportunidades, Convites e Agenda.
        </EmptyState>
      </DashboardShell>
    );
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
                <select name="skillId" defaultValue="">
                  <option value="">Todas</option>
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="form-grid">
                <Field label="Nome ou apelido">
                  <input
                    name="search"
                    placeholder="Ex.: Alexandre, DJ, foto..."
                  />
                </Field>
                <Field label="Cidade">
                  <input name="city" placeholder="Ex.: Aracaju" />
                </Field>
              </div>
              <div className="form-grid">
                <Field label="Diária mínima">
                  <input min={0} name="minDailyRate" type="number" />
                </Field>
                <Field label="Diária máxima">
                  <input min={0} name="maxDailyRate" type="number" />
                </Field>
              </div>
              <div className="form-grid">
                <Field label="Ferramentas/habilidades">
                  <input name="tools" placeholder="Ex.: mesa, câmera, LED" />
                </Field>
                <Field label="Transporte">
                  <input name="transportation" placeholder="Ex.: carro" />
                </Field>
              </div>
              <button className="secondary-button full" type="submit">
                Buscar profissionais
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
                  <div className="profile-avatar small" aria-hidden="true">
                    {freelancer.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        src={freelancer.avatarUrl}
                      />
                    ) : (
                      <span>
                        {getInitials(
                          freelancer.displayName ?? freelancer.user?.name,
                        )}
                      </span>
                    )}
                  </div>
                  <div>
                    <strong>
                      {freelancer.displayName ??
                        freelancer.user?.name ??
                        "Profissional"}
                    </strong>
                    <span>
                      {freelancer.city ?? "Cidade não informada"}
                      {freelancer.dailyRateCents
                        ? ` - ${formatCurrency(freelancer.dailyRateCents)}`
                        : ""}
                      {freelancer.isAvailable === false
                        ? ` - ${freelancer.blockingReason}`
                        : ""}
                    </span>
                    <span>
                      {(freelancer.skills ?? [])
                        .map(
                          ({ dailyRateCents, knowledgeLevel, skill }) =>
                            `${skill.name}${knowledgeLevel ? ` (${knowledgeLevel})` : ""}${
                              dailyRateCents
                                ? ` - ${formatCurrency(dailyRateCents)}`
                                : ""
                            }`,
                        )
                        .join(", ") || "Especialidades não informadas"}
                    </span>
                    {freelancer.professionalSummary ? (
                      <span>{freelancer.professionalSummary}</span>
                    ) : null}
                    <span>
                      {[
                        freelancer.experienceYears
                          ? `${freelancer.experienceYears} ano(s) de experiência`
                          : "",
                        freelancer.eventTypes
                          ? `Eventos: ${freelancer.eventTypes}`
                          : "",
                        freelancer.travelAvailability
                          ? `Viagem: ${freelancer.travelAvailability}`
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" - ") || "Currículo técnico não informado"}
                    </span>
                    <span>
                      {freelancer.tools
                        ? `Ferramentas: ${freelancer.tools}`
                        : "Ferramentas não informadas"}
                      {freelancer.transportation
                        ? ` - Transporte: ${freelancer.transportation}`
                        : ""}
                    </span>
                    {freelancer.skills?.some(
                      (item) =>
                        item.abilities?.length ||
                        item.equipment ||
                        item.courses ||
                        item.experienceSummary,
                    ) ? (
                      <span>
                        Detalhes técnicos:{" "}
                        {freelancer.skills
                          .filter(
                            (item) =>
                              item.abilities?.length ||
                              item.equipment ||
                              item.courses ||
                              item.experienceSummary,
                          )
                          .map((item) =>
                            [
                              item.skill.name,
                              item.abilities?.length
                                ? item.abilities.join(", ")
                                : "",
                              item.equipment ? `equip.: ${item.equipment}` : "",
                              item.courses ? `cursos: ${item.courses}` : "",
                            ]
                              .filter(Boolean)
                              .join(" - "),
                          )
                          .join(" | ")}
                      </span>
                    ) : null}
                    {freelancer.certifications ? (
                      <span>Certificações: {freelancer.certifications}</span>
                    ) : null}
                    {freelancer.portfolioUrl ? (
                      <span>Portfólio: {freelancer.portfolioUrl}</span>
                    ) : null}
                    {freelancer.contracts?.length ? (
                      <span>
                        Histórico na plataforma:{" "}
                        {freelancer.contracts
                          .map((contract) =>
                            [
                              contract.event?.name ?? "Evento",
                              contract.event?.company?.companyName,
                              contract.event?.city,
                            ]
                              .filter(Boolean)
                              .join(" - "),
                          )
                          .join(" | ")}
                      </span>
                    ) : null}
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

function centsFromCurrencyInput(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed * 100) : "";
}

function getInitials(name?: string) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "N"
  );
}
