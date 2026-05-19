"use client";

import {
  Bell,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  Search,
  Star,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { clearSession, getSession, type AuthSession } from "../lib/api";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/eventos", label: "Eventos", icon: CalendarDays },
  {
    href: "/dashboard/profissionais",
    label: "Profissionais",
    icon: UsersRound,
  },
  { href: "/dashboard/convites", label: "Convites", icon: Bell },
  { href: "/dashboard/notificacoes", label: "Notificações", icon: Bell },
  { href: "/dashboard/pagamentos", label: "Pagamentos", icon: CreditCard },
  { href: "/dashboard/avaliacoes", label: "Avaliações", icon: Star },
  { href: "/dashboard/perfil", label: "Perfil", icon: Settings },
];

export function useRequiredSession() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const stored = getSession();

    if (!stored) {
      router.push("/login");
      return;
    }

    setSession(stored);
  }, [router]);

  return session;
}

export function DashboardShell({
  action,
  children,
  eyebrow,
  title,
}: Readonly<{
  action?: ReactNode;
  children: ReactNode;
  eyebrow: string;
  title: string;
}>) {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    clearSession();
    router.push("/login");
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">N</span>
          <span>NEXO</span>
        </Link>
        <nav className="nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                className={isActive ? "active" : ""}
                href={item.href}
                key={item.href}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
          <button className="nav-button" onClick={logout}>
            <LogOut size={18} />
            Sair
          </button>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
          {action ?? (
            <button className="primary-button" type="button">
              <Search size={18} />
              Atualizar
            </button>
          )}
        </header>
        {children}
      </section>
    </main>
  );
}

export function ModuleHeaderAction({
  onRefresh,
}: Readonly<{ onRefresh: () => void }>) {
  return (
    <button className="primary-button" onClick={onRefresh} type="button">
      <Search size={18} />
      Atualizar
    </button>
  );
}
