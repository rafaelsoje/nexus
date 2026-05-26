import {
  Apple,
  Facebook,
  Instagram,
  Linkedin,
  MessageCircle,
  Play,
  Smartphone,
  Twitter,
  Youtube,
} from "lucide-react";
import Link from "next/link";
import { appInitial, appName } from "../lib/app-config";

const productLinks = [
  { href: "/empresas", label: "Para empresas" },
  { href: "/freelancers", label: "Para freelancers" },
  { href: "/#pagamentos", label: "Pagamentos" },
  { href: "/login", label: "Dashboard" },
];

const institutionalLinks = [
  { href: "/", label: "Home" },
  { href: "/termos", label: "Termos e Privacidade" },
  { href: "/cadastro/empresa", label: "Cadastrar empresa" },
  { href: "/cadastro/freelancer", label: "Cadastrar freelancer" },
];

const helpLinks = [
  { href: "/login", label: "Central do usuário" },
  { href: "/recuperar-senha", label: "Recuperar senha" },
  { href: "/termos", label: "LGPD e cookies" },
];

const socialLinks = [
  { href: "#", label: "YouTube", icon: <Youtube size={18} /> },
  { href: "#", label: "LinkedIn", icon: <Linkedin size={18} /> },
  { href: "#", label: "Facebook", icon: <Facebook size={18} /> },
  { href: "#", label: "Instagram", icon: <Instagram size={18} /> },
  { href: "#", label: "Twitter", icon: <Twitter size={18} /> },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <Link href="/" className="brand">
          <span className="brand-mark">{appInitial}</span>
          <span>{appName}</span>
        </Link>
        <div className="footer-socials">
          <span>Acompanhe nas redes</span>
          <div>
            {socialLinks.map((item) => (
              <a aria-label={item.label} href={item.href} key={item.label}>
                {item.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="site-footer-main">
        <div className="footer-app-links" aria-label={`Links para o app ${appName}`}>
          <a className="app-store-link" href="#">
            <Play size={24} />
            <span>
              Disponível no
              <strong>Google Play</strong>
            </span>
          </a>
          <a className="app-store-link" href="#">
            <Apple size={24} />
            <span>
              Baixar na
              <strong>App Store</strong>
            </span>
          </a>
          <Link className="app-store-link" href="/login">
            <Smartphone size={24} />
            <span>
              Acessar
              <strong>App web</strong>
            </span>
          </Link>
        </div>

        <FooterColumn title="Produto" links={productLinks} />
        <FooterColumn title="Institucional" links={institutionalLinks} />
        <FooterColumn title="Ajuda" links={helpLinks} />

        <div className="footer-contact">
          <MessageCircle size={18} />
          <div>
            <strong>Atendimento</strong>
            <span>WhatsApp em breve</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: Readonly<{
  title: string;
  links: Array<{ href: string; label: string }>;
}>) {
  return (
    <nav className="footer-column" aria-label={title}>
      <strong>{title}</strong>
      {links.map((link) => (
        <Link href={link.href} key={link.label}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
