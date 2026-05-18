import Link from "next/link";
import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <main className="auth-shell">
      <Link href="/" className="brand auth-brand">
        <span className="brand-mark">N</span>
        <span>nexus</span>
      </Link>
      <section className="auth-card">
        <p className="eyebrow">A nova forma de fazer eventos</p>
        <h1>{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
        {children}
      </section>
    </main>
  );
}
