import { UsersRound } from "lucide-react";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-mark">N</span>
        <span>NEXO</span>
      </Link>
      <nav className="site-nav" aria-label="Principal">
        <Link href="/empresas">Empresas</Link>
        <Link href="/freelancers">Freelancers</Link>
        <Link href="/#pagamentos">Pagamentos</Link>
        <Link href="/login">Login</Link>
      </nav>
      <Link className="primary-button" href="/cadastro/empresa">
        <UsersRound size={18} />
        Começar
      </Link>
    </header>
  );
}
