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
  const [cepMessage, setCepMessage] = useState("");
  const [cepValue, setCepValue] = useState("");
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
    const postalCode = onlyDigits(String(form.get("postalCode")));

    if (cpf.length !== 11) {
      setError("CPF inválido. Informe 11 números.");
      return;
    }

    if (postalCode.length !== 8) {
      setError("CEP inválido. Informe 8 números.");
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
          displayName: String(form.get("displayName")),
          cpf,
          postalCode,
          addressStreet: String(form.get("addressStreet")),
          addressNumber: String(form.get("addressNumber")),
          addressComplement: String(form.get("addressComplement")),
          neighborhood: String(form.get("neighborhood")),
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

  async function lookupCep(value: string) {
    const postalCode = onlyDigits(value);
    setCepMessage("");

    if (!postalCode) {
      return;
    }

    if (postalCode.length !== 8) {
      setCepMessage("CEP inválido. Informe 8 números.");
      return;
    }

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${postalCode}/json/`,
      );
      const data = (await response.json()) as {
        bairro?: string;
        erro?: boolean;
        localidade?: string;
        logradouro?: string;
        uf?: string;
      };

      if (data.erro) {
        setCepMessage("CEP não encontrado.");
        return;
      }

      setFieldValue("addressStreet", data.logradouro ?? "");
      setFieldValue("neighborhood", data.bairro ?? "");
      setFieldValue("city", data.localidade ?? "");
      setFieldValue("state", data.uf ?? "");
      setCepMessage("Endereço preenchido pelo CEP.");
    } catch {
      setCepMessage("Não foi possível consultar o CEP agora.");
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
        <Field label="CEP">
          <input
            inputMode="numeric"
            name="postalCode"
            onBlur={(event) => lookupCep(event.target.value)}
            onChange={(event) => setCepValue(formatCep(event.target.value))}
            placeholder="00000-000"
            required
            value={cepValue}
          />
        </Field>
        {cepMessage ? <small className="form-note">{cepMessage}</small> : null}
        <Field label="Endereço">
          <input name="addressStreet" required />
        </Field>
        <div className="form-grid">
          <Field label="Número">
            <input name="addressNumber" required />
          </Field>
          <Field label="Complemento">
            <input name="addressComplement" />
          </Field>
        </div>
        <Field label="Bairro">
          <input name="neighborhood" required />
        </Field>
        <div className="form-grid">
          <Field label="Cidade">
            <input name="city" required />
          </Field>
          <Field label="UF">
            <input name="state" maxLength={2} required />
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

function formatCep(value: string) {
  const digits = onlyDigits(value).slice(0, 8);

  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

function setFieldValue(name: string, value: string) {
  const field = document.querySelector<HTMLInputElement>(`[name="${name}"]`);

  if (field) {
    field.value = value;
  }
}
