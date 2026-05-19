"use client";

import { CalendarDays, Settings, Star } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { ListPanel } from "../../../components/dashboard-widgets";
import { EmptyState, Field, StatusMessage } from "../../../components/ui";
import { apiRequest, formatCurrency } from "../../../lib/api";
import type {
  AvailabilityItem,
  CompanyProfile,
  FreelancerProfile,
  Skill,
} from "../../../lib/dashboard-types";

export default function ProfilePage() {
  const session = useRequiredSession();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [availability, setAvailability] = useState<AvailabilityItem[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
    null,
  );
  const [freelancerProfile, setFreelancerProfile] =
    useState<FreelancerProfile | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadProfile();
  }, [session]);

  async function loadProfile() {
    setError("");
    setLoading(true);

    try {
      if (session?.user.role === "COMPANY") {
        setCompanyProfile(
          await apiRequest<CompanyProfile>("/api/companies/profile"),
        );
      }

      if (session?.user.role === "FREELANCER") {
        const [loadedSkills, profile, availabilityData] = await Promise.all([
          apiRequest<Skill[]>("/api/skills"),
          apiRequest<FreelancerProfile>("/api/freelancers/profile"),
          apiRequest<AvailabilityItem[]>("/api/availability"),
        ]);
        setSkills(loadedSkills);
        setFreelancerProfile(profile);
        setAvailability(availabilityData);
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao carregar perfil.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setSuccess("");

    try {
      await apiRequest("/api/companies/profile", {
        method: "PATCH",
        body: JSON.stringify({
          companyName: String(form.get("companyName")),
          responsibleName: String(form.get("responsibleName")),
          document: String(form.get("document")),
          phone: String(form.get("phone")),
          email: String(form.get("email")),
          city: String(form.get("city")),
          state: String(form.get("state")),
        }),
      });
      setSuccess("Perfil da empresa atualizado.");
      await loadProfile();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao salvar empresa.",
      );
    }
  }

  async function handleSaveFreelancer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setSuccess("");

    try {
      await apiRequest("/api/freelancers/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: String(form.get("displayName")),
          city: String(form.get("city")),
          state: String(form.get("state")),
          tools: String(form.get("tools")),
          transportation: String(form.get("transportation")),
          dailyRateCents: Number(form.get("dailyRate")) * 100,
        }),
      });
      setSuccess("Perfil profissional atualizado.");
      await loadProfile();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao salvar perfil.",
      );
    }
  }

  async function handleSaveSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setSuccess("");

    try {
      await apiRequest("/api/freelancers/skills", {
        method: "POST",
        body: JSON.stringify({
          skills: [
            {
              skillId: String(form.get("skillId")),
              dailyRateCents: Number(form.get("dailyRate")) * 100,
            },
          ],
        }),
      });
      setSuccess("Especialidade atualizada.");
      await loadProfile();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao salvar especialidade.",
      );
    }
  }

  async function handleCreateAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setSuccess("");

    try {
      await apiRequest("/api/availability", {
        method: "POST",
        body: JSON.stringify({
          startsAt: String(form.get("startsAt")),
          endsAt: String(form.get("endsAt")),
          reason: String(form.get("reason") || "Indisponível"),
        }),
      });
      event.currentTarget.reset();
      setSuccess("Indisponibilidade adicionada.");
      await loadProfile();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao adicionar indisponibilidade.",
      );
    }
  }

  async function removeAvailability(availabilityId: string) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/availability/${availabilityId}`, {
        method: "DELETE",
      });
      setSuccess("Indisponibilidade removida.");
      await loadProfile();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao remover indisponibilidade.",
      );
    }
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={loadProfile} />}
      eyebrow={session.user.role}
      title="Perfil"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando perfil...</EmptyState> : null}

      {session.user.role === "COMPANY" && companyProfile ? (
        <CompanyProfileForm
          profile={companyProfile}
          onSubmit={handleSaveCompany}
        />
      ) : null}

      {session.user.role === "FREELANCER" ? (
        <FreelancerProfileSection
          availability={availability}
          profile={freelancerProfile}
          skills={skills}
          onCreateAvailability={handleCreateAvailability}
          onRemoveAvailability={removeAvailability}
          onSaveProfile={handleSaveFreelancer}
          onSaveSkill={handleSaveSkill}
        />
      ) : null}

      {session.user.role === "ADMIN" ? (
        <EmptyState>
          Administradores gerenciam verificações, pagamentos e disputas pelas
          telas operacionais.
        </EmptyState>
      ) : null}
    </DashboardShell>
  );
}

function CompanyProfileForm({
  profile,
  onSubmit,
}: Readonly<{
  profile: CompanyProfile;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  return (
    <section className="dashboard-grid">
      <article className="panel">
        <div className="panel-header">
          <h2>Dados da empresa</h2>
          <Settings size={18} />
        </div>
        <form className="form compact" onSubmit={onSubmit}>
          <Field label="Empresa">
            <input
              name="companyName"
              defaultValue={profile.companyName}
              required
            />
          </Field>
          <Field label="Responsável">
            <input
              name="responsibleName"
              defaultValue={profile.responsibleName}
              required
            />
          </Field>
          <Field label="CNPJ">
            <input name="document" defaultValue={profile.document ?? ""} />
          </Field>
          <div className="form-grid">
            <Field label="Cidade">
              <input name="city" defaultValue={profile.city ?? ""} />
            </Field>
            <Field label="UF">
              <input
                name="state"
                defaultValue={profile.state ?? ""}
                maxLength={2}
              />
            </Field>
          </div>
          <Field label="Telefone">
            <input name="phone" defaultValue={profile.phone ?? ""} />
          </Field>
          <Field label="E-mail">
            <input
              name="email"
              type="email"
              defaultValue={profile.email}
              required
            />
          </Field>
          <button className="primary-button full" type="submit">
            Salvar empresa
          </button>
        </form>
      </article>
    </section>
  );
}

function FreelancerProfileSection({
  availability,
  profile,
  skills,
  onCreateAvailability,
  onRemoveAvailability,
  onSaveProfile,
  onSaveSkill,
}: Readonly<{
  availability: AvailabilityItem[];
  profile: FreelancerProfile | null;
  skills: Skill[];
  onCreateAvailability: (event: FormEvent<HTMLFormElement>) => void;
  onRemoveAvailability: (availabilityId: string) => void;
  onSaveProfile: (event: FormEvent<HTMLFormElement>) => void;
  onSaveSkill: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  return (
    <section className="dashboard-grid">
      <article className="panel">
        <div className="panel-header">
          <h2>Dados profissionais</h2>
          <Settings size={18} />
        </div>
        <form className="form compact" onSubmit={onSaveProfile}>
          <Field label="Nome profissional">
            <input
              name="displayName"
              defaultValue={profile?.displayName ?? ""}
            />
          </Field>
          <div className="form-grid">
            <Field label="Cidade">
              <input name="city" defaultValue={profile?.city ?? ""} />
            </Field>
            <Field label="UF">
              <input
                name="state"
                defaultValue={profile?.state ?? ""}
                maxLength={2}
              />
            </Field>
          </div>
          <Field label="Ferramentas/equipamentos">
            <input name="tools" defaultValue={profile?.tools ?? ""} />
          </Field>
          <Field label="Transporte">
            <input
              name="transportation"
              defaultValue={profile?.transportation ?? ""}
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
          <button className="primary-button full" type="submit">
            Salvar perfil
          </button>
        </form>
      </article>

      <article className="panel">
        <div className="panel-header">
          <h2>Especialidade e diária</h2>
          <Star size={18} />
        </div>
        <form className="form compact" onSubmit={onSaveSkill}>
          <Field label="Especialidade principal">
            <select
              name="skillId"
              defaultValue={profile?.skills[0]?.skill.id ?? ""}
              required
            >
              <option value="" disabled>
                Selecione uma especialidade
              </option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Diária para essa função">
            <input
              name="dailyRate"
              type="number"
              min={0}
              defaultValue={
                (profile?.skills[0]?.dailyRateCents ??
                  profile?.dailyRateCents ??
                  0) / 100
              }
              required
            />
          </Field>
          <button className="primary-button full" type="submit">
            Salvar especialidade
          </button>
        </form>
        <div className="list">
          {profile?.skills.map((item) => (
            <div className="list-row" key={item.skill.id}>
              <div>
                <strong>{item.skill.name}</strong>
                <span>{formatCurrency(item.dailyRateCents)}</span>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="panel report-panel">
        <div className="panel-header">
          <h2>Indisponibilidade</h2>
          <CalendarDays size={18} />
        </div>
        <form className="form compact" onSubmit={onCreateAvailability}>
          <div className="form-grid">
            <Field label="Início">
              <input name="startsAt" type="datetime-local" required />
            </Field>
            <Field label="Fim">
              <input name="endsAt" type="datetime-local" required />
            </Field>
          </div>
          <Field label="Motivo">
            <input name="reason" placeholder="Outro evento, viagem..." />
          </Field>
          <button className="secondary-button full" type="submit">
            Bloquear agenda
          </button>
        </form>
        <div className="list">
          {availability.map((item) => (
            <div className="list-row" key={item.id}>
              <div>
                <strong>{item.reason ?? "Indisponível"}</strong>
                <span>
                  {new Date(item.startsAt).toLocaleString("pt-BR")} -{" "}
                  {new Date(item.endsAt).toLocaleString("pt-BR")}
                </span>
              </div>
              <button
                className="icon-action ghost"
                onClick={() => onRemoveAvailability(item.id)}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
