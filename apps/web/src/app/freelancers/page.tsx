import {
  Bell,
  CalendarDays,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "../../components/site-header";

const benefits = [
  {
    icon: <Sparkles size={20} />,
    title: "Perfil profissional",
    text: "Mostre especialidades, cidade, transporte, equipamentos, diária e histórico de trabalhos.",
  },
  {
    icon: <Bell size={20} />,
    title: "Convites organizados",
    text: "Receba oportunidades com data, local, função e valor antes de aceitar.",
  },
  {
    icon: <CalendarDays size={20} />,
    title: "Agenda clara",
    text: "Bloqueie dias indisponíveis e evite conflitos com contratos já confirmados.",
  },
  {
    icon: <Wallet size={20} />,
    title: "Carteira e recebimento",
    text: "Acompanhe pagamentos liberados, saldo e histórico financeiro dentro da plataforma.",
  },
];

const profileItems = [
  "Especialidades e diária por função",
  "Ferramentas e equipamentos",
  "Meio de transporte",
  "Cidade e estado de atuação",
  "Agenda de indisponibilidade",
  "Histórico de contratos e avaliações",
];

export default function FreelancersPage() {
  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="audience-hero">
        <div className="hero-copy">
          <p className="eyebrow">Para profissionais de eventos</p>
          <h1>Mais oportunidades com agenda, reputação e pagamento claros.</h1>
          <p className="hero-text">
            A NEXO ajuda freelancers a serem encontrados por empresas, receberem
            convites estruturados e acompanharem trabalhos e pagamentos em um
            único lugar.
          </p>
          <div className="button-row">
            <Link className="primary-button" href="/cadastro/freelancer">
              <Star size={18} />
              Criar perfil profissional
            </Link>
            <Link className="secondary-button" href="/login">
              Entrar
            </Link>
          </div>
        </div>
        <div className="audience-panel">
          <div className="panel-header">
            <h2>Seu perfil NEXO</h2>
            <ShieldCheck size={18} />
          </div>
          <ol className="site-checklist">
            {profileItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>
      </section>

      <section className="site-section">
        <div className="section-heading">
          <p className="eyebrow">Trabalho com mais previsibilidade</p>
          <h2>
            Oportunidades, contratos e pagamentos com menos informalidade.
          </h2>
        </div>
        <div className="pillar-grid">
          {benefits.map((benefit) => (
            <article className="pillar" key={benefit.title}>
              <div className="pillar-icon">{benefit.icon}</div>
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="payment-story">
        <div>
          <p className="eyebrow">Recebimento seguro</p>
          <h2>Aceite trabalhos com regras visíveis antes do evento.</h2>
          <p>
            O contrato guarda data, horário, valor, empresa responsável e status
            do pagamento, reduzindo ruído na relação entre contratante e
            profissional.
          </p>
        </div>
        <div className="payment-stack">
          <div className="payment-row">
            <CreditCard size={18} />
            <span>Valor e taxa registrados</span>
          </div>
          <div className="payment-row">
            <Wallet size={18} />
            <span>Saldo liberado em carteira</span>
          </div>
          <div className="payment-row">
            <Star size={18} />
            <span>Reputação por avaliações reais</span>
          </div>
        </div>
      </section>

      <section className="site-cta">
        <div>
          <p className="eyebrow">Entre na base</p>
          <h2>Crie seu perfil e fique visível para empresas do setor.</h2>
        </div>
        <Link className="primary-button" href="/cadastro/freelancer">
          Começar como freelancer
        </Link>
      </section>
    </main>
  );
}
