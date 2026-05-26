import type { Metadata } from "next";
import {
  Banknote,
  Cookie,
  FileText,
  LockKeyhole,
  Scale,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "NEXO";

export const metadata: Metadata = {
  title: `${appName} | Termos de Uso e LGPD`,
  description:
    "Termos de uso, política de privacidade, LGPD e cookies da plataforma.",
};

const summaryItems = [
  {
    icon: <UserCheck size={18} />,
    title: "Cadastro responsável",
    text: "Empresas e freelancers devem manter dados verdadeiros, atualizados e compatíveis com sua atuação.",
  },
  {
    icon: <Banknote size={18} />,
    title: "Pagamentos rastreáveis",
    text: "Contratações, taxas, contestações e repasses seguem as regras operacionais informadas na plataforma.",
  },
  {
    icon: <LockKeyhole size={18} />,
    title: "Dados protegidos",
    text: "Dados pessoais são usados para cadastro, segurança, operação, pagamento, suporte e obrigações legais.",
  },
  {
    icon: <Cookie size={18} />,
    title: "Cookies transparentes",
    text: "Cookies essenciais mantêm o serviço funcionando; cookies opcionais dependem do consentimento.",
  },
];

export default function TermsPage() {
  return (
    <main className="site-shell legal-shell">
      <SiteHeader />

      <section className="legal-hero">
        <div>
          <p className="eyebrow">Última atualização: 25/05/2026</p>
          <h1>Termos de Uso, Privacidade, LGPD e Cookies</h1>
          <p className="hero-text">
            Este documento organiza as regras públicas de uso do {appName},
            incluindo cadastro, contratação, pagamentos, tratamento de dados
            pessoais e preferências de cookies.
          </p>
        </div>
        <div className="legal-acceptance-card">
          <ShieldCheck size={24} />
          <strong>Aceite</strong>
          <p>
            Ao criar uma conta, acessar o dashboard, aceitar convites ou usar a
            plataforma, o usuário declara que leu e concorda com estes termos e
            com a política de privacidade.
          </p>
          <Link className="primary-button" href="/cadastro/empresa">
            Criar conta empresa
          </Link>
        </div>
      </section>

      <section className="legal-summary" aria-label="Resumo dos termos">
        {summaryItems.map((item) => (
          <article className="legal-summary-item" key={item.title}>
            <span>{item.icon}</span>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="legal-content">
        <article className="legal-section">
          <div className="legal-section-heading">
            <FileText size={20} />
            <h2>1. Termos de Uso</h2>
          </div>
          <p>
            O {appName} é uma plataforma digital para aproximar empresas,
            organizadores de eventos e profissionais freelancers, permitindo
            cadastro, busca, convite, negociação, agenda, contratação,
            pagamento, avaliação, notificações, contestações e operação
            administrativa.
          </p>
          <p>
            O usuário deve fornecer informações corretas, manter login e senha
            sob sua guarda e usar a plataforma apenas para finalidades lícitas.
            É proibido fraudar identidade, publicar informações falsas, tentar
            acessar dados de terceiros, burlar pagamentos, prejudicar a operação
            ou usar a plataforma para atividades incompatíveis com eventos e
            prestação de serviços.
          </p>
          <p>
            Empresas são responsáveis pelos dados dos eventos, condições da
            contratação, confirmação de presença, avaliação e marcação de
            no-show dentro dos prazos exibidos. Freelancers são responsáveis por
            disponibilidade, especialidades, valores, documentos, aceite ou
            recusa de convites e execução dos serviços aceitos.
          </p>
        </article>

        <article className="legal-section">
          <div className="legal-section-heading">
            <Scale size={20} />
            <h2>2. Contratações, pagamentos e contestações</h2>
          </div>
          <p>
            A contratação pode envolver convite, candidatura, contraproposta,
            aceite, contrato e pagamento pela plataforma. Valores, taxas da
            empresa, taxas do freelancer, gateway, carteira, complemento de
            pagamento e repasse seguem as configurações vigentes no momento da
            operação.
          </p>
          <p>
            A confirmação do trabalho depende das regras de pagamento ou reserva
            de saldo. Após o evento, a empresa pode avaliar o profissional ou
            informar no-show dentro do prazo operacional. Contestações podem
            bloquear repasses até análise administrativa.
          </p>
          <p>
            O {appName} pode registrar logs, notificações, histórico financeiro
            e evidências operacionais para auditoria, suporte, prevenção a
            fraudes, resolução de disputas e cumprimento de obrigações legais.
          </p>
        </article>

        <article className="legal-section">
          <div className="legal-section-heading">
            <LockKeyhole size={20} />
            <h2>3. Política de Privacidade e LGPD</h2>
          </div>
          <p>
            Tratamos dados pessoais conforme a Lei Geral de Proteção de Dados
            Pessoais, Lei nº 13.709/2018. Podemos coletar dados cadastrais,
            contato, documentos, endereço, dados profissionais, agenda,
            avaliações, dados financeiros operacionais, mensagens, anexos,
            registros de acesso e preferências.
          </p>
          <p>
            As bases legais podem incluir execução de contrato, cumprimento de
            obrigação legal ou regulatória, legítimo interesse, prevenção a
            fraudes, exercício regular de direitos e consentimento quando
            aplicável. Os dados são usados para operar contas, verificar
            usuários, conectar empresas e freelancers, viabilizar pagamentos,
            proteger a plataforma, prestar suporte e melhorar o produto.
          </p>
          <p>
            Dados sensíveis ou documentos devem ser acessados apenas por áreas
            autorizadas e pelo tempo necessário às finalidades informadas,
            obrigações legais, auditoria e prevenção a fraudes. O usuário pode
            solicitar confirmação de tratamento, acesso, correção, portabilidade,
            anonimização, bloqueio, eliminação ou revisão de consentimento,
            respeitados prazos legais e necessidades operacionais.
          </p>
        </article>

        <article className="legal-section">
          <div className="legal-section-heading">
            <Cookie size={20} />
            <h2>4. Política de Cookies</h2>
          </div>
          <p>
            Cookies essenciais e tecnologias semelhantes podem ser usados para
            autenticação, segurança, sessão, tema visual, preferências,
            funcionamento do dashboard e prevenção de abuso. Sem eles, partes da
            plataforma podem não funcionar corretamente.
          </p>
          <p>
            Cookies analíticos, de desempenho ou melhoria de produto devem ser
            usados apenas quando houver consentimento ou outra base legal
            aplicável. O usuário pode escolher apenas cookies essenciais no
            banner de privacidade e pode limpar as preferências no navegador.
          </p>
          <p>
            Ao aceitar cookies no banner, registramos localmente a versão do
            consentimento, data e preferência escolhida. Essa preferência fica
            salva no navegador usado no momento do aceite.
          </p>
        </article>

        <article className="legal-section">
          <div className="legal-section-heading">
            <ShieldCheck size={20} />
            <h2>5. Segurança, alterações e contato</h2>
          </div>
          <p>
            Aplicamos controles técnicos e organizacionais proporcionais ao
            estágio do produto, incluindo autenticação, permissões por perfil,
            isolamento de dados por usuário, armazenamento protegido e revisão
            administrativa de ações sensíveis.
          </p>
          <p>
            Estes termos podem ser atualizados para refletir mudanças legais,
            operacionais, financeiras ou de produto. Alterações relevantes
            poderão exigir novo aceite. Dúvidas e solicitações de privacidade
            devem ser enviadas pelos canais oficiais informados pela plataforma.
          </p>
        </article>
      </section>
      <SiteFooter />
    </main>
  );
}
