import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <main className="auth-shell">
      <div className="auth-topbar">
        <Link href="/" className="brand">
          <span className="brand-mark">N</span>
          <span>nexus</span>
        </Link>
        <ThemeToggle />
      </div>
      <section className="auth-card">
        <p className="eyebrow">A nova forma de fazer eventos</p>
        <h1>{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
        {children}
      </section>
    </main>
  );
}
