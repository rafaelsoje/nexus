import {
  BadgeCheck,
  CalendarDays,
  ChartNoAxesCombined,
  CreditCard,
  Search,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { appName } from "../../lib/app-config";

const gains = [
  {
    icon: <Search size={20} />,
    title: "Monte equipes em menos tempo",
    text: "Busque profissionais por especialidade, cidade, valor e disponibilidade real para cada evento.",
  },
  {
    icon: <CalendarDays size={20} />,
    title: "Controle confirmações",
    text: "Convites, aceite, contrato e histórico ficam registrados em uma operação única.",
  },
  {
    icon: <CreditCard size={20} />,
    title: "Centralize pagamentos",
    text: "Reduza dezenas de pagamentos manuais e prepare a operação para gateway, split e comprovantes.",
  },
  {
    icon: <ChartNoAxesCombined size={20} />,
    title: "Enxergue custo e recorrência",
    text: "Relatórios mostram volume, contratos, taxas, status e base de profissionais usados.",
  },
];

const checklist = [
  "Cadastro da empresa e responsável",
  "Criação de evento com funções necessárias",
  "Busca de profissionais disponíveis",
  "Convite individual e aceite pelo freelancer",
  "Pagamento simulado com taxa separada",
  "Relatórios para acompanhamento da operação",
];

export default function CompaniesPage() {
  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="audience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Para empresas de eventos</p>
          <h1>Menos ligações, mais controle sobre cada escala.</h1>
          <p className="hero-text">
            A {appName} organiza a contratação de freelancers em eventos com busca,
            convite, confirmação, pagamento e relatório em uma jornada só.
          </p>
          <div className="button-row">
            <Link className="primary-button" href="/cadastro/empresa">
              <UsersRound size={18} />
              Criar conta empresa
            </Link>
            <Link className="secondary-button" href="/login">
              Acessar dashboard
            </Link>
          </div>
        </div>
        <div className="audience-panel">
          <div className="panel-header">
            <h2>Fluxo operacional</h2>
            <BadgeCheck size={18} />
          </div>
          <ol className="site-checklist">
            {checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>
      </section>

      <section className="site-section">
        <div className="section-heading">
          <p className="eyebrow">O que melhora</p>
          <h2>
            Uma base operacional para escalar eventos sem perder registro.
          </h2>
        </div>
        <div className="pillar-grid">
          {gains.map((gain) => (
            <article className="pillar" key={gain.title}>
              <div className="pillar-icon">{gain.icon}</div>
              <h3>{gain.title}</h3>
              <p>{gain.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="site-cta">
        <div>
          <p className="eyebrow">Piloto com clientes reais</p>
          <h2>Teste a NEXO com um evento e acompanhe o fluxo completo.</h2>
        </div>
        <Link className="primary-button" href="/cadastro/empresa">
          Começar como empresa
        </Link>
      </section>
      <SiteFooter />
    </main>
  );
}
