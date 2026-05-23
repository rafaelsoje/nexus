"use client";

import { FileText, Settings, Upload, X } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import {
  DashboardShell,
  ModuleHeaderAction,
  useRequiredSession,
} from "../../../components/dashboard-shell";
import { EmptyState, Field, StatusMessage } from "../../../components/ui";
import { apiFileRequest, apiRequest } from "../../../lib/api";
import type {
  CompanyProfile,
  FreelancerProfile,
  VerificationDocument,
} from "../../../lib/dashboard-types";

export default function ProfilePage() {
  const session = useRequiredSession();
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
    null,
  );
  const [freelancerProfile, setFreelancerProfile] =
    useState<FreelancerProfile | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadProfile();
  }, [session]);

  async function loadProfile() {
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
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Erro ao carregar perfil.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setSuccess("");

    try {
      await apiRequest("/api/companies/profile", {
        method: "PATCH",
        body: JSON.stringify({
          companyName: String(form.get("companyName")),
          responsibleName: String(form.get("responsibleName")),
          document: String(form.get("document")),
          phone: String(form.get("phone")),
          email: String(form.get("email")),
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
          displayName: String(form.get("displayName")),
          avatarUrl: String(form.get("avatarUrl")),
          fullName: String(form.get("fullName")),
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
          onSubmit={handleSaveCompany}
          onUploadDocument={handleUploadDocument}
        />
      ) : null}

      {session.user.role === "FREELANCER" ? (
        <FreelancerProfileSection
          profile={freelancerProfile}
          onDeleteDocument={handleDeleteDocument}
          onOpenDocument={handleOpenDocument}
          onSaveProfile={handleSaveFreelancer}
          onUploadDocument={handleUploadDocument}
        />
      ) : null}

      {session.user.role === "ADMIN" ? (
        <EmptyState>
          Administradores gerenciam verificações, pagamentos e contestações
          pelas telas operacionais.
        </EmptyState>
      ) : null}
    </DashboardShell>
  );
}

function CompanyProfileForm({
  profile,
  onDeleteDocument,
  onOpenDocument,
  onSubmit,
  onUploadDocument,
}: Readonly<{
  profile: CompanyProfile;
  onDeleteDocument: (documentId: string) => void;
  onOpenDocument: (documentId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUploadDocument: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  return (
    <section className="dashboard-grid">
      <article className="panel">
        <div className="panel-header">
          <h2>Dados da empresa</h2>
          <Settings size={18} />
        </div>
        <form className="form compact" onSubmit={onSubmit}>
          <Field label="Empresa">
            <input
              name="companyName"
              defaultValue={profile.companyName}
              required
            />
          </Field>
          <Field label="Responsável">
            <input
              name="responsibleName"
              defaultValue={profile.responsibleName}
              required
            />
          </Field>
          <Field label="CNPJ">
            <input name="document" defaultValue={profile.document ?? ""} />
          </Field>
          <div className="form-grid">
            <Field label="Cidade">
              <input name="city" defaultValue={profile.city ?? ""} />
            </Field>
            <Field label="UF">
              <input
                name="state"
                defaultValue={profile.state ?? ""}
                maxLength={2}
              />
            </Field>
          </div>
          <Field label="Telefone">
            <input name="phone" defaultValue={profile.phone ?? ""} />
          </Field>
          <Field label="E-mail">
            <input
              name="email"
              type="email"
              defaultValue={profile.email}
              required
            />
          </Field>
          <button className="primary-button full" type="submit">
            Salvar empresa
          </button>
        </form>
      </article>
      <VerificationDocumentsPanel
        documents={profile.verificationDocuments ?? []}
        onDeleteDocument={onDeleteDocument}
        onOpenDocument={onOpenDocument}
        onUploadDocument={onUploadDocument}
      />
    </section>
  );
}

function FreelancerProfileSection({
  profile,
  onDeleteDocument,
  onOpenDocument,
  onSaveProfile,
  onUploadDocument,
}: Readonly<{
  profile: FreelancerProfile | null;
  onDeleteDocument: (documentId: string) => void;
  onOpenDocument: (documentId: string) => void;
  onSaveProfile: (event: FormEvent<HTMLFormElement>) => void;
  onUploadDocument: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  const [avatarSource, setAvatarSource] = useState("");
  const [avatarValue, setAvatarValue] = useState("");
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarOffsetX, setAvatarOffsetX] = useState(0);
  const [avatarOffsetY, setAvatarOffsetY] = useState(0);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [cpfValue, setCpfValue] = useState("");
  const [cepValue, setCepValue] = useState("");
  const [cepMessage, setCepMessage] = useState("");

  useEffect(() => {
    setAvatarValue(profile?.avatarUrl ?? "");
    setAvatarSource("");
    setAvatarZoom(1);
    setAvatarOffsetX(0);
    setAvatarOffsetY(0);
    setIsAvatarModalOpen(false);
    setCpfValue(formatCpf(profile?.cpf ?? ""));
    setCepValue(formatCep(profile?.postalCode ?? ""));
  }, [profile?.avatarUrl, profile?.cpf, profile?.postalCode]);

  async function handleAvatarFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setAvatarSource(dataUrl);
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

    const adjustedAvatar = await createAdjustedAvatar(
      avatarSource,
      avatarZoom,
      avatarOffsetX,
      avatarOffsetY,
    );
    setAvatarValue(adjustedAvatar);
    setAvatarSource(adjustedAvatar);
    setAvatarZoom(1);
    setAvatarOffsetX(0);
    setAvatarOffsetY(0);
    setIsAvatarModalOpen(false);
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
                onChange={(event) =>
                  setCpfValue(formatCpf(event.target.value))
                }
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
          <input name="avatarUrl" readOnly type="hidden" value={avatarValue} />
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
              <input name="city" defaultValue={profile?.city ?? ""} />
            </Field>
            <Field label="UF">
              <input
                name="state"
                defaultValue={profile?.state ?? ""}
                maxLength={2}
              />
            </Field>
          </div>
          <Field label="Transporte para eventos">
            <input
              name="transportation"
              defaultValue={profile?.transportation ?? ""}
              placeholder="Ex.: carro próprio, moto, app, transporte público"
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
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt="Prévia do avatar"
                      src={avatarSource}
                      style={{
                        transform: `translate(${avatarOffsetX}px, ${avatarOffsetY}px) scale(${avatarZoom})`,
                      }}
                    />
                  ) : (
                    <span>Sem foto</span>
                  )}
                </div>
                <div className="avatar-controls">
                  <Field label="Zoom">
                    <input
                      max={3}
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
                        max={100}
                        min={-100}
                        onChange={(event) =>
                          setAvatarOffsetX(Number(event.target.value))
                        }
                        type="range"
                        value={avatarOffsetX}
                      />
                    </Field>
                    <Field label="Vertical">
                      <input
                        max={100}
                        min={-100}
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
                  disabled={!avatarSource}
                  onClick={applyAvatarAdjustment}
                  type="button"
                >
                  Aplicar foto
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </article>

      <VerificationDocumentsPanel
        documents={profile?.verificationDocuments ?? []}
        onDeleteDocument={onDeleteDocument}
        onOpenDocument={onOpenDocument}
        onUploadDocument={onUploadDocument}
      />
    </section>
  );
}

function VerificationDocumentsPanel({
  documents,
  onDeleteDocument,
  onOpenDocument,
  onUploadDocument,
}: Readonly<{
  documents: VerificationDocument[];
  onDeleteDocument: (documentId: string) => void;
  onOpenDocument: (documentId: string) => void;
  onUploadDocument: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  return (
    <article className="panel">
      <div className="panel-header">
        <h2>Documentos</h2>
        <FileText size={18} />
      </div>
      <form className="form compact" onSubmit={onUploadDocument}>
        <Field label="Tipo">
          <select name="category" required defaultValue="document">
            <option value="document">Documento cadastral</option>
            <option value="identity">Identidade</option>
            <option value="address">Comprovante de endereço</option>
            <option value="portfolio">Portfólio ou imagem</option>
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
        <button className="secondary-button full" type="submit">
          Enviar documento
        </button>
      </form>
      <div className="list">
        {documents.length ? (
          documents.map((document) => (
            <div className="list-row" key={document.id}>
              <div>
                <strong>{document.originalName}</strong>
                <span>
                  {documentLabels[document.category] ?? document.category} -{" "}
                  {formatFileSize(document.sizeBytes)}
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

const documentLabels: Record<string, string> = {
  document: "Documento cadastral",
  identity: "Identidade",
  address: "Comprovante de endereço",
  portfolio: "Portfólio ou imagem",
};

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
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

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Imagem inválida.")));
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
  const size = 512;
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
