import { UsersRound } from "lucide-react";
import Link from "next/link";
import { appInitial, appName } from "../lib/app-config";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-mark">{appInitial}</span>
        <span>{appName}</span>
      </Link>
      <nav className="site-nav" aria-label="Principal">
        <Link href="/empresas">Empresas</Link>
        <Link href="/freelancers">Freelancers</Link>
        <Link href="/#pagamentos">Pagamentos</Link>
        <Link href="/termos">Termos</Link>
        <Link href="/login">Login</Link>
      </nav>
      <div className="site-actions">
        <ThemeToggle />
        <Link className="primary-button" href="/cadastro/empresa">
          <UsersRound size={18} />
          Começar
        </Link>
      </div>
    </header>
  );
}
