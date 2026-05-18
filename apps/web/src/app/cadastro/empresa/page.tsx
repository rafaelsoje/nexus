"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthCard } from "../../../components/auth-card";
import { Field, StatusMessage } from "../../../components/ui";
import { apiRequest, saveSession, type AuthSession } from "../../../lib/api";

export default function CompanyRegisterPage() {
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
          name: String(form.get("responsibleName")),
          email: String(form.get("email")),
          password: String(form.get("password")),
          phone: String(form.get("phone")),
          role: "COMPANY",
        }),
      });
      saveSession(session);
      await apiRequest("/api/companies/profile", {
        method: "POST",
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
      router.push("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao cadastrar empresa.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Cadastrar empresa"
      subtitle="Crie sua operação para contratar profissionais de eventos."
    >
      <form className="form" onSubmit={handleSubmit}>
        <Field label="Empresa">
          <input name="companyName" required />
        </Field>
        <Field label="Responsável">
          <input name="responsibleName" required />
        </Field>
        <Field label="CNPJ">
          <input name="document" />
        </Field>
        <div className="form-grid">
          <Field label="Cidade">
            <input name="city" />
          </Field>
          <Field label="UF">
            <input name="state" maxLength={2} />
          </Field>
        </div>
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
          {loading ? "Criando..." : "Criar empresa"}
        </button>
      </form>
      <div className="auth-links">
        <Link href="/login">Já tenho conta</Link>
      </div>
    </AuthCard>
  );
}
