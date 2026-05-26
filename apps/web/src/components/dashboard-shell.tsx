"use client";

import {
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
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

type NotificationSummary = {
  id: string;
  type: string;
  readAt?: string | null;
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
};

const allRoles: UserRole[] = ["ADMIN", "COMPANY", "FREELANCER"];
const nonImportantNotificationTypes = new Set(["CHAT_MESSAGE_RECEIVED"]);
const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrador",
  COMPANY: "Empresa",
  FREELANCER: "Freelancer",
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Início",
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
    href: "/dashboard/favoritos",
    label: "Favoritos",
    icon: Star,
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
    href: "/dashboard/auditoria",
    label: "Auditoria",
    icon: ClipboardList,
    roles: ["ADMIN"],
  },
  {
    href: "/dashboard/usuarios",
    label: "Usuários",
    icon: UserCog,
    roles: ["ADMIN"],
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
  const [importantNotifications, setImportantNotifications] = useState(0);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  useEffect(() => {
    function syncSession() {
      setSession(getSession());
    }

    syncSession();
    window.addEventListener("focus", syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener("focus", syncSession);
      window.removeEventListener("storage", syncSession);
    };
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
  }, [session, pathname, profileRefreshKey]);

  useEffect(() => {
    function refreshAccountSummary() {
      setProfileRefreshKey((current) => current + 1);
    }

    window.addEventListener("nexus:profile-updated", refreshAccountSummary);

    return () => {
      window.removeEventListener(
        "nexus:profile-updated",
        refreshAccountSummary,
      );
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setImportantNotifications(0);
      return;
    }

    let isCurrent = true;

    async function loadImportantNotifications() {
      try {
        const notifications = await apiRequest<NotificationSummary[]>(
          "/api/notifications",
        );

        if (!isCurrent) {
          return;
        }

        setImportantNotifications(
          notifications.filter(
            (item) =>
              !item.readAt && !nonImportantNotificationTypes.has(item.type),
          ).length,
        );
      } catch {
        if (isCurrent) {
          setImportantNotifications(0);
        }
      }
    }

    void loadImportantNotifications();
    const interval = window.setInterval(loadImportantNotifications, 60000);
    window.addEventListener(
      "nexus:notifications-updated",
      loadImportantNotifications,
    );
    window.addEventListener("focus", loadImportantNotifications);

    return () => {
      isCurrent = false;
      window.clearInterval(interval);
      window.removeEventListener(
        "nexus:notifications-updated",
        loadImportantNotifications,
      );
      window.removeEventListener("focus", loadImportantNotifications);
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
            <p className="eyebrow">{formatUserRole(eyebrow)}</p>
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions">
            {action}
            {session ? (
              <NotificationsButton count={importantNotifications} />
            ) : null}
            {session ? (
              <AccountMenu
                account={accountSummary ?? { name: session.user.name }}
                onLogout={logout}
                role={session.user.role}
              />
            ) : null}
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}

export function formatUserRole(value: string) {
  return roleLabels[value as UserRole] ?? value;
}

export function NotificationsButton({ count }: Readonly<{ count: number }>) {
  return (
    <Link
      aria-label={
        count
          ? `${count} notificação importante não lida`
          : "Notificações importantes"
      }
      className="notification-button"
      href="/dashboard/notificacoes"
    >
      <Bell size={18} />
      {count ? <span>{count > 99 ? "99+" : count}</span> : null}
    </Link>
  );
}

export function AccountMenu({
  account,
  onLogout,
  role,
}: Readonly<{
  account: AccountSummary;
  onLogout: () => void;
  role: UserRole;
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
            {role === "COMPANY"
              ? "Perfil da empresa"
              : role === "FREELANCER"
                ? "Meu perfil"
                : "Perfil e dados"}
          </Link>
          {role === "FREELANCER" ? (
            <Link
              href="/dashboard/especialidades"
              onClick={() => setIsOpen(false)}
            >
              <ClipboardList size={16} />
              Currículo profissional
            </Link>
          ) : null}
          {role === "COMPANY" ? (
            <Link href="/dashboard/equipe" onClick={() => setIsOpen(false)}>
              <UserCog size={16} />
              Equipe
            </Link>
          ) : null}
          {role === "ADMIN" ? (
            <Link
              href="/dashboard/administradores"
              onClick={() => setIsOpen(false)}
            >
              <UserCog size={16} />
              Administradores
            </Link>
          ) : null}
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
