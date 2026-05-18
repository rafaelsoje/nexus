"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthCard } from "../../components/auth-card";
import { Field, StatusMessage } from "../../components/ui";
import { apiRequest, saveSession, type AuthSession } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const session = await apiRequest<AuthSession>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      saveSession(session);
      router.push("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Entrar"
      subtitle="Acesse a operação da sua empresa, freelancer ou admin."
    >
      <form className="form" onSubmit={handleSubmit}>
        <Field label="E-mail">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
          />
        </Field>
        <Field label="Senha">
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
          />
        </Field>
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        <button
          className="primary-button full"
          disabled={loading}
          type="submit"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <div className="auth-links">
        <Link href="/cadastro/empresa">Cadastrar empresa</Link>
        <Link href="/cadastro/freelancer">Cadastrar freelancer</Link>
        <Link href="/recuperar-senha">Recuperar senha</Link>
      </div>
    </AuthCard>
  );
}
