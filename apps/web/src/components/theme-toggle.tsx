"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = window.localStorage.getItem("nexo-theme");

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const initialTheme = getInitialTheme();
    document.documentElement.dataset.theme = initialTheme;
    setTheme(initialTheme);
  }, []);

  const isLight = theme === "light";

  function toggleTheme() {
    const nextTheme = isLight ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("nexo-theme", nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      aria-label={isLight ? "Ativar tema escuro" : "Ativar tema claro"}
      className="theme-toggle"
      onClick={toggleTheme}
      title={isLight ? "Tema escuro" : "Tema claro"}
      type="button"
    >
      {isLight ? <Moon size={18} /> : <Sun size={18} />}
      <span>{isLight ? "Escuro" : "Claro"}</span>
    </button>
  );
}
