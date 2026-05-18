import {
  BadgeCheck,
  CalendarDays,
  CreditCard,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

const metrics = [
  { label: "Eventos ativos", value: "32" },
  { label: "Profissionais", value: "412" },
  { label: "Pagamentos", value: "R$ 218.400" },
  { label: "Empresas", value: "28" },
];

const features = [
  [
    "Conexão",
    "Empresas encontram profissionais por especialidade, localização e disponibilidade.",
  ],
  [
    "Segurança",
    "Convites, contratos e pagamentos ficam registrados na plataforma.",
  ],
  [
    "Gestão",
    "Agenda, histórico, avaliações e relatórios em uma única operação.",
  ],
];

export default function Home() {
  return (
    <main className="shell landing-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">N</span>
          <span>nexus</span>
        </div>
        <nav className="nav">
          <Link className="active" href="/">
            <CalendarDays size={18} />
            Início
          </Link>
          <Link href="/login">
            <ShieldCheck size={18} />
            Login
          </Link>
          <Link href="/cadastro/empresa">
            <UsersRound size={18} />
            Empresas
          </Link>
          <Link href="/cadastro/freelancer">
            <CreditCard size={18} />
            Freelancers
          </Link>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Marketplace + Fintech para eventos</p>
            <h1>A nova forma de fazer eventos.</h1>
          </div>
          <div className="button-row">
            <Link className="secondary-button" href="/cadastro/freelancer">
              Sou freelancer
            </Link>
            <Link className="primary-button" href="/cadastro/empresa">
              <Search size={18} />
              Contratar profissionais
            </Link>
          </div>
        </header>

        <section className="metrics">
          {metrics.map((metric) => (
            <article className="metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </section>

        <section className="grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Operação centralizada</h2>
              <BadgeCheck size={18} />
            </div>
            <div className="feature-list">
              {features.map(([title, text]) => (
                <div className="feature-row" key={title}>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel payment-panel">
            <div className="panel-header">
              <h2>Fluxo do MVP</h2>
              <span className="period">API pronta</span>
            </div>
            <ol className="flow-list">
              <li>Empresa cria evento</li>
              <li>Busca freelancers disponíveis</li>
              <li>Envia convite e confirma contrato</li>
              <li>Pagamento simulado e reputação</li>
            </ol>
          </article>
        </section>
      </section>
    </main>
  );
}
