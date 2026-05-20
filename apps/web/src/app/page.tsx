import {
  BadgeCheck,
  Banknote,
  Bell,
  CalendarCheck,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  CreditCard,
  Handshake,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "../components/site-header";

const metrics = [
  { label: "Eventos ativos", value: "32" },
  { label: "Profissionais mapeados", value: "412" },
  { label: "Pagamentos geridos", value: "R$ 218 mil" },
  { label: "Empresas piloto", value: "28" },
];

const pains = [
  "Convites espalhados em ligações, WhatsApp e planilhas",
  "Profissionais sem agenda clara para confirmar disponibilidade",
  "Pagamento manual para vários freelancers no fim do evento",
  "Pouca rastreabilidade de presença, reputação e combinados",
];

const companyBenefits = [
  {
    icon: <Search size={18} />,
    title: "Busca inteligente",
    text: "Filtre por nome, apelido, função, cidade, diária, ferramentas, transporte e agenda livre.",
  },
  {
    icon: <CalendarCheck size={18} />,
    title: "Escala em minutos",
    text: "Crie eventos com múltiplas funções, convide em lote e acompanhe quem aceitou.",
  },
  {
    icon: <CreditCard size={18} />,
    title: "Pagamento centralizado",
    text: "Use carteira, cartão e gateway configurável para pagar vários profissionais em uma operação.",
  },
];

const freelancerBenefits = [
  {
    icon: <Sparkles size={18} />,
    title: "Perfil valorizado",
    text: "Mostre especialidades, diária, ferramentas, transporte, avaliações e disponibilidade.",
  },
  {
    icon: <CalendarDays size={18} />,
    title: "Agenda profissional",
    text: "Acompanhe eventos aceitos, bloqueios de agenda, trabalhos futuros e realizados.",
  },
  {
    icon: <Wallet size={18} />,
    title: "Ganhos sob controle",
    text: "Veja pagamentos, repasses, saldo em carteira e histórico financeiro em um só lugar.",
  },
];

const operatingFlow = [
  {
    icon: <UserCheck size={18} />,
    title: "Perfis verificados",
    text: "Empresas e freelancers completam cadastro, documentos e informações profissionais.",
  },
  {
    icon: <Search size={18} />,
    title: "Busca por disponibilidade",
    text: "A plataforma prioriza profissionais livres na data e sinaliza bloqueios ou conflito.",
  },
  {
    icon: <MessageCircle size={18} />,
    title: "Convite e negociação",
    text: "Convites, candidaturas e contrapropostas ficam registrados no chat interno.",
  },
  {
    icon: <ShieldCheck size={18} />,
    title: "Contrato e pagamento",
    text: "A contratação só avança com regras claras de pagamento, presença, no-show e repasse.",
  },
];

const trustItems = [
  "No-show precisa ser marcado pela empresa até 1 dia útil após o evento.",
  "Disputas bloqueiam repasse automático até análise administrativa.",
  "Avaliações alimentam reputação de empresas e profissionais.",
  "Carteira permite saldo, complementos e histórico rastreável.",
];

export default function Home() {
  return (
    <main className="site-shell home-shell">
      <SiteHeader />

      <section className="home-hero">
        <div className="home-hero-content">
          <p className="eyebrow">Marketplace + pagamentos para eventos</p>
          <h1>NEXO organiza o encontro entre empresas e freelancers.</h1>
          <p className="hero-text">
            Uma plataforma para substituir improviso por fluxo: busca por
            profissionais disponíveis, convites, agenda, negociação, contrato,
            pagamento, reputação e repasse.
          </p>
          <div className="button-row">
            <Link className="primary-button" href="/cadastro/empresa">
              <Search size={18} />
              Quero montar minha equipe
            </Link>
            <Link className="secondary-button" href="/cadastro/freelancer">
              <Sparkles size={18} />
              Quero receber eventos
            </Link>
          </div>
        </div>
        <div className="home-hero-panel" aria-label="Indicadores NEXO">
          {metrics.map((metric) => (
            <div className="home-hero-metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="problem-band" id="solucao">
        <div className="section-heading">
          <p className="eyebrow">O problema real</p>
          <h2>O mercado de eventos ainda contrata no braço.</h2>
          <p>
            A dor não é só encontrar gente. É saber quem está disponível,
            combinar valor, confirmar presença, pagar com segurança e registrar
            o que aconteceu depois.
          </p>
        </div>
        <div className="problem-list">
          {pains.map((pain) => (
            <div className="problem-item" key={pain}>
              <CheckCircle2 size={18} />
              <span>{pain}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="site-section audience-split">
        <div className="section-heading">
          <p className="eyebrow">Dois lados, uma operação</p>
          <h2>Controle para empresas. Previsibilidade para freelancers.</h2>
        </div>
        <div className="audience-cards">
          <article className="audience-card company-card">
            <div className="audience-card-header">
              <BadgeCheck size={22} />
              <h3>Para empresas</h3>
            </div>
            <p>
              Menos ligações, menos planilhas e mais clareza para montar equipes
              completas por evento, função e data.
            </p>
            <div className="benefit-list">
              {companyBenefits.map((benefit) => (
                <div className="benefit-item" key={benefit.title}>
                  <span>{benefit.icon}</span>
                  <div>
                    <strong>{benefit.title}</strong>
                    <small>{benefit.text}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="audience-card freelancer-card">
            <div className="audience-card-header">
              <Star size={22} />
              <h3>Para freelancers</h3>
            </div>
            <p>
              Mais oportunidades, agenda organizada, reputação visível e
              recebimentos acompanhados com muito menos informalidade.
            </p>
            <div className="benefit-list">
              {freelancerBenefits.map((benefit) => (
                <div className="benefit-item" key={benefit.title}>
                  <span>{benefit.icon}</span>
                  <div>
                    <strong>{benefit.title}</strong>
                    <small>{benefit.text}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="product-showcase">
        <div className="product-copy">
          <p className="eyebrow">Como a NEXO trabalha</p>
          <h2>Da busca ao repasse, cada etapa deixa rastro.</h2>
          <p>
            A plataforma foi desenhada para eventos com múltiplos profissionais:
            convites individuais ou em lote, candidaturas, chat, contratos,
            carteira, pagamentos, contestações e avaliações.
          </p>
        </div>
        <div className="operation-board" aria-label="Fluxo operacional NEXO">
          {operatingFlow.map((step, index) => (
            <article className="operation-step" key={step.title}>
              <div className="step-index">
                {String(index + 1).padStart(2, "0")}
              </div>
              <span>{step.icon}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="site-section finance-section" id="pagamentos">
        <div className="finance-copy">
          <p className="eyebrow">Segurança financeira</p>
          <h2>Pagamento, reputação e regras de mercado no mesmo fluxo.</h2>
          <p>
            A empresa confirma a contratação com pagamento pela plataforma. O
            profissional acompanha carteira e repasse. Se houver ausência ou
            contestação, a operação tem regra antes do dinheiro sair.
          </p>
          <div className="button-row">
            <Link className="primary-button" href="/cadastro/empresa">
              <CreditCard size={18} />
              Começar pela empresa
            </Link>
            <Link className="secondary-button" href="/login">
              Ver dashboard
            </Link>
          </div>
        </div>
        <div className="finance-stack">
          <div className="wallet-preview">
            <div>
              <span>Saldo operacional</span>
              <strong>R$ 24.500,00</strong>
            </div>
            <Wallet size={22} />
          </div>
          <div className="payment-timeline">
            <div>
              <Banknote size={17} />
              <span>Pagamento confirmado</span>
            </div>
            <div>
              <Bell size={17} />
              <span>Alerta pós-evento</span>
            </div>
            <div>
              <Handshake size={17} />
              <span>Repasse liberado</span>
            </div>
          </div>
          <ul className="trust-list">
            {trustItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="site-cta home-final-cta">
        <div>
          <p className="eyebrow">Piloto NEXO</p>
          <h2>Valide a operação completa nos próximos eventos.</h2>
          <p>
            Comece com um evento, monte a escala, convide profissionais, pague
            pela plataforma e acompanhe tudo no painel.
          </p>
        </div>
        <div className="button-row">
          <Link className="primary-button" href="/cadastro/empresa">
            Criar conta empresa
          </Link>
          <Link className="secondary-button" href="/cadastro/freelancer">
            Criar perfil freelancer
          </Link>
        </div>
      </section>
    </main>
  );
}
