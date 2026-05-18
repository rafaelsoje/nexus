import {
  BadgeCheck,
  CalendarDays,
  CreditCard,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

const metrics = [
  { label: "Eventos ativos", value: "32" },
  { label: "Profissionais", value: "412" },
  { label: "Pagamentos", value: "R$ 218.400" },
  { label: "Empresas", value: "28" },
];

const events = [
  ["Festival de Verão", "24/05/2026", "120 profissionais"],
  ["Show Japiassú", "26/05/2026", "85 profissionais"],
  ["Evento Corporativo", "28/05/2026", "60 profissionais"],
];

export default function Home() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">N</span>
          <span>nexus</span>
        </div>
        <nav className="nav">
          <a className="active">
            <CalendarDays size={18} />
            Dashboard
          </a>
          <a>
            <CalendarDays size={18} />
            Eventos
          </a>
          <a>
            <UsersRound size={18} />
            Profissionais
          </a>
          <a>
            <CreditCard size={18} />
            Pagamentos
          </a>
          <a>
            <ShieldCheck size={18} />
            Verificações
          </a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Marketplace + Fintech para eventos</p>
            <h1>A nova forma de fazer eventos.</h1>
          </div>
          <button className="primary-button">
            <Search size={18} />
            Buscar profissionais
          </button>
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
              <h2>Próximos eventos</h2>
              <BadgeCheck size={18} />
            </div>
            <div className="event-list">
              {events.map(([name, date, count]) => (
                <div className="event-row" key={name}>
                  <div>
                    <strong>{name}</strong>
                    <span>{date}</span>
                  </div>
                  <small>{count}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="panel payment-panel">
            <div className="panel-header">
              <h2>Pagamentos</h2>
              <span className="period">Maio 2026</span>
            </div>
            <div className="chart" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <strong className="total">R$ 218.400</strong>
            <p>Total pago no período</p>
          </article>
        </section>
      </section>
    </main>
  );
}
