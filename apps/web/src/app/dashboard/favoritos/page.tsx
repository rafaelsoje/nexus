"use client";

import { Star, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { EmptyState, StatusMessage } from "../../../components/ui";
import { apiRequest, formatCurrency } from "../../../lib/api";
import type { Freelancer } from "../../../lib/dashboard-types";

export default function FavoritesPage() {
  const session = useRequiredSession();
  const [favorites, setFavorites] = useState<Freelancer[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const groupedFavorites = useMemo(
    () => groupFavoritesBySkill(favorites),
    [favorites],
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadFavorites();
  }, [session]);

  async function loadFavorites() {
    setError("");
    setLoading(true);

    try {
      setFavorites(await apiRequest<Freelancer[]>("/api/freelancers/favorites"));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao carregar favoritos.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function removeFavorite(freelancerId: string) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/freelancers/${freelancerId}/favorite`, {
        method: "DELETE",
      });
      setFavorites((current) =>
        current.filter((freelancer) => freelancer.id !== freelancerId),
      );
      setSuccess("Profissional removido dos favoritos.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao remover favorito.",
      );
    }
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={loadFavorites} />}
      eyebrow={session.user.role}
      title="Favoritos"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando favoritos...</EmptyState> : null}

      {!loading && !favorites.length ? (
        <EmptyState>Nenhum profissional favoritado ainda.</EmptyState>
      ) : null}

      {!loading && favorites.length ? (
        <section className="dashboard-grid">
          {groupedFavorites.map((group) => (
            <article className="panel report-panel" key={group.skillName}>
              <div className="panel-header">
                <h2>{group.skillName}</h2>
                <UsersRound size={18} />
              </div>
              <div className="list">
                {group.freelancers.map((freelancer) => (
                  <div className="list-row" key={freelancer.id}>
                    <div className="selectable-row-content">
                      <div className="profile-avatar small" aria-hidden="true">
                        {freelancer.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt="" src={freelancer.avatarUrl} />
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
                      </div>
                    </div>
                    <button
                      className="icon-action favorite active"
                      onClick={() => removeFavorite(freelancer.id)}
                      type="button"
                    >
                      <Star size={14} />
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </DashboardShell>
  );
}

function groupFavoritesBySkill(favorites: Freelancer[]) {
  const groups = new Map<string, Freelancer[]>();

  favorites.forEach((freelancer) => {
    const skills = freelancer.skills?.length
      ? freelancer.skills.map((item) => item.skill.name)
      : ["Sem especialidade"];

    skills.forEach((skillName) => {
      groups.set(skillName, [...(groups.get(skillName) ?? []), freelancer]);
    });
  });

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "pt-BR"))
    .map(([skillName, freelancers]) => ({
      skillName,
      freelancers,
    }));
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
