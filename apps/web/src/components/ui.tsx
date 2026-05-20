"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export function Field({
  label,
  children,
}: Readonly<{
  label: string;
  children: ReactNode;
}>) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="empty-state">{children}</div>;
}

export function StatusMessage({
  type,
  children,
}: Readonly<{
  type: "error" | "success";
  children: ReactNode;
}>) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsVisible(true);
    const timeout = window.setTimeout(() => setIsVisible(false), 4500);

    return () => window.clearTimeout(timeout);
  }, [children, type]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      aria-live={type === "error" ? "assertive" : "polite"}
      className={`status-message ${type}`}
      role={type === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
