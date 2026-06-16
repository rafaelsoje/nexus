"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthCard } from "../../../components/auth-card";
import { hasCookieConsent } from "../../../components/cookie-consent";
import { Field, StatusMessage } from "../../../components/ui";
import { apiRequest, saveSession, type AuthSession } from "../../../lib/api";

export default function FreelancerRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [cookiesAccepted, setCookiesAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cpfValue, setCpfValue] = useState("");

  useEffect(() => {
    const interval = window.setInterval(
      () => setCookiesAccepted(hasCookieConsent()),
      500,
    );
    setCookiesAccepted(hasCookieConsent());

    return () => window.clearInterval(interval);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");

    if (form.get("legalAccepted") !== "on") {
      setTermsAccepted(false);
      setError("Marque a caixa de aceite dos termos para criar a conta.");
      return;
    }

    if (!hasCookieConsent()) {
      setCookiesAccepted(false);
      setError(
        "Aceite os cookies no banner de privacidade antes de criar a conta.",
      );
      return;
    }

    const cpf = onlyDigits(String(form.get("cpf")));

    if (cpf.length !== 11) {
      setError("CPF inválido. Informe 11 números.");
      return;
    }

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
          fullName: String(form.get("name")),
          displayName: String(form.get("name")),
          cpf,
        }),
      });
      router.push("/dashboard/perfil#verificacao-documentos");
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
        <Field label="CPF">
          <input
            inputMode="numeric"
            name="cpf"
            onChange={(event) => setCpfValue(formatCpf(event.target.value))}
            placeholder="000.000.000-00"
            required
            value={cpfValue}
          />
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
        <label className="terms-checkbox">
          <input
            checked={termsAccepted}
            name="legalAccepted"
            onChange={(event) => setTermsAccepted(event.target.checked)}
            required
            type="checkbox"
          />
          <span>
            Li e aceito os{" "}
            <Link href="/termos" target="_blank">
              Termos de Uso, Política LGPD e Cookies
            </Link>
            . Também aceito a política de cookies no banner de privacidade.
          </span>
        </label>
        {!cookiesAccepted ? (
          <small className="form-note">
            Para liberar o cadastro, aceite os cookies no banner exibido no
            rodapé da página.
          </small>
        ) : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        <button
          className="primary-button full"
          disabled={loading || !termsAccepted || !cookiesAccepted}
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

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}
