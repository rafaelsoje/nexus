import type { ReactNode } from "react";

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
  return <p className={`status-message ${type}`}>{children}</p>;
}
