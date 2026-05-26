"use client";

import { Bell, CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { ListPanel } from "../../../components/dashboard-widgets";
import { EmptyState, StatusMessage } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import type { NotificationItem } from "../../../lib/dashboard-types";

export default function NotificationsPage() {
  const session = useRequiredSession();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.readAt).length,
    [notifications],
  );

  const loadNotifications = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      setNotifications(
        await apiRequest<NotificationItem[]>("/api/notifications"),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao carregar notificações.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadNotifications();
  }, [loadNotifications, session]);

  async function markAsRead(notificationId: string) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
      setSuccess("Notificação marcada como lida.");
      await loadNotifications();
      window.dispatchEvent(new Event("nexus:notifications-updated"));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao atualizar notificação.",
      );
    }
  }

  async function markAllAsRead() {
    const unread = notifications.filter((item) => !item.readAt);
    setError("");
    setSuccess("");

    try {
      await Promise.all(
        unread.map((item) =>
          apiRequest(`/api/notifications/${item.id}/read`, {
            method: "PATCH",
          }),
        ),
      );
      setSuccess("Notificações marcadas como lidas.");
      await loadNotifications();
      window.dispatchEvent(new Event("nexus:notifications-updated"));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao atualizar notificações.",
      );
    }
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={loadNotifications} />}
      eyebrow={session.user.role}
      title="Notificações"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando notificações...</EmptyState> : null}

      <section className="metrics">
        <article className="metric">
          <span>Não lidas</span>
          <strong>{unreadCount}</strong>
        </article>
        <article className="metric">
          <span>Total</span>
          <strong>{notifications.length}</strong>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel report-panel">
          <div className="panel-header">
            <h2>Ações</h2>
            <CheckCircle2 size={18} />
          </div>
          <div className="button-row">
            <button
              className="secondary-button"
              disabled={!unreadCount}
              onClick={markAllAsRead}
              type="button"
            >
              Marcar todas como lidas
            </button>
          </div>
        </article>

        <ListPanel icon={<Bell size={18} />} title="Central de notificações">
          {notifications.map((notification) => (
            <div
              className={`list-row ${notification.readAt ? "" : "unread-row"}`}
              key={notification.id}
            >
              <div>
                <strong>{notification.title}</strong>
                <span>
                  {notification.body ?? notification.type} -{" "}
                  {new Date(notification.createdAt).toLocaleString("pt-BR")}
                </span>
              </div>
              {notification.readAt ? (
                <small>Lida</small>
              ) : (
                <button
                  className="icon-action"
                  onClick={() => markAsRead(notification.id)}
                >
                  Marcar como lida
                </button>
              )}
            </div>
          ))}
        </ListPanel>
      </section>
    </DashboardShell>
  );
}
