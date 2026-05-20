"use client";

import {
  Bell,
  CalendarDays,
  MessageCircle,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Star,
  UserCog,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  clearSession,
  getSession,
  type AuthSession,
  type UserRole,
} from "../lib/api";
import { ThemeToggle } from "./theme-toggle";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
};

const allRoles: UserRole[] = ["ADMIN", "COMPANY", "FREELANCER"];

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: allRoles,
  },
  {
    href: "/dashboard/eventos",
    label: "Eventos",
    icon: CalendarDays,
    roles: ["ADMIN", "COMPANY"],
  },
  {
    href: "/dashboard/agenda",
    label: "Agenda",
    icon: CalendarDays,
    roles: ["FREELANCER"],
  },
  {
    href: "/dashboard/oportunidades",
    label: "Oportunidades",
    icon: UsersRound,
    roles: ["COMPANY", "FREELANCER"],
  },
  {
    href: "/dashboard/chat",
    label: "Chat",
    icon: MessageCircle,
    roles: ["COMPANY", "FREELANCER"],
  },
  {
    href: "/dashboard/profissionais",
    label: "Profissionais",
    icon: UsersRound,
    roles: ["ADMIN", "COMPANY"],
  },
  {
    href: "/dashboard/convites",
    label: "Convites",
    icon: Bell,
    roles: ["COMPANY", "FREELANCER"],
  },
  {
    href: "/dashboard/notificacoes",
    label: "Notificações",
    icon: Bell,
    roles: allRoles,
  },
  {
    href: "/dashboard/pagamentos",
    label: "Pagamentos",
    icon: CreditCard,
    roles: allRoles,
  },
  {
    href: "/dashboard/avaliacoes",
    label: "Avaliações",
    icon: Star,
    roles: allRoles,
  },
  {
    href: "/dashboard/disputas",
    label: "Contestações",
    icon: ShieldAlert,
    roles: allRoles,
  },
  {
    href: "/dashboard/verificacoes",
    label: "Verificações",
    icon: ShieldCheck,
    roles: ["ADMIN"],
  },
  {
    href: "/dashboard/usuarios",
    label: "Usuários",
    icon: UserCog,
    roles: ["ADMIN"],
  },
  {
    href: "/dashboard/perfil",
    label: "Perfil",
    icon: Settings,
    roles: allRoles,
  },
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
  const [session, setSession] = useState<AuthSession | null>(() =>
    getSession(),
  );

  useEffect(() => {
    setSession(getSession());
  }, [pathname]);

  const visibleNavItems = session
    ? navItems.filter((item) => item.roles.includes(session.user.role))
    : [];

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
          {visibleNavItems.map((item) => {
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
          <div className="topbar-actions">
            {action}
            <ThemeToggle />
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}

export function ModuleHeaderAction({
  onRefresh,
}: Readonly<{ onRefresh: () => void }>) {
  useEffect(() => {
    const refreshOnFocus = () => onRefresh();
    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") {
        onRefresh();
      }
    };
    const interval = window.setInterval(onRefresh, 60_000);

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
    };
  }, [onRefresh]);

  return null;
}
