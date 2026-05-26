"use client";

import { Cookie, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export const CONSENT_KEY = "nexo-legal-consent-v1";
const CONSENT_VERSION = "2026-05-25";

export function hasCookieConsent() {
  try {
    return Boolean(window.localStorage.getItem(CONSENT_KEY));
  } catch {
    return false;
  }
}

type ConsentMode = "essential" | "all";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const storedConsent = window.localStorage.getItem(CONSENT_KEY);
      setIsVisible(!storedConsent);
    } catch {
      setIsVisible(true);
    }
  }, []);

  function saveConsent(mode: ConsentMode) {
    try {
      window.localStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({
          acceptedAt: new Date().toISOString(),
          mode,
          version: CONSENT_VERSION,
        }),
      );
    } finally {
      setIsVisible(false);
    }
  }

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      aria-label="Preferências de cookies e privacidade"
      className="cookie-consent"
    >
      <div className="cookie-consent-icon">
        <Cookie size={20} />
      </div>
      <div className="cookie-consent-copy">
        <strong>Cookies e privacidade</strong>
        <p>
          Usamos cookies essenciais para login, segurança, tema e preferências.
          Cookies analíticos só devem ser usados para melhorar a plataforma.
          Ao continuar, você também confirma ciência dos Termos de Uso e da
          Política de Privacidade/LGPD.
        </p>
        <Link href="/termos">Ler termos e política LGPD</Link>
      </div>
      <div className="cookie-consent-actions">
        <button
          className="secondary-button"
          onClick={() => saveConsent("essential")}
          type="button"
        >
          <X size={17} />
          Apenas essenciais
        </button>
        <button
          className="primary-button"
          onClick={() => saveConsent("all")}
          type="button"
        >
          <ShieldCheck size={17} />
          Aceitar
        </button>
      </div>
    </aside>
  );
}
