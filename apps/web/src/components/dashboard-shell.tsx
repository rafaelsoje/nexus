"use client";

import {
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
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
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
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

type VerificationNotice = {
  missingDocuments: boolean;
  missingSkills?: boolean;
  name: string;
  role: Extract<UserRole, "COMPANY" | "FREELANCER">;
};

type VerificationDocumentSummary = {
  id: string;
};

type SkillSummary = {
  id?: string;
  skillId?: string;
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
const verificationPromptStoragePrefix = "nexus.verificationPrompt.dismissed";

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
    href: "/dashboard/especialidades",
    label: "Especialidades",
    icon: ClipboardList,
    roles: ["ADMIN", "FREELANCER"],
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
    href: "/dashboard/contratos",
    label: "Contratos",
    icon: FileText,
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
  const [verificationNotice, setVerificationNotice] =
    useState<VerificationNotice | null>(null);

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
      setVerificationNotice(null);
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
            skills?: SkillSummary[];
            verificationDocuments?: VerificationDocumentSummary[];
          }>("/api/freelancers/profile");
          const name =
            profile.displayName ??
            profile.fullName ??
            currentSession.user.name ??
            "Freelancer";

          if (isCurrent) {
            setAccountSummary({
              imageUrl: profile.avatarUrl,
              name,
            });
            syncVerificationNotice(
              currentSession,
              profile.verificationDocuments,
              name,
              profile.skills,
            );
          }
          return;
        }

        if (currentSession.user.role === "COMPANY") {
          const profile = await apiRequest<{
            companyName?: string;
            logoUrl?: string;
            verificationDocuments?: VerificationDocumentSummary[];
          }>("/api/companies/profile");
          const name =
            profile.companyName ?? currentSession.user.name ?? "Empresa";

          if (isCurrent) {
            setAccountSummary({
              imageUrl: profile.logoUrl,
              name,
            });
            syncVerificationNotice(
              currentSession,
              profile.verificationDocuments,
              name,
            );
          }
          return;
        }

        setAccountSummary({ name: currentSession.user.name ?? "Admin" });
        setVerificationNotice(null);
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
        const notifications =
          await apiRequest<NotificationSummary[]>("/api/notifications");

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
    window.addEventListener(
      "nexus:notifications-updated",
      loadImportantNotifications,
    );
    window.addEventListener("focus", loadImportantNotifications);

    return () => {
      isCurrent = false;
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
      {session && verificationNotice ? (
        <VerificationRequiredDialog
          notice={verificationNotice}
          onDismiss={() => {
            markVerificationPromptDismissed(session.user.id);
            setVerificationNotice(null);
          }}
        />
      ) : null}
    </main>
  );

  function syncVerificationNotice(
    currentSession: AuthSession,
    documents: VerificationDocumentSummary[] | undefined,
    name: string,
    skills?: SkillSummary[],
  ) {
    if (
      currentSession.user.role !== "COMPANY" &&
      currentSession.user.role !== "FREELANCER"
    ) {
      setVerificationNotice(null);
      return;
    }

    const missingDocuments = !documents?.length;
    const missingSkills =
      currentSession.user.role === "FREELANCER" && !skills?.length;

    if (!missingDocuments && !missingSkills) {
      clearVerificationPromptDismissed(currentSession.user.id);
      setVerificationNotice(null);
      return;
    }

    if (isVerificationPromptDismissed(currentSession.user.id)) {
      setVerificationNotice(null);
      return;
    }

    setVerificationNotice({
      missingDocuments,
      missingSkills,
      name,
      role: currentSession.user.role,
    });
  }
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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div className="account-menu" ref={menuRef}>
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
          <Link href="/dashboard/notificacoes" onClick={() => setIsOpen(false)}>
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

function VerificationRequiredDialog({
  notice,
  onDismiss,
}: Readonly<{
  notice: VerificationNotice;
  onDismiss: () => void;
}>) {
  const isCompany = notice.role === "COMPANY";
  const title = isCompany
    ? "Envie os documentos da empresa"
    : notice.missingDocuments && notice.missingSkills
      ? "Complete sua verificação e especialidades"
      : notice.missingDocuments
        ? "Envie seus documentos"
        : "Cadastre suas especialidades";

  return (
    <div
      className="agenda-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onDismiss();
        }
      }}
      role="presentation"
    >
      <div
        aria-modal="true"
        className="agenda-modal verification-required-modal"
        role="dialog"
      >
        <div className="agenda-modal-header">
          <div>
            <span>Verificação pendente</span>
            <h2>{title}</h2>
          </div>
          <button
            aria-label="Fechar aviso de verificação"
            className="agenda-modal-close"
            onClick={onDismiss}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-copy">
          <p>
            {isCompany
              ? `${notice.name} ainda precisa enviar documentos para verificação. Essa etapa libera a operação com segurança na plataforma.`
              : `${notice.name} precisa concluir os documentos e as especialidades para ficar disponível no fluxo de eventos.`}
          </p>
          <p>
            {isCompany
              ? "Sem a verificação, a empresa não consegue cadastrar eventos."
              : "Sem documentos aprovados e sem especialidades cadastradas, o freelancer não consegue ver vagas compatíveis, se candidatar ou receber novos convites."}
          </p>
        </div>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onDismiss} type="button">
            Lembrar depois
          </button>
          {notice.missingSkills ? (
            <Link
              className="secondary-button"
              href="/dashboard/especialidades"
              onClick={onDismiss}
            >
              Cadastrar especialidades
            </Link>
          ) : null}
          {notice.missingDocuments ? (
            <Link
              className="primary-button"
              href="/dashboard/perfil#verificacao-documentos"
              onClick={onDismiss}
            >
              Enviar documentos agora
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function getVerificationPromptStorageKey(userId: string) {
  return `${verificationPromptStoragePrefix}:${userId}`;
}

function isVerificationPromptDismissed(userId: string) {
  return (
    typeof window !== "undefined" &&
    window.sessionStorage.getItem(getVerificationPromptStorageKey(userId)) ===
      "true"
  );
}

function markVerificationPromptDismissed(userId: string) {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(getVerificationPromptStorageKey(userId), "true");
  }
}

function clearVerificationPromptDismissed(userId: string) {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(getVerificationPromptStorageKey(userId));
  }
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
