import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { CookieConsent } from "../components/cookie-consent";
import { appName } from "../lib/app-config";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: `${appName} | Marketplace e fintech para eventos`,
  description:
    "Contrate freelancers de eventos, organize agendas, formalize pagamentos e acompanhe relatórios em uma única plataforma.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const themeScript = `
    (() => {
      try {
        const storedTheme = window.localStorage.getItem("nexo-theme");
        const systemTheme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
        document.documentElement.dataset.theme = storedTheme || systemTheme;
      } catch {
        document.documentElement.dataset.theme = "dark";
      }
    })();
  `;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={poppins.variable}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
