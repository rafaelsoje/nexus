import {
  BadgeCheck,
  CalendarDays,
  ChartNoAxesCombined,
  CreditCard,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "../components/site-header";

const metrics = [
  { label: "Eventos ativos", value: "32" },
  { label: "Profissionais", value: "412" },
  { label: "Pagamentos geridos", value: "R$ 218 mil" },
  { label: "Empresas piloto", value: "28" },
];

const pillars = [
  {
    icon: <Search size={20} />,
    title: "Busca por disponibilidade",
    text: "Encontre profissionais por função, cidade, diária, histórico e agenda livre para a data do evento.",
  },
  {
    icon: <CalendarDays size={20} />,
    title: "Convite e escala",
    text: "Crie eventos, envie convites, acompanhe aceites e reduza a operação manual por WhatsApp e planilhas.",
  },
  {
    icon: <CreditCard size={20} />,
    title: "Pagamento centralizado",
    text: "Organize contratos, pagamentos, splits, carteira e liberação para freelancers em um fluxo rastreável.",
  },
  {
    icon: <ChartNoAxesCombined size={20} />,
    title: "Relatórios operacionais",
    text: "Acompanhe volume financeiro, contratos, eventos, status e recorrência para tomar decisões melhores.",
  },
];

const companyFlow = [
  "Cadastra o evento",
  "Define funções e diárias",
  "Convida profissionais disponíveis",
  "Paga pela plataforma",
  "Avalia a entrega",
];

const freelancerFlow = [
  "Cria perfil profissional",
  "Informa especialidades e diária",
  "Bloqueia indisponibilidades",
  "Aceita convites",
  "Recebe com segurança",
];

export default function Home() {
  return (
    <main className="site-shell">
      <SiteHeader />

      <section className="site-hero">
        <div className="hero-copy">
          <p className="eyebrow">Marketplace + Fintech para eventos</p>
          <h1>NEXO conecta empresas e talentos do mercado de eventos.</h1>
          <p className="hero-text">
            Uma plataforma para montar equipes, controlar agenda, formalizar
            contratações, centralizar pagamentos e construir reputação entre
            empresas e freelancers.
          </p>
          <div className="button-row">
            <Link className="primary-button" href="/cadastro/empresa">
              <Search size={18} />
              Contratar profissionais
            </Link>
            <Link className="secondary-button" href="/cadastro/freelancer">
              Sou freelancer
            </Link>
          </div>
        </div>
        <div className="hero-visual" aria-label="Prévia visual da plataforma">
          <div className="hero-image" />
        </div>
      </section>

      <section className="site-metrics" aria-label="Indicadores do produto">
        {metrics.map((metric) => (
          <article className="metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className="site-section" id="solucao">
        <div className="section-heading">
          <p className="eyebrow">Tudo em um só lugar</p>
          <h2>Da busca ao pagamento, com rastreabilidade.</h2>
        </div>
        <div className="pillar-grid">
          {pillars.map((pillar) => (
            <article className="pillar" key={pillar.title}>
              <div className="pillar-icon">{pillar.icon}</div>
              <h3>{pillar.title}</h3>
              <p>{pillar.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="site-section flow-section" id="fluxo">
        <div className="section-heading">
          <p className="eyebrow">Jornadas conectadas</p>
          <h2>Empresas ganham controle. Freelancers ganham previsibilidade.</h2>
        </div>
        <div className="journey-grid">
          <article className="journey">
            <div className="panel-header">
              <h3>Para empresas</h3>
              <BadgeCheck size={18} />
            </div>
            <ol>
              {companyFlow.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </article>
          <article className="journey">
            <div className="panel-header">
              <h3>Para freelancers</h3>
              <Sparkles size={18} />
            </div>
            <ol>
              {freelancerFlow.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </article>
        </div>
      </section>

      <section className="site-section payment-story" id="pagamentos">
        <div>
          <p className="eyebrow">Segurança financeira</p>
          <h2>Pagamento com regras claras para os dois lados.</h2>
          <p>
            A empresa paga pela plataforma, o contrato fica registrado, a taxa
            da operação é separada e o repasse pode ser liberado após validação
            do serviço.
          </p>
        </div>
        <div className="payment-stack">
          <div className="payment-row">
            <ShieldCheck size={18} />
            <span>Contrato e presença rastreáveis</span>
          </div>
          <div className="payment-row">
            <CreditCard size={18} />
            <span>Pagamento e split preparados para gateway</span>
          </div>
          <div className="payment-row">
            <Wallet size={18} />
            <span>Carteira e histórico para o freelancer</span>
          </div>
        </div>
      </section>

      <section className="site-cta">
        <div>
          <p className="eyebrow">Piloto NEXO</p>
          <h2>Comece validando o fluxo completo em poucos eventos.</h2>
        </div>
        <div className="button-row">
          <Link className="primary-button" href="/cadastro/empresa">
            Criar conta empresa
          </Link>
          <Link className="secondary-button" href="/login">
            Acessar dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
