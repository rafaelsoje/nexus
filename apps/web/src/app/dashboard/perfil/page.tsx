"use client";

import {
  CreditCard,
  FileText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { EmptyState, Field, StatusMessage } from "../../../components/ui";
import {
  apiFileRequest,
  apiRequest,
  clearSession,
  getSession,
  saveSession,
} from "../../../lib/api";
import type { UserRole } from "../../../lib/api";
import type {
  CompanyProfile,
  FreelancerProfile,
  VerificationDocument,
} from "../../../lib/dashboard-types";

type PrivateUserProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  adminProfile?: {
    accessLevel: string;
  } | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const session = useRequiredSession();
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
    null,
  );
  const [freelancerProfile, setFreelancerProfile] =
    useState<FreelancerProfile | null>(null);
  const [userProfile, setUserProfile] = useState<PrivateUserProfile | null>(
    null,
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      if (session?.user.role === "COMPANY") {
        setCompanyProfile(
          await apiRequest<CompanyProfile>("/api/companies/profile"),
        );
      }

      if (session?.user.role === "FREELANCER") {
        setFreelancerProfile(
          await apiRequest<FreelancerProfile>("/api/freelancers/profile"),
        );
      }

      if (session?.user.role === "ADMIN") {
        setUserProfile(await apiRequest<PrivateUserProfile>("/api/users/me"));
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao carregar perfil.",
      );
    } finally {
      setLoading(false);
    }
  }, [session?.user.role]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadProfile();
  }, [loadProfile, session]);

  async function handleSaveCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const postalCode = onlyDigits(String(form.get("postalCode")));
    setError("");
    setSuccess("");

    if (postalCode && postalCode.length !== 8) {
      setError("CEP inválido. Informe 8 números.");
      return;
    }

    try {
      await apiRequest("/api/companies/profile", {
        method: "PATCH",
        body: JSON.stringify({
          companyName: String(form.get("companyName")),
          responsibleName: String(form.get("responsibleName")),
          document: String(form.get("document")),
          phone: String(form.get("phone")),
          email: String(form.get("email")),
          postalCode,
          addressStreet: String(form.get("addressStreet")),
          addressNumber: String(form.get("addressNumber")),
          addressComplement: String(form.get("addressComplement")),
          neighborhood: String(form.get("neighborhood")),
          city: String(form.get("city")),
          state: String(form.get("state")),
        }),
      });
      setSuccess("Perfil da empresa atualizado.");
      await loadProfile();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao salvar empresa.",
      );
    }
  }

  async function handleSaveFreelancer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const cpf = onlyDigits(String(form.get("cpf")));
    const postalCode = onlyDigits(String(form.get("postalCode")));
    setError("");
    setSuccess("");

    if (cpf && cpf.length !== 11) {
      setError("CPF inválido. Informe 11 números.");
      return;
    }

    if (postalCode && postalCode.length !== 8) {
      setError("CEP inválido. Informe 8 números.");
      return;
    }

    try {
      await apiRequest("/api/freelancers/profile", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: String(form.get("fullName")),
          displayName: String(form.get("displayName")),
          cpf,
          identityDocument: String(form.get("identityDocument")),
          postalCode,
          addressStreet: String(form.get("addressStreet")),
          addressNumber: String(form.get("addressNumber")),
          addressComplement: String(form.get("addressComplement")),
          neighborhood: String(form.get("neighborhood")),
          city: String(form.get("city")),
          state: String(form.get("state")),
          transportation: String(form.get("transportation")),
        }),
      });
      window.dispatchEvent(new Event("nexus:profile-updated"));
      setSuccess("Perfil profissional atualizado.");
      await loadProfile();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao salvar perfil.",
      );
    }
  }

  async function handleUploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("file");
    setError("");
    setSuccess("");

    if (!(file instanceof File)) {
      setError("Selecione um arquivo.");
      return;
    }

    try {
      await apiRequest("/api/documents/verification", {
        method: "POST",
        body: JSON.stringify({
          category: String(form.get("category")),
          originalName: file.name,
          mimeType: file.type,
          data: await readFileAsDataUrl(file),
        }),
      });
      formElement.reset();
      setSuccess("Documento enviado para verificação.");
      await loadProfile();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao enviar documento.",
      );
    }
  }

  async function handleDeleteDocument(documentId: string) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/api/documents/${documentId}`, { method: "DELETE" });
      setSuccess("Documento removido.");
      await loadProfile();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao remover documento.",
      );
    }
  }

  async function handleOpenDocument(documentId: string) {
    setError("");

    try {
      const blob = await apiFileRequest(`/api/documents/${documentId}/file`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao abrir documento.",
      );
    }
  }

  async function handleSaveMyAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<PrivateUserProfile>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: String(form.get("name")),
          email: String(form.get("email")),
          phone: String(form.get("phone")),
        }),
      });
      setUserProfile(updated);

      const currentSession = getSession();
      if (currentSession) {
        saveSession({
          ...currentSession,
          user: {
            ...currentSession.user,
            name: updated.name,
            email: updated.email,
          },
        });
        window.dispatchEvent(new Event("nexus:profile-updated"));
      }

      setSuccess("Dados da conta atualizados.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erro ao salvar dados da conta.",
      );
    }
  }

  async function handleChangeMyPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const newPassword = String(form.get("newPassword"));
    const confirmPassword = String(form.get("confirmPassword"));
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("A confirmação da nova senha não confere.");
      return;
    }

    try {
      await apiRequest("/api/users/me/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: String(form.get("currentPassword")),
          newPassword,
        }),
      });
      formElement.reset();
      clearSession();
      setSuccess("Senha alterada. Entre novamente para continuar.");
      window.setTimeout(() => router.push("/login"), 900);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao alterar senha.",
      );
    }
  }

  async function handleAnonymizeAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const confirmation = String(form.get("confirmation") || "").trim();
    const password = String(form.get("password") || "");
    setError("");
    setSuccess("");

    if (confirmation !== "EXCLUIR") {
      setError("Digite EXCLUIR para confirmar a solicitação.");
      return;
    }

    try {
      await apiRequest("/api/users/me/anonymize", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      clearSession();
      router.push("/login");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao excluir a conta.",
      );
    }
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardShell
      action={<ModuleHeaderAction onRefresh={loadProfile} />}
      eyebrow={session.user.role}
      title="Perfil"
    >
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {loading ? <EmptyState>Carregando perfil...</EmptyState> : null}

      {session.user.role === "COMPANY" && companyProfile ? (
        <CompanyProfileForm
          profile={companyProfile}
          onDeleteDocument={handleDeleteDocument}
          onOpenDocument={handleOpenDocument}
          onSaveLogo={async (logoUrl) => {
            setError("");
            setSuccess("");

            try {
              const updatedProfile = await apiRequest<CompanyProfile>(
                "/api/companies/profile/logo",
                {
                  method: "PATCH",
                  body: JSON.stringify({ logoUrl }),
                },
              );
              setCompanyProfile(updatedProfile);
              window.dispatchEvent(new Event("nexus:profile-updated"));
              setSuccess("Logo da empresa atualizado.");
            } catch (caught) {
              setError(
                caught instanceof Error
                  ? caught.message
                  : "Erro ao salvar logo.",
              );
            }
          }}
          onSubmit={handleSaveCompany}
          onUploadDocument={handleUploadDocument}
        />
      ) : null}

      {session.user.role === "FREELANCER" ? (
        <FreelancerProfileSection
          profile={freelancerProfile}
          onDeleteDocument={handleDeleteDocument}
          onOpenDocument={handleOpenDocument}
          onSyncGatewayAccount={async () => {
            setError("");
            setSuccess("");

            try {
              if (!freelancerProfile?.cpf) {
                throw new Error(
                  "Informe o CPF antes de atualizar o recebedor.",
                );
              }

              await apiRequest("/api/gateway-accounts/freelancer/me", {
                method: "POST",
                body: JSON.stringify({
                  documentType: "CPF",
                  documentNumber: freelancerProfile.cpf,
                  holderName:
                    freelancerProfile.fullName ??
                    freelancerProfile.displayName ??
                    session.user.name,
                  postalCode: freelancerProfile.postalCode,
                  addressStreet: freelancerProfile.addressStreet,
                  addressNumber: freelancerProfile.addressNumber,
                  addressComplement: freelancerProfile.addressComplement,
                  neighborhood: freelancerProfile.neighborhood,
                  city: freelancerProfile.city,
                  state: freelancerProfile.state,
                }),
              });
              const updatedProfile = await apiRequest<FreelancerProfile>(
                "/api/freelancers/profile",
              );
              setFreelancerProfile(updatedProfile);
              setSuccess("Recebedor financeiro atualizado.");
            } catch (caught) {
              setError(
                caught instanceof Error
                  ? caught.message
                  : "Erro ao atualizar recebedor.",
              );
            }
          }}
          onSaveAvatar={async (avatarUrl) => {
            setError("");
            setSuccess("");

            try {
              const updatedProfile = await apiRequest<FreelancerProfile>(
                "/api/freelancers/profile/avatar",
                {
                  method: "PATCH",
                  body: JSON.stringify({ avatarUrl }),
                },
              );
              setFreelancerProfile(updatedProfile);
              window.dispatchEvent(new Event("nexus:profile-updated"));
              setSuccess("Foto de perfil atualizada.");
            } catch (caught) {
              setError(
                caught instanceof Error
                  ? caught.message
                  : "Erro ao salvar foto.",
              );
              throw caught;
            }
          }}
          onSaveProfile={handleSaveFreelancer}
          onUploadDocument={handleUploadDocument}
        />
      ) : null}

      {session.user.role === "ADMIN" && userProfile ? (
        <AdminAccountSection
          profile={userProfile}
          onChangePassword={handleChangeMyPassword}
          onSaveAccount={handleSaveMyAccount}
        />
      ) : null}

      {session.user.role === "COMPANY" || session.user.role === "FREELANCER" ? (
        <AccountDeletionPanel onSubmit={handleAnonymizeAccount} />
      ) : null}
    </DashboardShell>
  );
}

function AdminAccountSection({
  onChangePassword,
  onSaveAccount,
  profile,
}: Readonly<{
  onChangePassword: (event: FormEvent<HTMLFormElement>) => void;
  onSaveAccount: (event: FormEvent<HTMLFormElement>) => void;
  profile: PrivateUserProfile;
}>) {
  return (
    <section className="dashboard-grid">
      <article className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Minha conta</span>
            <h2>Dados do administrador</h2>
          </div>
          <Settings size={18} />
        </div>
        <p className="form-note">
          Atualize os dados usados para identificar sua conta administrativa na
          plataforma.
        </p>
        <form className="form compact" onSubmit={onSaveAccount}>
          <Field label="Nome">
            <input name="name" defaultValue={profile.name} required />
          </Field>
          <Field label="E-mail">
            <input
              name="email"
              defaultValue={profile.email}
              required
              type="email"
            />
          </Field>
          <Field label="Telefone">
            <input
              name="phone"
              defaultValue={profile.phone ?? ""}
              placeholder="Telefone de contato"
            />
          </Field>
          <div className="detail-row">
            <span>Nível administrativo</span>
            <strong>
              {formatAdminAccessLevel(profile.adminProfile?.accessLevel)}
            </strong>
          </div>
          <button className="primary-button full" type="submit">
            Salvar dados
          </button>
        </form>
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Segurança</span>
            <h2>Alterar senha</h2>
          </div>
          <ShieldCheck size={18} />
        </div>
        <p className="form-note">
          Informe a senha atual e escolha uma nova senha com pelo menos 8
          caracteres. Após a alteração, será necessário entrar novamente.
        </p>
        <form className="form compact" onSubmit={onChangePassword}>
          <Field label="Senha atual">
            <input
              autoComplete="current-password"
              name="currentPassword"
              required
              type="password"
            />
          </Field>
          <Field label="Nova senha">
            <input
              autoComplete="new-password"
              name="newPassword"
              required
              type="password"
            />
          </Field>
          <Field label="Confirmar nova senha">
            <input
              autoComplete="new-password"
              name="confirmPassword"
              required
              type="password"
            />
          </Field>
          <button className="primary-button full" type="submit">
            Alterar senha
          </button>
        </form>
      </article>
    </section>
  );
}

function AccountDeletionPanel({
  onSubmit,
}: Readonly<{
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  return (
    <section className="panel" style={{ marginTop: "1rem" }}>
      <div className="panel-header">
        <div>
          <span className="eyebrow">Privacidade</span>
          <h2>Excluir conta</h2>
        </div>
        <ShieldAlert size={18} />
      </div>
      <p className="form-note">
        Esta ação desativa seu acesso, apaga documentos de verificação e
        remove/mascara dados pessoais. Histórico operacional, contratos,
        avaliações e auditoria ficam preservados sem seus dados privados.
      </p>
      <form className="form compact" onSubmit={onSubmit}>
        <Field label="Confirmação">
          <input
            autoComplete="off"
            name="confirmation"
            placeholder="Digite EXCLUIR"
            required
          />
        </Field>
        <Field label="Senha atual">
          <input
            autoComplete="current-password"
            name="password"
            required
            type="password"
          />
        </Field>
        <button className="primary-button danger-button full" type="submit">
          Excluir minha conta
        </button>
      </form>
    </section>
  );
}

function CompanyProfileForm({
  profile,
  onDeleteDocument,
  onOpenDocument,
  onSaveLogo,
  onSubmit,
  onUploadDocument,
}: Readonly<{
  profile: CompanyProfile;
  onDeleteDocument: (documentId: string) => void;
  onOpenDocument: (documentId: string) => void;
  onSaveLogo: (logoUrl: string) => Promise<void>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUploadDocument: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  const logoDragState = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);
  const [logoValue, setLogoValue] = useState(profile.logoUrl ?? "");
  const [logoSource, setLogoSource] = useState("");
  const [logoZoom, setLogoZoom] = useState(1);
  const [logoOffsetX, setLogoOffsetX] = useState(0);
  const [logoOffsetY, setLogoOffsetY] = useState(0);
  const [logoImageSize, setLogoImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [companyCepValue, setCompanyCepValue] = useState("");
  const [companyCepMessage, setCompanyCepMessage] = useState("");

  useEffect(() => {
    setLogoValue(profile.logoUrl ?? "");
    setLogoSource("");
    setLogoZoom(1);
    setLogoOffsetX(0);
    setLogoOffsetY(0);
    setLogoImageSize(null);
    setIsLogoModalOpen(false);
    setIsDraggingLogo(false);
    setCompanyCepValue("");
    setCompanyCepMessage("");
  }, [profile.logoUrl]);

  async function handleLogoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(dataUrl);
    setLogoSource(dataUrl);
    setLogoImageSize({ width: image.width, height: image.height });
    setLogoZoom(1);
    setLogoOffsetX(0);
    setLogoOffsetY(0);
    setIsLogoModalOpen(true);
    event.target.value = "";
  }

  async function applyLogoAdjustment() {
    if (!logoSource) {
      return;
    }

    setIsSavingLogo(true);

    try {
      const adjustedLogo = await createAdjustedAvatar(
        logoSource,
        logoZoom,
        logoOffsetX,
        logoOffsetY,
      );
      await onSaveLogo(adjustedLogo);
      setLogoValue(adjustedLogo);
      setLogoSource(adjustedLogo);
      setLogoImageSize({
        width: AVATAR_CANVAS_SIZE,
        height: AVATAR_CANVAS_SIZE,
      });
      setLogoZoom(1);
      setLogoOffsetX(0);
      setLogoOffsetY(0);
      setIsLogoModalOpen(false);
    } finally {
      setIsSavingLogo(false);
    }
  }

  function handleLogoDragStart(event: PointerEvent<HTMLDivElement>) {
    if (!logoSource) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    logoDragState.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    setIsDraggingLogo(true);
  }

  function handleLogoDragMove(event: PointerEvent<HTMLDivElement>) {
    if (
      !logoDragState.current ||
      logoDragState.current.pointerId !== event.pointerId
    ) {
      return;
    }

    const deltaX = event.clientX - logoDragState.current.x;
    const deltaY = event.clientY - logoDragState.current.y;
    const outputScale = AVATAR_CANVAS_SIZE / AVATAR_PREVIEW_SIZE;

    setLogoOffsetX((current) =>
      clampAvatarOffset(current + deltaX * outputScale),
    );
    setLogoOffsetY((current) =>
      clampAvatarOffset(current + deltaY * outputScale),
    );
    logoDragState.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handleLogoDragEnd(event: PointerEvent<HTMLDivElement>) {
    if (logoDragState.current?.pointerId === event.pointerId) {
      logoDragState.current = null;
      setIsDraggingLogo(false);
    }
  }

  async function lookupCompanyCep(value: string) {
    const postalCode = onlyDigits(value);
    setCompanyCepMessage("");

    if (!postalCode) {
      return;
    }

    if (postalCode.length !== 8) {
      setCompanyCepMessage("CEP inválido. Informe 8 números.");
      return;
    }

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${postalCode}/json/`,
      );
      const data = (await response.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };

      if (!response.ok || data.erro) {
        setCompanyCepMessage("CEP não encontrado.");
        return;
      }

      setFieldValue("addressStreet", data.logradouro ?? "");
      setFieldValue("neighborhood", data.bairro ?? "");
      setFieldValue("city", data.localidade ?? "");
      setFieldValue("state", data.uf ?? "");
      setCompanyCepValue(formatCep(postalCode));
      setCompanyCepMessage("Endereço preenchido pelo CEP.");
    } catch {
      setCompanyCepMessage("Não foi possível consultar o CEP agora.");
    }
  }

  const logoPreviewSize = logoImageSize
    ? getAvatarRenderedSize(
        logoImageSize.width,
        logoImageSize.height,
        logoZoom,
        AVATAR_PREVIEW_SIZE,
      )
    : null;

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <div className="panel-header">
          <h2>Dados da empresa</h2>
          <Settings size={18} />
        </div>
        <form className="form compact" onSubmit={onSubmit}>
          <Field label="Nome fantasia">
            <input
              name="companyName"
              defaultValue={profile.companyName}
              required
            />
          </Field>
          <Field label="Responsável legal">
            <input
              name="responsibleName"
              defaultValue={profile.responsibleName}
              required
            />
          </Field>
          <Field label="CNPJ">
            <input name="document" defaultValue={profile.document ?? ""} />
          </Field>
          <Field label="Logo da empresa">
            <div className="avatar-upload-row">
              <div className="company-logo-preview" aria-hidden="true">
                {logoValue ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" src={logoValue} />
                ) : (
                  <span>{getInitials(profile.companyName)}</span>
                )}
              </div>
              <label className="secondary-button file-button">
                <Upload size={16} />
                {isSavingLogo ? "Salvando..." : "Escolher logo"}
                <input
                  accept="image/*"
                  className="file-input-hidden"
                  disabled={isSavingLogo}
                  onChange={handleLogoFile}
                  type="file"
                />
              </label>
            </div>
          </Field>
          <Field label="CEP da empresa">
            <input
              inputMode="numeric"
              maxLength={9}
              name="postalCode"
              onBlur={() => void lookupCompanyCep(companyCepValue)}
              onChange={(event) =>
                setCompanyCepValue(formatCep(event.target.value))
              }
              placeholder="00000-000"
              value={companyCepValue}
            />
          </Field>
          {companyCepMessage ? (
            <small className="form-note">{companyCepMessage}</small>
          ) : null}
          <Field label="Endereço comercial">
            <input name="addressStreet" defaultValue="" />
          </Field>
          <div className="form-grid">
            <Field label="Número">
              <input name="addressNumber" defaultValue="" />
            </Field>
            <Field label="Complemento">
              <input name="addressComplement" defaultValue="" />
            </Field>
          </div>
          <Field label="Bairro">
            <input name="neighborhood" defaultValue="" />
          </Field>
          <div className="form-grid">
            <Field label="Cidade">
              <input name="city" defaultValue="" />
            </Field>
            <Field label="UF">
              <input name="state" defaultValue="" maxLength={2} />
            </Field>
          </div>
          <Field label="Telefone comercial">
            <input name="phone" defaultValue={profile.phone ?? ""} />
          </Field>
          <Field label="E-mail corporativo">
            <input
              name="email"
              type="email"
              defaultValue={profile.email}
              required
            />
          </Field>
          <button className="primary-button full" type="submit">
            Salvar dados da empresa
          </button>
        </form>
        {isLogoModalOpen ? (
          <div className="agenda-modal-backdrop" role="presentation">
            <div
              aria-modal="true"
              className="agenda-modal avatar-modal"
              role="dialog"
            >
              <div className="agenda-modal-header">
                <div>
                  <span>Logo da empresa</span>
                  <h2>Ajustar imagem</h2>
                </div>
                <button
                  aria-label="Fechar ajuste de logo"
                  className="agenda-modal-close"
                  onClick={() => setIsLogoModalOpen(false)}
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="avatar-editor">
                <div className="avatar-preview">
                  {logoSource ? (
                    <div
                      aria-label="Arraste para reposicionar o logo"
                      className={
                        isDraggingLogo
                          ? "avatar-drag-surface dragging"
                          : "avatar-drag-surface"
                      }
                      onPointerCancel={handleLogoDragEnd}
                      onPointerDown={handleLogoDragStart}
                      onPointerMove={handleLogoDragMove}
                      onPointerUp={handleLogoDragEnd}
                      role="application"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="Prévia do logo"
                        draggable={false}
                        src={logoSource}
                        style={{
                          height: logoPreviewSize
                            ? `${logoPreviewSize.height}px`
                            : undefined,
                          transform: `translate(${logoOffsetX * AVATAR_PREVIEW_SCALE}px, ${logoOffsetY * AVATAR_PREVIEW_SCALE}px)`,
                          width: logoPreviewSize
                            ? `${logoPreviewSize.width}px`
                            : undefined,
                        }}
                      />
                    </div>
                  ) : (
                    <span>Sem imagem</span>
                  )}
                </div>
                <div className="avatar-controls">
                  <small className="form-note">
                    Arraste a imagem dentro do círculo para ajustar o
                    enquadramento.
                  </small>
                  <Field label="Zoom">
                    <input
                      max={4}
                      min={1}
                      onChange={(event) =>
                        setLogoZoom(Number(event.target.value))
                      }
                      step={0.05}
                      type="range"
                      value={logoZoom}
                    />
                  </Field>
                  <div className="form-grid">
                    <Field label="Horizontal">
                      <input
                        max={AVATAR_MAX_OFFSET}
                        min={-AVATAR_MAX_OFFSET}
                        onChange={(event) =>
                          setLogoOffsetX(Number(event.target.value))
                        }
                        type="range"
                        value={logoOffsetX}
                      />
                    </Field>
                    <Field label="Vertical">
                      <input
                        max={AVATAR_MAX_OFFSET}
                        min={-AVATAR_MAX_OFFSET}
                        onChange={(event) =>
                          setLogoOffsetY(Number(event.target.value))
                        }
                        type="range"
                        value={logoOffsetY}
                      />
                    </Field>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button
                  className="secondary-button"
                  onClick={() => setIsLogoModalOpen(false)}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="primary-button"
                  disabled={!logoSource || isSavingLogo}
                  onClick={applyLogoAdjustment}
                  type="button"
                >
                  {isSavingLogo ? "Salvando..." : "Aplicar logo"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </article>
      <VerificationDocumentsPanel
        documents={profile.verificationDocuments ?? []}
        documentOptions={companyDocumentOptions}
        onDeleteDocument={onDeleteDocument}
        onOpenDocument={onOpenDocument}
        onUploadDocument={onUploadDocument}
        submitLabel="Enviar documento da empresa"
      />
    </section>
  );
}

function FreelancerProfileSection({
  profile,
  onDeleteDocument,
  onOpenDocument,
  onSaveAvatar,
  onSaveProfile,
  onSyncGatewayAccount,
  onUploadDocument,
}: Readonly<{
  profile: FreelancerProfile | null;
  onDeleteDocument: (documentId: string) => void;
  onOpenDocument: (documentId: string) => void;
  onSaveAvatar: (avatarUrl: string) => Promise<void>;
  onSaveProfile: (event: FormEvent<HTMLFormElement>) => void;
  onSyncGatewayAccount: () => Promise<void>;
  onUploadDocument: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  const dragState = useRef<{ pointerId: number; x: number; y: number } | null>(
    null,
  );
  const [avatarSource, setAvatarSource] = useState("");
  const [avatarValue, setAvatarValue] = useState("");
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarOffsetX, setAvatarOffsetX] = useState(0);
  const [avatarOffsetY, setAvatarOffsetY] = useState(0);
  const [avatarImageSize, setAvatarImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [cpfValue, setCpfValue] = useState("");
  const [cepValue, setCepValue] = useState("");
  const [cepMessage, setCepMessage] = useState("");

  useEffect(() => {
    setAvatarValue(profile?.avatarUrl ?? "");
    setAvatarSource("");
    setAvatarZoom(1);
    setAvatarOffsetX(0);
    setAvatarOffsetY(0);
    setAvatarImageSize(null);
    setIsAvatarModalOpen(false);
    setIsDraggingAvatar(false);
    setCpfValue(formatCpf(profile?.cpf ?? ""));
    setCepValue(formatCep(profile?.postalCode ?? ""));
  }, [profile?.avatarUrl, profile?.cpf, profile?.postalCode]);

  async function handleAvatarFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(dataUrl);
    setAvatarSource(dataUrl);
    setAvatarImageSize({ width: image.width, height: image.height });
    setAvatarZoom(1);
    setAvatarOffsetX(0);
    setAvatarOffsetY(0);
    setIsAvatarModalOpen(true);
    event.target.value = "";
  }

  async function applyAvatarAdjustment() {
    if (!avatarSource) {
      return;
    }

    setIsSavingAvatar(true);

    try {
      const adjustedAvatar = await createAdjustedAvatar(
        avatarSource,
        avatarZoom,
        avatarOffsetX,
        avatarOffsetY,
      );
      await onSaveAvatar(adjustedAvatar);
      setAvatarValue(adjustedAvatar);
      setAvatarSource(adjustedAvatar);
      setAvatarImageSize({
        width: AVATAR_CANVAS_SIZE,
        height: AVATAR_CANVAS_SIZE,
      });
      setAvatarZoom(1);
      setAvatarOffsetX(0);
      setAvatarOffsetY(0);
      setIsAvatarModalOpen(false);
    } finally {
      setIsSavingAvatar(false);
    }
  }

  function handleAvatarDragStart(event: PointerEvent<HTMLDivElement>) {
    if (!avatarSource) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    setIsDraggingAvatar(true);
  }

  function handleAvatarDragMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.current.x;
    const deltaY = event.clientY - dragState.current.y;
    const outputScale = AVATAR_CANVAS_SIZE / AVATAR_PREVIEW_SIZE;

    setAvatarOffsetX((current) =>
      clampAvatarOffset(current + deltaX * outputScale),
    );
    setAvatarOffsetY((current) =>
      clampAvatarOffset(current + deltaY * outputScale),
    );
    dragState.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handleAvatarDragEnd(event: PointerEvent<HTMLDivElement>) {
    if (dragState.current?.pointerId === event.pointerId) {
      dragState.current = null;
      setIsDraggingAvatar(false);
    }
  }

  async function lookupCep(value: string) {
    const postalCode = onlyDigits(value);
    setCepMessage("");

    if (!postalCode) {
      return;
    }

    if (postalCode.length !== 8) {
      setCepMessage("CEP inválido. Informe 8 números.");
      return;
    }

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${postalCode}/json/`,
      );
      const data = (await response.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };

      if (!response.ok || data.erro) {
        setCepMessage("CEP não encontrado.");
        return;
      }

      setFieldValue("addressStreet", data.logradouro ?? "");
      setFieldValue("neighborhood", data.bairro ?? "");
      setFieldValue("city", data.localidade ?? "");
      setFieldValue("state", data.uf ?? "");
      setCepValue(formatCep(postalCode));
      setCepMessage("Endereço preenchido pelo CEP.");
    } catch {
      setCepMessage("Não foi possível consultar o CEP agora.");
    }
  }

  const avatarPreviewSize = avatarImageSize
    ? getAvatarRenderedSize(
        avatarImageSize.width,
        avatarImageSize.height,
        avatarZoom,
        AVATAR_PREVIEW_SIZE,
      )
    : null;

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <div className="panel-header">
          <h2>Dados pessoais</h2>
          <Settings size={18} />
        </div>
        <form className="form compact" onSubmit={onSaveProfile}>
          <Field label="Nome completo">
            <input name="fullName" defaultValue={profile?.fullName ?? ""} />
          </Field>
          <Field label="Nome profissional">
            <input
              name="displayName"
              defaultValue={profile?.displayName ?? ""}
            />
          </Field>
          <div className="form-grid">
            <Field label="CPF">
              <input
                name="cpf"
                inputMode="numeric"
                maxLength={14}
                onChange={(event) => setCpfValue(formatCpf(event.target.value))}
                placeholder="000.000.000-00"
                value={cpfValue}
              />
            </Field>
            <Field label="Documento de identidade">
              <input
                name="identityDocument"
                defaultValue={profile?.identityDocument ?? ""}
                placeholder="RG, CNH ou outro documento"
              />
            </Field>
          </div>
          <Field label="Foto de perfil / avatar">
            <div className="avatar-upload-row">
              <div className="profile-avatar large" aria-hidden="true">
                {avatarValue ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" src={avatarValue} />
                ) : (
                  <span>{getInitials(profile?.displayName)}</span>
                )}
              </div>
              <label className="secondary-button file-button">
                <Upload size={16} />
                Escolher foto
                <input
                  accept="image/*"
                  className="file-input-hidden"
                  onChange={handleAvatarFile}
                  type="file"
                />
              </label>
            </div>
          </Field>
          <Field label="CEP">
            <input
              inputMode="numeric"
              maxLength={9}
              name="postalCode"
              onBlur={() => void lookupCep(cepValue)}
              onChange={(event) => setCepValue(formatCep(event.target.value))}
              placeholder="00000-000"
              value={cepValue}
            />
          </Field>
          {cepMessage ? (
            <small className="form-note">{cepMessage}</small>
          ) : null}
          <Field label="Endereço">
            <input
              name="addressStreet"
              defaultValue={profile?.addressStreet ?? ""}
            />
          </Field>
          <div className="form-grid">
            <Field label="Número">
              <input
                name="addressNumber"
                defaultValue={profile?.addressNumber ?? ""}
              />
            </Field>
            <Field label="Complemento">
              <input
                name="addressComplement"
                defaultValue={profile?.addressComplement ?? ""}
              />
            </Field>
          </div>
          <Field label="Bairro">
            <input
              name="neighborhood"
              defaultValue={profile?.neighborhood ?? ""}
            />
          </Field>
          <div className="form-grid">
            <Field label="Cidade">
              <input name="city" defaultValue="" />
            </Field>
            <Field label="UF">
              <input name="state" defaultValue="" maxLength={2} />
            </Field>
          </div>
          <Field label="Transporte para eventos">
            <input
              name="transportation"
              defaultValue=""
              placeholder="Carro próprio"
            />
          </Field>
          <button className="primary-button full" type="submit">
            Salvar perfil
          </button>
        </form>
        {isAvatarModalOpen ? (
          <div className="agenda-modal-backdrop" role="presentation">
            <div
              aria-modal="true"
              className="agenda-modal avatar-modal"
              role="dialog"
            >
              <div className="agenda-modal-header">
                <div>
                  <span>Foto de perfil</span>
                  <h2>Ajustar avatar</h2>
                </div>
                <button
                  aria-label="Fechar ajuste de foto"
                  className="agenda-modal-close"
                  onClick={() => setIsAvatarModalOpen(false)}
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="avatar-editor">
                <div className="avatar-preview">
                  {avatarSource ? (
                    <div
                      aria-label="Arraste para reposicionar a foto"
                      className={
                        isDraggingAvatar
                          ? "avatar-drag-surface dragging"
                          : "avatar-drag-surface"
                      }
                      onPointerCancel={handleAvatarDragEnd}
                      onPointerDown={handleAvatarDragStart}
                      onPointerMove={handleAvatarDragMove}
                      onPointerUp={handleAvatarDragEnd}
                      role="application"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="Prévia do avatar"
                        draggable={false}
                        src={avatarSource}
                        style={{
                          height: avatarPreviewSize
                            ? `${avatarPreviewSize.height}px`
                            : undefined,
                          transform: `translate(${avatarOffsetX * AVATAR_PREVIEW_SCALE}px, ${avatarOffsetY * AVATAR_PREVIEW_SCALE}px)`,
                          width: avatarPreviewSize
                            ? `${avatarPreviewSize.width}px`
                            : undefined,
                        }}
                      />
                    </div>
                  ) : (
                    <span>Sem foto</span>
                  )}
                </div>
                <div className="avatar-controls">
                  <small className="form-note">
                    Arraste a foto dentro do círculo para ajustar o
                    enquadramento.
                  </small>
                  <Field label="Zoom">
                    <input
                      max={4}
                      min={1}
                      onChange={(event) =>
                        setAvatarZoom(Number(event.target.value))
                      }
                      step={0.05}
                      type="range"
                      value={avatarZoom}
                    />
                  </Field>
                  <div className="form-grid">
                    <Field label="Horizontal">
                      <input
                        max={AVATAR_MAX_OFFSET}
                        min={-AVATAR_MAX_OFFSET}
                        onChange={(event) =>
                          setAvatarOffsetX(Number(event.target.value))
                        }
                        type="range"
                        value={avatarOffsetX}
                      />
                    </Field>
                    <Field label="Vertical">
                      <input
                        max={AVATAR_MAX_OFFSET}
                        min={-AVATAR_MAX_OFFSET}
                        onChange={(event) =>
                          setAvatarOffsetY(Number(event.target.value))
                        }
                        type="range"
                        value={avatarOffsetY}
                      />
                    </Field>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button
                  className="secondary-button"
                  onClick={() => setIsAvatarModalOpen(false)}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="primary-button"
                  disabled={!avatarSource || isSavingAvatar}
                  onClick={applyAvatarAdjustment}
                  type="button"
                >
                  {isSavingAvatar ? "Salvando..." : "Aplicar foto"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </article>

      <VerificationDocumentsPanel
        documents={profile?.verificationDocuments ?? []}
        documentOptions={freelancerDocumentOptions}
        onDeleteDocument={onDeleteDocument}
        onOpenDocument={onOpenDocument}
        onUploadDocument={onUploadDocument}
        submitLabel="Enviar documento"
      />
      <GatewayAccountPanel
        profile={profile}
        onSyncGatewayAccount={onSyncGatewayAccount}
      />
    </section>
  );
}

function GatewayAccountPanel({
  onSyncGatewayAccount,
  profile,
}: Readonly<{
  onSyncGatewayAccount: () => Promise<void>;
  profile: FreelancerProfile | null;
}>) {
  const [isSyncing, setIsSyncing] = useState(false);
  const account = profile?.gatewayAccounts?.[0];
  const isProfileVerified = profile?.verificationStatus === "VERIFIED";
  const canReceive =
    isProfileVerified &&
    account?.status === "ACTIVE" &&
    account?.kycStatus === "APPROVED" &&
    Boolean(account.gatewayRecipientId);

  async function handleSync() {
    setIsSyncing(true);

    try {
      await onSyncGatewayAccount();
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <article className="panel">
      <div className="panel-header">
        <h2>Recebedor financeiro</h2>
        <CreditCard size={18} />
      </div>
      <div className="gateway-status-card">
        <div
          className={
            canReceive ? "gateway-status-icon active" : "gateway-status-icon"
          }
        >
          <ShieldCheck size={20} />
        </div>
        <div>
          <strong>
            {canReceive ? "Apto a receber" : "Recebimento pendente"}
          </strong>
          <span>
            {canReceive
              ? "Conta gateway ativa e KYC aprovado."
              : "Finalize a verificação e atualize o recebedor simulado."}
          </span>
        </div>
      </div>
      <div className="list">
        <ProfileStatusRow
          label="Verificação NEXO"
          value={formatGatewayStatus(profile?.verificationStatus)}
        />
        <ProfileStatusRow
          label="Gateway"
          value={account?.gateway ?? "simulated"}
        />
        <ProfileStatusRow
          label="Status recebedor"
          value={formatGatewayStatus(account?.status)}
        />
        <ProfileStatusRow
          label="KYC gateway"
          value={formatGatewayStatus(account?.kycStatus)}
        />
        <ProfileStatusRow
          label="ID recebedor"
          value={account?.gatewayRecipientId ?? "-"}
        />
        <ProfileStatusRow
          label="Wallet gateway"
          value={account?.gatewayWalletId ?? "-"}
        />
      </div>
      <button
        className="primary-button full"
        disabled={!isProfileVerified || isSyncing}
        onClick={handleSync}
        type="button"
      >
        {isSyncing ? "Atualizando..." : "Atualizar recebedor"}
      </button>
      {!isProfileVerified ? (
        <small className="form-note">
          O recebedor só pode ser criado depois que o perfil for aprovado na
          verificação.
        </small>
      ) : null}
    </article>
  );
}

function ProfileStatusRow({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function VerificationDocumentsPanel({
  documents,
  documentOptions,
  onDeleteDocument,
  onOpenDocument,
  onUploadDocument,
  submitLabel,
}: Readonly<{
  documents: VerificationDocument[];
  documentOptions: DocumentOption[];
  onDeleteDocument: (documentId: string) => void;
  onOpenDocument: (documentId: string) => void;
  onUploadDocument: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
}>) {
  const panelDocumentLabels = Object.fromEntries(
    documentOptions.map((option) => [option.value, option.label]),
  );

  return (
    <article className="panel" id="verificacao-documentos">
      <div className="panel-header">
        <h2>Documentos</h2>
        <FileText size={18} />
      </div>
      <form className="form compact" onSubmit={onUploadDocument}>
        <Field label="Tipo">
          <select
            name="category"
            required
            defaultValue={documentOptions[0]?.value ?? "document"}
          >
            {documentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Arquivo">
          <input
            accept="application/pdf,image/jpeg,image/png,image/webp"
            name="file"
            required
            type="file"
          />
        </Field>
        <button className="primary-button full" type="submit">
          {submitLabel}
        </button>
      </form>
      <div className="list">
        {documents.length ? (
          documents.map((document) => (
            <div className="list-row" key={document.id}>
              <div>
                <strong>{document.originalName}</strong>
                <span>
                  {panelDocumentLabels[document.category] ??
                    documentLabels[document.category] ??
                    document.category}{" "}
                  - {formatFileSize(document.sizeBytes)}
                </span>
              </div>
              <div className="row-actions">
                <button
                  className="icon-action"
                  onClick={() => onOpenDocument(document.id)}
                  type="button"
                >
                  Abrir
                </button>
                <button
                  className="icon-action ghost"
                  onClick={() => onDeleteDocument(document.id)}
                  type="button"
                >
                  Remover
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState>Nenhum documento enviado.</EmptyState>
        )}
      </div>
    </article>
  );
}

type DocumentOption = {
  value: string;
  label: string;
};

const companyDocumentOptions: DocumentOption[] = [
  { value: "document", label: "Contrato social ou documento cadastral" },
  { value: "cnpj", label: "Cartão CNPJ" },
  { value: "address", label: "Comprovante de endereço da empresa" },
  { value: "portfolio", label: "Portfólio ou imagem institucional" },
];

const freelancerDocumentOptions: DocumentOption[] = [
  { value: "document", label: "Documento cadastral" },
  { value: "identity", label: "Identidade" },
  { value: "address", label: "Comprovante de endereço" },
  { value: "portfolio", label: "Portfólio ou imagem" },
];

const documentLabels: Record<string, string> = {
  document: "Documento cadastral",
  cnpj: "Cartão CNPJ",
  identity: "Identidade",
  address: "Comprovante de endereço",
  portfolio: "Portfólio ou imagem",
};

const gatewayStatusLabels: Record<string, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  PENDING: "Pendente",
  REJECTED: "Rejeitado",
  SUSPENDED: "Suspenso",
  VERIFIED: "Aprovado",
};

const AVATAR_CANVAS_SIZE = 512;
const AVATAR_PREVIEW_SIZE = 192;
const AVATAR_MAX_OFFSET = 256;
const AVATAR_PREVIEW_SCALE = AVATAR_PREVIEW_SIZE / AVATAR_CANVAS_SIZE;

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatGatewayStatus(status?: string) {
  return status ? (gatewayStatusLabels[status] ?? status) : "Pendente";
}

function formatAdminAccessLevel(accessLevel?: string) {
  const labels: Record<string, string> = {
    FINANCE: "Financeiro",
    MANAGER: "Gerente",
    OWNER: "Owner",
    READONLY: "Leitura",
    SUPPORT: "Suporte",
    VERIFICATION: "Verificação",
  };

  return accessLevel ? (labels[accessLevel] ?? accessLevel) : "Não informado";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatCep(value: string) {
  const digits = onlyDigits(value).slice(0, 8);

  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

function getInitials(name?: string) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "N"
  );
}

function setFieldValue(name: string, value: string) {
  const field = document.querySelector<HTMLInputElement>(`[name="${name}"]`);

  if (field) {
    field.value = value;
  }
}

function clampAvatarOffset(value: number) {
  return Math.max(-AVATAR_MAX_OFFSET, Math.min(AVATAR_MAX_OFFSET, value));
}

function getAvatarRenderedSize(
  imageWidth: number,
  imageHeight: number,
  zoom: number,
  targetSize: number,
) {
  const scale =
    Math.max(targetSize / imageWidth, targetSize / imageHeight) * zoom;

  return {
    width: imageWidth * scale,
    height: imageHeight * scale,
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("Imagem inválida.")),
    );
    image.src = src;
  });
}

async function createAdjustedAvatar(
  src: string,
  zoom: number,
  offsetX: number,
  offsetY: number,
) {
  const image = await loadImage(src);
  const size = AVATAR_CANVAS_SIZE;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = size;
  canvas.height = size;

  if (!context) {
    return src;
  }

  const scale = Math.max(size / image.width, size / image.height) * zoom;
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (size - width) / 2 + offsetX;
  const y = (size - height) / 2 + offsetY;

  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, size, size);
  context.drawImage(image, x, y, width, height);

  return canvas.toDataURL("image/jpeg", 0.9);
}
