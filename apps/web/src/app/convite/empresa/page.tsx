"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { apiRequest } from "../../../lib/api";

function CompanyInvitationAcceptForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function acceptInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await apiRequest<{ email: string; company: string }>(
        "/api/companies/team/invitations/accept",
        {
          method: "POST",
          body: JSON.stringify({ token, name, phone, password }),
        },
      );
      setMessage(
        `Acesso criado para ${result.email} em ${result.company}. Você já pode entrar.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao aceitar convite.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-topbar">
        <Link href="/" className="brand">
          <span className="brand-mark">N</span>
          <span>NEXO</span>
        </Link>
      </div>

      <section className="auth-card">
        <p className="eyebrow">Convite de empresa</p>
        <h1>Entrar na equipe</h1>

        {error ? <p className="status-message error">{error}</p> : null}
        {message ? <p className="status-message success">{message}</p> : null}

        <form className="form" onSubmit={acceptInvitation}>
          <label className="field">
            <span>Nome</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Telefone</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button
            className="primary-button full"
            disabled={loading || !token}
            type="submit"
          >
            {loading ? "Confirmando..." : "Aceitar convite"}
          </button>
        </form>

        <div className="auth-links">
          <Link href="/login">Ir para login</Link>
        </div>
      </section>
    </main>
  );
}

export default function CompanyInvitationAcceptPage() {
  return (
    <Suspense fallback={null}>
      <CompanyInvitationAcceptForm />
    </Suspense>
  );
}
