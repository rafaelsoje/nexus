"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthCard } from "../../../components/auth-card";
import { Field, StatusMessage } from "../../../components/ui";
import { apiRequest, saveSession, type AuthSession } from "../../../lib/api";

export default function FreelancerRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setLoading(true);

    try {
      const session = await apiRequest<AuthSession>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name")),
          email: String(form.get("email")),
          password: String(form.get("password")),
          phone: String(form.get("phone")),
          role: "FREELANCER",
        }),
      });
      saveSession(session);
      await apiRequest("/api/freelancers/profile", {
        method: "POST",
        body: JSON.stringify({
          displayName: String(form.get("displayName")),
          city: String(form.get("city")),
          state: String(form.get("state")),
          transportation: String(form.get("transportation")),
          dailyRateCents: Number(form.get("dailyRate")) * 100,
        }),
      });
      router.push("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao cadastrar freelancer.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Cadastrar freelancer"
      subtitle="Crie seu perfil para receber convites de eventos."
    >
      <form className="form" onSubmit={handleSubmit}>
        <Field label="Nome">
          <input name="name" required />
        </Field>
        <Field label="Nome profissional">
          <input name="displayName" required />
        </Field>
        <div className="form-grid">
          <Field label="Cidade">
            <input name="city" />
          </Field>
          <Field label="UF">
            <input name="state" maxLength={2} />
          </Field>
        </div>
        <Field label="Transporte">
          <input name="transportation" />
        </Field>
        <Field label="Diária base">
          <input name="dailyRate" type="number" min={0} step={1} />
        </Field>
        <Field label="Telefone">
          <input name="phone" />
        </Field>
        <Field label="E-mail">
          <input name="email" type="email" required />
        </Field>
        <Field label="Senha">
          <input name="password" type="password" minLength={8} required />
        </Field>
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        <button
          className="primary-button full"
          disabled={loading}
          type="submit"
        >
          {loading ? "Criando..." : "Criar perfil"}
        </button>
      </form>
      <div className="auth-links">
        <Link href="/login">Já tenho conta</Link>
      </div>
    </AuthCard>
  );
}
