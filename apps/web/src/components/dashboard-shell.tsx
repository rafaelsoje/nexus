"use client";

import {
  Bell,
  CalendarDays,
  ChevronDown,
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
  apiRequest,
  clearSession,
  getSession,
  type AuthSession,
  type UserRole,
} from "../lib/api";
import { ThemeToggle } from "./theme-toggle";

type AccountSummary = {
  name: string;
  imageUrl?: string;
};

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
    href: "/dashboard/especialidades",
    label: "Especialidades",
    icon: Star,
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
    href: "/dashboard/equipe",
    label: "Equipe",
    icon: UserCog,
    roles: ["COMPANY"],
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
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(
    null,
  );

  useEffect(() => {
    setSession(getSession());
  }, [pathname]);

  useEffect(() => {
    if (!session) {
      setAccountSummary(null);
      return;
    }

    let isCurrent = true;
    const currentSession = session;

    async function loadAccountSummary() {
      try {
        if (currentSession.user.role === "FREELANCER") {
          const profile = await apiRequest<{
            avatarUrl?: string;
            displayName?: string;
            fullName?: string;
          }>("/api/freelancers/profile");

          if (isCurrent) {
            setAccountSummary({
              imageUrl: profile.avatarUrl,
              name:
                profile.displayName ??
                profile.fullName ??
                currentSession.user.name ??
                "Freelancer",
            });
          }
          return;
        }

        if (currentSession.user.role === "COMPANY") {
          const profile = await apiRequest<{
            companyName?: string;
            logoUrl?: string;
          }>("/api/companies/profile");

          if (isCurrent) {
            setAccountSummary({
              imageUrl: profile.logoUrl,
              name: profile.companyName ?? currentSession.user.name ?? "Empresa",
            });
          }
          return;
        }

        setAccountSummary({ name: currentSession.user.name ?? "Admin" });
      } catch {
        if (isCurrent) {
          setAccountSummary({ name: currentSession.user.name });
        }
      }
    }

    void loadAccountSummary();

    return () => {
      isCurrent = false;
    };
  }, [session, pathname]);

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
            {session ? (
              <AccountMenu
                account={accountSummary ?? { name: session.user.name }}
                onLogout={logout}
              />
            ) : null}
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}

export function AccountMenu({
  account,
  onLogout,
}: Readonly<{
  account: AccountSummary;
  onLogout: () => void;
}>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="account-menu">
      <button
        aria-expanded={isOpen}
        className="account-button"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="profile-avatar small">
          {account.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" src={account.imageUrl} />
          ) : (
            <span>{getInitials(account.name)}</span>
          )}
        </span>
        <span>{account.name}</span>
        <ChevronDown size={16} />
      </button>
      {isOpen ? (
        <div className="account-dropdown">
          <ThemeToggle />
          <Link href="/dashboard/perfil" onClick={() => setIsOpen(false)}>
            <Settings size={16} />
            Perfil e dados
          </Link>
          <Link
            href="/dashboard/notificacoes"
            onClick={() => setIsOpen(false)}
          >
            <Bell size={16} />
            Notificações
          </Link>
          <button onClick={onLogout} type="button">
            <LogOut size={16} />
            Sair
          </button>
        </div>
      ) : null}
    </div>
  );
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "N"
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
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);

    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
    };
  }, [onRefresh]);

  return null;
}
