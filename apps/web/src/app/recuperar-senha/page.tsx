"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthCard } from "../../components/auth-card";
import { Field, StatusMessage } from "../../components/ui";
import { apiRequest } from "../../lib/api";

export default function RecoverPasswordPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetToken, setResetToken] = useState("");

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setSuccess("");

    try {
      const response = await apiRequest<{ ok: boolean; resetToken?: string }>(
        "/api/auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ email: String(form.get("email")) }),
        },
      );
      setResetToken(response.resetToken ?? "");
      setSuccess(
        response.resetToken
          ? "Token gerado para teste local."
          : "Se o e-mail existir, enviaremos as instruções.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao solicitar recuperação.",
      );
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    setSuccess("");

    try {
      await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token: String(form.get("token")),
          password: String(form.get("password")),
        }),
      });
      formElement.reset();
      setResetToken("");
      setSuccess("Senha atualizada. Você já pode entrar com a nova senha.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao redefinir senha.",
      );
    }
  }

  return (
    <AuthCard
      title="Recuperar senha"
      subtitle="Solicite um token temporário e defina uma nova senha."
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}

      <form className="form" onSubmit={requestReset}>
        <Field label="E-mail">
          <input name="email" required type="email" />
        </Field>
        <button className="primary-button full" type="submit">
          Solicitar recuperação
        </button>
      </form>

      {resetToken ? (
        <div className="dev-token">
          <span>Token local</span>
          <strong>{resetToken}</strong>
        </div>
      ) : null}

      <form className="form" onSubmit={resetPassword}>
        <Field label="Token">
          <input
            defaultValue={resetToken}
            name="token"
            required
            type="text"
          />
        </Field>
        <Field label="Nova senha">
          <input minLength={8} name="password" required type="password" />
        </Field>
        <button className="secondary-button full" type="submit">
          Redefinir senha
        </button>
      </form>

      <div className="auth-links">
        <Link href="/login">Voltar ao login</Link>
      </div>
    </AuthCard>
  );
}
