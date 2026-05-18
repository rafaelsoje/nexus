import Link from "next/link";
import { AuthCard } from "../../components/auth-card";
import { Field } from "../../components/ui";

export default function RecoverPasswordPage() {
  return (
    <AuthCard
      title="Recuperar senha"
      subtitle="Fluxo visual preparado para integração de e-mail."
    >
      <form className="form">
        <Field label="E-mail">
          <input type="email" />
        </Field>
        <button className="primary-button full" type="button">
          Solicitar recuperação
        </button>
      </form>
      <div className="auth-links">
        <Link href="/login">Voltar ao login</Link>
      </div>
    </AuthCard>
  );
}
