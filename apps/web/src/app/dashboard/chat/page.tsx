"use client";

import { MessageCircle, Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { EmptyState, StatusMessage } from "../../../components/ui";
import { apiRequest } from "../../../lib/api";
import type { ChatThread } from "../../../lib/dashboard-types";

export default function ChatPage() {
  return (
    <Suspense fallback={<EmptyState>Carregando conversas...</EmptyState>}>
      <ChatPageContent />
    </Suspense>
  );
}

function ChatPageContent() {
  const session = useRequiredSession();
  const searchParams = useSearchParams();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const selectedThread = useMemo(
    () =>
      threads.find((thread) => thread.id === selectedThreadId) ?? threads[0],
    [selectedThreadId, threads],
  );

  useEffect(() => {
    const applicationId = searchParams.get("applicationId");
    const invitationId = searchParams.get("invitationId");

    if (!threads.length || (!applicationId && !invitationId)) {
      return;
    }

    const targetThread = threads.find(
      (thread) =>
        thread.application?.id === applicationId ||
        thread.invitation?.id === invitationId,
    );

    if (targetThread) {
      setSelectedThreadId(targetThread.id);
    }
  }, [searchParams, threads]);

  const loadThreads = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      const data =
        session?.user.role === "ADMIN"
          ? []
          : await apiRequest<ChatThread[]>("/api/chat/threads");
      setThreads(data);
      setSelectedThreadId((current) => current || data[0]?.id || "");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao carregar chat.",
      );
    } finally {
      setLoading(false);
    }
  }, [session?.user.role]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadThreads();
  }, [loadThreads, session]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = String(form.get("body") || "").trim();

    if (!selectedThread || !body) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/chat/threads/${selectedThread.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      formElement.reset();
      setSuccess("Mensagem enviada.");
      await loadThreads();
      setSelectedThreadId(selectedThread.id);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao enviar mensagem.",
      );
    }
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={loadThreads} />}
      eyebrow={session.user.role}
      title="Chat"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando conversas...</EmptyState> : null}

      {!loading && session.user.role === "ADMIN" ? (
        <EmptyState>O chat é usado por empresas e freelancers.</EmptyState>
      ) : null}

      {!loading && session.user.role !== "ADMIN" ? (
        <section className="chat-layout">
          <article className="panel chat-list-panel">
            <div className="panel-header">
              <h2>Conversas</h2>
              <MessageCircle size={18} />
            </div>
            {threads.length ? (
              <div className="chat-thread-list">
                {threads.map((thread) => (
                  <button
                    className={
                      selectedThread?.id === thread.id
                        ? "chat-thread active"
                        : "chat-thread"
                    }
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    type="button"
                  >
                    <strong>{thread.event?.name ?? "Evento"}</strong>
                    <span>{threadPeerName(thread, session.user.role)}</span>
                    <small>
                      {thread.messages.at(-1)?.body ?? "Sem mensagens ainda"}
                    </small>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState>
                Nenhuma conversa ainda. Convites e candidaturas criam chats.
              </EmptyState>
            )}
          </article>

          <article className="panel chat-panel">
            <div className="panel-header">
              <div>
                <h2>{selectedThread?.event?.name ?? "Conversa"}</h2>
                <span>{selectedThread ? threadSubtitle(selectedThread) : ""}</span>
              </div>
              <MessageCircle size={18} />
            </div>

            {selectedThread ? (
              <>
                <div className="chat-messages">
                  {selectedThread.messages.length ? (
                    selectedThread.messages.map((message) => (
                      <div
                        className={
                          message.sender?.id === session.user.id
                            ? "chat-message mine"
                            : "chat-message"
                        }
                        key={message.id}
                      >
                        <strong>{message.sender?.name ?? "Participante"}</strong>
                        <span>{message.body}</span>
                        <small>{formatDateTime(message.createdAt)}</small>
                      </div>
                    ))
                  ) : (
                    <EmptyState>Comece a negociação por aqui.</EmptyState>
                  )}
                </div>

                <form className="chat-form" onSubmit={sendMessage}>
                  <input
                    maxLength={2000}
                    name="body"
                    placeholder="Escreva uma mensagem"
                    required
                  />
                  <button className="primary-button" type="submit">
                    <Send size={18} />
                    Enviar
                  </button>
                </form>
              </>
            ) : (
              <EmptyState>Selecione uma conversa.</EmptyState>
            )}
          </article>
        </section>
      ) : null}
    </DashboardShell>
  );
}

function threadPeerName(thread: ChatThread, role: string) {
  if (role === "COMPANY") {
    return thread.freelancer?.displayName ?? thread.freelancer?.user?.name ?? "Profissional";
  }

  return thread.company?.companyName ?? "Empresa";
}

function threadSubtitle(thread: ChatThread) {
  const company = thread.company?.companyName ?? "Empresa";
  const freelancer =
    thread.freelancer?.displayName ?? thread.freelancer?.user?.name ?? "Profissional";

  return `${company} e ${freelancer}`;
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
