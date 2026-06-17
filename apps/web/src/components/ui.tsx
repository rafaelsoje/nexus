"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

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

export function PaginationControls({
  itemLabel = "itens",
  onPageChange,
  page,
  pageSize,
  totalItems,
}: Readonly<{
  itemLabel?: string;
  onPageChange: (page: number) => void;
  page: number;
  pageSize: number;
  totalItems: number;
}>) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= pageSize) {
    return null;
  }

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <nav
      aria-label={`Paginação de ${itemLabel}`}
      className="pagination-controls"
    >
      <span>
        {firstItem}-{lastItem} de {totalItems} {itemLabel}
      </span>
      <div>
        <button
          aria-label="Página anterior"
          className="icon-action ghost"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          type="button"
        >
          <ChevronLeft size={16} />
        </button>
        <strong>
          {page}/{totalPages}
        </strong>
        <button
          aria-label="Próxima página"
          className="icon-action ghost"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          type="button"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}

export function ConfirmationDialog({
  confirmLabel = "Confirmar",
  dangerous = false,
  description,
  isOpen,
  onCancel,
  onConfirm,
  title,
}: Readonly<{
  confirmLabel?: string;
  dangerous?: boolean;
  description: ReactNode;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}>) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="agenda-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
      role="presentation"
    >
      <div
        aria-modal="true"
        className={`agenda-modal confirmation-modal${dangerous ? " danger-confirmation" : ""}`}
        role="dialog"
      >
        <div className="agenda-modal-header">
          <div>
            <span>Ação sensível</span>
            <h2>{title}</h2>
          </div>
          <button
            aria-label="Fechar confirmação"
            className="agenda-modal-close"
            onClick={onCancel}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-copy">{description}</div>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onCancel} type="button">
            Cancelar
          </button>
          <button
            className={`primary-button${dangerous ? " danger-button" : ""}`}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
