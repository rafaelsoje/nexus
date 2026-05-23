"use client";

import { FormEvent, useEffect, useState } from "react";
import { Settings, Star } from "lucide-react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { EmptyState, Field, StatusMessage } from "../../../components/ui";
import { apiRequest, formatCurrency } from "../../../lib/api";
import type { FreelancerProfile, Skill } from "../../../lib/dashboard-types";

export default function SpecialtiesPage() {
  const session = useRequiredSession();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [profile, setProfile] = useState<FreelancerProfile | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadSpecialties();
  }, [session]);

  async function loadSpecialties() {
    setError("");
    setLoading(true);

    try {
      if (session?.user.role !== "FREELANCER") {
        setLoading(false);
        return;
      }

      const [loadedSkills, loadedProfile] = await Promise.all([
        apiRequest<Skill[]>("/api/skills"),
        apiRequest<FreelancerProfile>("/api/freelancers/profile"),
      ]);
      setSkills(loadedSkills);
      setProfile(loadedProfile);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao carregar especialidades.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveResume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setSuccess("");

    try {
      await apiRequest("/api/freelancers/profile", {
        method: "PATCH",
        body: JSON.stringify({
          tools: String(form.get("tools")),
          dailyRateCents: Number(form.get("dailyRate")) * 100,
          professionalSummary: String(form.get("professionalSummary")),
          experienceYears: Number(form.get("experienceYears") || 0),
          eventTypes: String(form.get("eventTypes")),
          certifications: String(form.get("certifications")),
          portfolioUrl: String(form.get("portfolioUrl")),
          travelAvailability: String(form.get("travelAvailability")),
        }),
      });
      setSuccess("Currículo profissional atualizado.");
      await loadSpecialties();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao salvar currículo.",
      );
    }
  }

  async function handleSaveSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const skillId = String(form.get("skillId"));
    setError("");
    setSuccess("");

    if (!skillId) {
      setError("Selecione uma especialidade.");
      return;
    }

    try {
      await apiRequest("/api/freelancers/skills", {
        method: "POST",
        body: JSON.stringify({
          skills: [
            ...(profile?.skills ?? [])
              .filter((item) => item.skill.id !== skillId)
              .map((item) => ({
                skillId: item.skill.id,
                dailyRateCents: item.dailyRateCents,
                knowledgeLevel: item.knowledgeLevel,
                experienceSummary: item.experienceSummary,
                equipment: item.equipment,
                courses: item.courses,
                abilities: item.abilities,
              })),
            {
              skillId,
              dailyRateCents: Number(form.get("dailyRate")) * 100,
              knowledgeLevel: String(form.get("knowledgeLevel")),
              experienceSummary: String(form.get("experienceSummary")),
              equipment: String(form.get("equipment")),
              courses: String(form.get("courses")),
              abilities: splitLines(String(form.get("abilities"))),
            },
          ],
        }),
      });
      formElement.reset();
      setSuccess("Especialidade adicionada.");
      await loadSpecialties();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao salvar especialidade.",
      );
    }
  }

  async function handleRemoveSkill(skillId: string) {
    setError("");
    setSuccess("");

    try {
      await apiRequest("/api/freelancers/skills", {
        method: "POST",
        body: JSON.stringify({
          skills: (profile?.skills ?? [])
            .filter((item) => item.skill.id !== skillId)
            .map((item) => ({
              skillId: item.skill.id,
              dailyRateCents: item.dailyRateCents,
              knowledgeLevel: item.knowledgeLevel,
              experienceSummary: item.experienceSummary,
              equipment: item.equipment,
              courses: item.courses,
              abilities: item.abilities,
            })),
        }),
      });
      setSuccess("Especialidade removida.");
      await loadSpecialties();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao remover especialidade.",
      );
    }
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={loadSpecialties} />}
      eyebrow={session.user.role}
      title="Especialidades"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando especialidades...</EmptyState> : null}

      {session.user.role !== "FREELANCER" ? (
        <EmptyState>
          Especialidades e diárias são usadas apenas no perfil freelancer.
        </EmptyState>
      ) : null}

      {session.user.role === "FREELANCER" ? (
        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Currículo profissional</h2>
              <Settings size={18} />
            </div>
            <form className="form compact" onSubmit={handleSaveResume}>
              <Field label="Resumo profissional">
                <textarea
                  name="professionalSummary"
                  defaultValue={profile?.professionalSummary ?? ""}
                  placeholder="Ex.: profissional com experiência em eventos corporativos, casamentos, shows, atendimento ao público, operação técnica ou apoio de produção."
                  rows={4}
                />
              </Field>
              <div className="form-grid">
                <Field label="Anos de experiência">
                  <input
                    name="experienceYears"
                    type="number"
                    min={0}
                    defaultValue={profile?.experienceYears ?? 0}
                  />
                </Field>
                <Field label="Diária base">
                  <input
                    name="dailyRate"
                    type="number"
                    min={0}
                    defaultValue={(profile?.dailyRateCents ?? 0) / 100}
                  />
                </Field>
              </div>
              <Field label="Tipos de evento que já fez">
                <input
                  name="eventTypes"
                  defaultValue={profile?.eventTypes ?? ""}
                  placeholder="Ex.: shows, congressos, casamentos, festivais"
                />
              </Field>
              <Field label="Ferramentas/equipamentos gerais">
                <input
                  name="tools"
                  defaultValue={profile?.tools ?? ""}
                  placeholder="Ex.: EPI, rádio, notebook, equipamentos próprios, ferramentas de apoio"
                />
              </Field>
              <Field label="Cursos e certificações gerais">
                <textarea
                  name="certifications"
                  defaultValue={profile?.certifications ?? ""}
                  placeholder="Cursos, treinamentos, certificados e formações relevantes"
                  rows={3}
                />
              </Field>
              <div className="form-grid">
                <Field label="Portfólio / Instagram / site">
                  <input
                    name="portfolioUrl"
                    defaultValue={profile?.portfolioUrl ?? ""}
                    placeholder="https://..."
                  />
                </Field>
                <Field label="Disponibilidade para viagem">
                  <input
                    name="travelAvailability"
                    defaultValue={profile?.travelAvailability ?? ""}
                    placeholder="Ex.: Sergipe e Bahia"
                  />
                </Field>
              </div>
              <button className="primary-button full" type="submit">
                Salvar currículo
              </button>
            </form>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h2>Especialidades e diárias</h2>
              <Star size={18} />
            </div>
            <form className="form compact" onSubmit={handleSaveSkill}>
              <Field label="Adicionar especialidade">
                <select name="skillId" defaultValue="" required>
                  <option value="" disabled>
                    Selecione uma especialidade
                  </option>
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                      {profile?.skills.some(
                        (item) => item.skill.id === skill.id,
                      )
                        ? " (já adicionada)"
                        : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Diária para essa função">
                <input
                  name="dailyRate"
                  type="number"
                  min={0}
                  defaultValue={(profile?.dailyRateCents ?? 0) / 100}
                  required
                />
              </Field>
              <Field label="Nível nessa especialidade">
                <select name="knowledgeLevel" defaultValue="">
                  <option value="">Não informado</option>
                  <option value="Iniciante">Iniciante</option>
                  <option value="Intermediário">Intermediário</option>
                  <option value="Avançado">Avançado</option>
                  <option value="Especialista">Especialista</option>
                </select>
              </Field>
              <Field label="O que você domina nessa especialidade">
                <textarea
                  name="abilities"
                  placeholder="Uma habilidade por linha. Ex.: atendimento ao público&#10;montagem e desmontagem&#10;operação de equipamento&#10;primeiros socorros&#10;organização de equipe"
                  rows={4}
                />
              </Field>
              <Field label="Experiência prática nessa especialidade">
                <textarea
                  name="experienceSummary"
                  placeholder="Conte os tipos de evento, porte das equipes, responsabilidades assumidas e situações que você sabe resolver"
                  rows={3}
                />
              </Field>
              <Field label="Equipamentos, ferramentas ou procedimentos">
                <input
                  name="equipment"
                  placeholder="Ex.: rádio comunicador, EPI, bandeja, check-in, credenciamento, softwares, ferramentas ou equipamentos técnicos"
                />
              </Field>
              <Field label="Cursos específicos dessa especialidade">
                <textarea
                  name="courses"
                  placeholder="Cursos, treinamentos e certificações ligados a essa função"
                  rows={3}
                />
              </Field>
              <button className="primary-button full" type="submit">
                Adicionar ou atualizar especialidade
              </button>
            </form>
            <div className="list">
              {profile?.skills.length ? (
                profile.skills.map((item) => (
                  <div className="list-row" key={item.skill.id}>
                    <div>
                      <strong>{item.skill.name}</strong>
                      <span>
                        {formatCurrency(item.dailyRateCents)}
                        {item.knowledgeLevel ? ` - ${item.knowledgeLevel}` : ""}
                      </span>
                      {item.abilities?.length ? (
                        <span>Domina: {item.abilities.join(", ")}</span>
                      ) : null}
                      {item.equipment ? (
                        <span>Recursos: {item.equipment}</span>
                      ) : null}
                      {item.courses ? (
                        <span>Cursos: {item.courses}</span>
                      ) : null}
                      {item.experienceSummary ? (
                        <span>{item.experienceSummary}</span>
                      ) : null}
                    </div>
                    <button
                      className="icon-action ghost"
                      onClick={() => handleRemoveSkill(item.skill.id)}
                      type="button"
                    >
                      Remover
                    </button>
                  </div>
                ))
              ) : (
                <EmptyState>Nenhuma especialidade adicionada.</EmptyState>
              )}
            </div>
          </article>
        </section>
      ) : null}
    </DashboardShell>
  );
}

function splitLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}
