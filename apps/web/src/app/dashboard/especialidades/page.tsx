"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Settings, Star } from "lucide-react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import {
  ConfirmationDialog,
  EmptyState,
  Field,
  StatusMessage,
} from "../../../components/ui";
import { apiRequest, formatCurrency } from "../../../lib/api";
import type { FreelancerProfile, Skill } from "../../../lib/dashboard-types";

export default function SpecialtiesPage() {
  const session = useRequiredSession();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [profile, setProfile] = useState<FreelancerProfile | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillPendingDelete, setSkillPendingDelete] = useState<Skill | null>(
    null,
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const hasLoadedRef = useRef(false);

  const loadSpecialties = useCallback(async () => {
    setError("");
    if (!hasLoadedRef.current) {
      setLoading(true);
    }

    try {
      if (session?.user.role === "ADMIN") {
        setSkills(await apiRequest<Skill[]>("/api/skills"));
        setProfile(null);
        return;
      }

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
      hasLoadedRef.current = true;
      setHasLoaded(true);
    }
  }, [session?.user.role]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadSpecialties();
  }, [loadSpecialties, session]);

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

  async function handleSavePlatformSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name") || "").trim();
    const description = String(form.get("description") || "").trim();
    setError("");
    setSuccess("");

    if (!name) {
      setError("Informe o nome da especialidade.");
      return;
    }

    try {
      await apiRequest(
        editingSkill ? `/api/skills/${editingSkill.id}` : "/api/skills",
        {
          method: editingSkill ? "PATCH" : "POST",
          body: JSON.stringify({ name, description }),
        },
      );
      formElement.reset();
      setEditingSkill(null);
      setSuccess(
        editingSkill ? "Especialidade atualizada." : "Especialidade criada.",
      );
      await loadSpecialties();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao salvar especialidade.",
      );
    }
  }

  async function confirmDeletePlatformSkill() {
    if (!skillPendingDelete) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const result = await apiRequest<{
        deleted?: boolean;
        deactivated?: boolean;
      }>(`/api/skills/${skillPendingDelete.id}`, { method: "DELETE" });
      if (editingSkill?.id === skillPendingDelete.id) {
        setEditingSkill(null);
      }
      setSkillPendingDelete(null);
      setSuccess(
        result.deactivated
          ? "Especialidade desativada. Ela não aparecerá mais para novos usos."
          : "Especialidade excluída.",
      );
      await loadSpecialties();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao excluir especialidade.",
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
      {loading && !hasLoaded ? (
        <EmptyState>Carregando especialidades...</EmptyState>
      ) : null}

      {session.user.role === "COMPANY" ? (
        <EmptyState>
          Especialidades são cadastradas pela administração da plataforma.
        </EmptyState>
      ) : null}

      {session.user.role === "ADMIN" ? (
        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Base da plataforma</span>
                <h2>
                  {editingSkill
                    ? "Editar especialidade"
                    : "Criar especialidade"}
                </h2>
              </div>
              <Settings size={18} />
            </div>
            <p className="form-note">
              Cadastre aqui as funções que empresas poderão solicitar nos
              eventos e freelancers poderão adicionar ao currículo.
            </p>
            <form
              className="form compact"
              key={editingSkill?.id ?? "create-skill"}
              onSubmit={handleSavePlatformSkill}
            >
              <Field label="Nome da especialidade">
                <input
                  name="name"
                  defaultValue={editingSkill?.name ?? ""}
                  placeholder="Ex.: Áudio, Iluminação, Fotografia"
                  required
                />
              </Field>
              <Field label="Descrição">
                <textarea
                  name="description"
                  defaultValue={editingSkill?.description ?? ""}
                  placeholder="Explique rapidamente quando essa função deve ser usada."
                  rows={4}
                />
              </Field>
              <button className="primary-button full" type="submit">
                {editingSkill ? "Salvar alterações" : "Criar especialidade"}
              </button>
              {editingSkill ? (
                <button
                  className="secondary-button full"
                  onClick={() => setEditingSkill(null)}
                  type="button"
                >
                  Cancelar edição
                </button>
              ) : null}
            </form>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Disponíveis no sistema</span>
                <h2>Especialidades cadastradas</h2>
              </div>
              <Star size={18} />
            </div>
            <div className="list">
              {skills.length ? (
                skills.map((skill) => (
                  <div className="list-row" key={skill.id}>
                    <div>
                      <strong>{skill.name}</strong>
                      <span>{skill.description || "Sem descrição."}</span>
                    </div>
                    <div className="row-actions list-row-actions">
                      <button
                        className="icon-action edit-action"
                        onClick={() => setEditingSkill(skill)}
                        type="button"
                      >
                        Editar
                      </button>
                      <button
                        className="icon-action danger-action"
                        onClick={() => setSkillPendingDelete(skill)}
                        type="button"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState>
                  Nenhuma especialidade cadastrada. Crie a primeira para liberar
                  criação de eventos e currículo freelancer.
                </EmptyState>
              )}
            </div>
          </article>
        </section>
      ) : null}

      <ConfirmationDialog
        confirmLabel="Excluir especialidade"
        dangerous
        description={
          <>
            Você está prestes a remover{" "}
            <strong>{skillPendingDelete?.name}</strong> da base de
            especialidades disponíveis. Se ela já estiver vinculada a eventos ou
            freelancers, o sistema vai apenas desativar para novos cadastros e
            manter o histórico preservado.
          </>
        }
        isOpen={Boolean(skillPendingDelete)}
        onCancel={() => setSkillPendingDelete(null)}
        onConfirm={confirmDeletePlatformSkill}
        title="Excluir especialidade?"
      />

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
