"use client";

export type UserRole = "ADMIN" | "COMPANY" | "FREELANCER";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const SESSION_KEY = "nexus.session";
let refreshSessionPromise: Promise<AuthSession | null> | null = null;

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as AuthSession) : null;
}

export function saveSession(session: AuthSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await requestWithSession(path, options);

  if (!response.ok) {
    const refreshedResponse = await retryAfterAccessTokenRefresh(
      path,
      options,
      response,
    );
    if (refreshedResponse) {
      return parseApiResponse<T>(refreshedResponse);
    }

    throw new Error(await readApiErrorMessage(response));
  }

  return parseApiResponse<T>(response);
}

async function requestWithSession(path: string, options: RequestInit = {}) {
  const session = getSession();
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: buildHeaders(options, session),
  });
}

function buildHeaders(options: RequestInit, session: AuthSession | null) {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (session?.accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  return headers;
}

async function retryAfterAccessTokenRefresh(
  path: string,
  options: RequestInit,
  response: Response,
) {
  if (response.status !== 401 || path === "/api/auth/refresh") {
    return null;
  }

  const message = await readApiErrorMessage(response);
  if (message !== "Invalid access token") {
    return null;
  }

  const refreshedSession = await refreshSession();
  if (!refreshedSession) {
    throw new Error("Sua sessão expirou. Entre novamente.");
  }

  return requestWithSession(path, options);
}

async function refreshSession() {
  if (!refreshSessionPromise) {
    refreshSessionPromise = refreshSessionOnce().finally(() => {
      refreshSessionPromise = null;
    });
  }

  return refreshSessionPromise;
}

async function refreshSessionOnce() {
  const session = getSession();

  if (!session?.refreshToken) {
    return null;
  }

  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });

  if (!response.ok) {
    clearSession();
    return null;
  }

  const nextSession = (await response.json()) as AuthSession;
  saveSession(nextSession);
  return nextSession;
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function readApiErrorMessage(response: Response) {
  let message = "Não foi possível completar a operação.";

  try {
    const body = await response.clone().json();
    const rawMessage = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message || message;
    message = translateApiMessage(rawMessage);
  } catch {
    // Keep the generic message when the API does not return JSON.
  }

  return message;
}

export async function publicApiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error("Não foi possível completar a operação.");
  }

  return response.json() as Promise<T>;
}

const apiMessageTranslations: Record<string, string> = {
  "End must be after start": "A data final precisa ser posterior ao início.",
  "Invalid credentials": "E-mail ou senha inválidos.",
  "Invalid access token": "Sua sessão expirou. Entre novamente.",
  "Email already registered": "Este e-mail já está cadastrado.",
  "Admin users cannot self-register":
    "Administradores devem ser criados pela operação da plataforma.",
  "Admin access is required":
    "Seu nível administrativo não permite executar esta ação.",
  "Only admin users can receive admin access":
    "Somente usuários administradores podem receber nível administrativo.",
  "You cannot deactivate your own admin user":
    "Você não pode desativar o seu próprio usuário administrador.",
  "At least one active owner admin is required":
    "É necessário manter ao menos um administrador owner ativo.",
  "Invalid refresh token": "Sua sessão expirou. Entre novamente.",
  "Invalid or expired reset token": "Token inválido ou expirado.",
  "Company profile is required": "Complete o perfil da empresa para continuar.",
  "Company access is required":
    "Seu usuário não tem permissão para acessar esta empresa.",
  "Company must be verified":
    "A empresa precisa estar verificada para continuar.",
  "Freelancer profile is required":
    "Complete o perfil profissional para continuar.",
  "Freelancer must be verified":
    "O profissional precisa estar verificado para continuar.",
  "Contract participants must be verified":
    "Empresa e profissional precisam estar verificados para continuar.",
  "Company profile not found": "Perfil da empresa não encontrado.",
  "Freelancer profile not found": "Perfil profissional não encontrado.",
  "Profile not found": "Perfil não encontrado.",
  "Event not found": "Evento não encontrado.",
  "Event has contracts":
    "Este evento já possui contrato e não pode ser excluído.",
  "Freelancer not found": "Profissional não encontrado.",
  "Contract not found": "Contrato não encontrado.",
  "Payment not found": "Pagamento não encontrado.",
  "Wallet not found": "Carteira não encontrada.",
  "Notification not found": "Notificação não encontrada.",
  "Availability not found": "Indisponibilidade não encontrada.",
  "Document not found": "Documento não encontrado.",
  "Document file not found": "Arquivo do documento não encontrado.",
  "Invitation not found": "Convite não encontrado.",
  "Invitation is not pending": "Este convite não está mais pendente.",
  "Invitation expired": "Este convite expirou.",
  "Invitation requirement is required":
    "Selecione a função do evento para enviar o convite.",
  "No amount proposal to accept": "Não há proposta de valor para aceitar.",
  "Invitation negotiation is unavailable":
    "A negociação deste convite não está disponível.",
  "Invitation expiration must be in the future":
    "A expiração do convite precisa estar no futuro.",
  "Event is not open for invitations":
    "Este evento não está aberto para convites.",
  "Freelancer already has a contract in this time range":
    "O profissional já tem um contrato nesse período.",
  "Freelancer is unavailable in this time range":
    "O profissional está indisponível nesse período.",
  "Freelancer already has an active invitation for this event":
    "O profissional já tem um convite ativo para este evento.",
  "Event is not open for applications":
    "Este evento não está aberto para candidaturas.",
  "Event has no open spots": "Este evento não tem vagas abertas.",
  "Freelancer does not match event requirements":
    "Seu perfil não atende aos requisitos deste evento.",
  "Application already exists": "Você já se candidatou para este evento.",
  "Application is not pending": "Esta candidatura não está mais pendente.",
  "Application not found": "Candidatura não encontrada.",
  "Chat thread not found": "Conversa não encontrada.",
  "Chat is available only for participants":
    "O chat está disponível apenas para empresas e profissionais.",
  "Contract already has a payment": "Este contrato já possui pagamento.",
  "Payment already released": "Este pagamento já foi liberado.",
  "Payment must be paid before release":
    "O pagamento precisa estar confirmado antes da liberação.",
  "Payment must be paid before confirmation":
    "O pagamento precisa estar confirmado antes da contratação.",
  "Freelancer wallet not found": "Carteira do profissional não encontrada.",
  "Contract status update is not allowed":
    "Você não pode alterar o contrato para esse status.",
  "Contract status transition is invalid":
    "Essa mudança de status do contrato não é permitida.",
  "No-show deadline has expired": "O prazo para marcar falta já expirou.",
  "Contract must be completed or paid before review":
    "O contrato precisa estar concluído ou pago antes da avaliação.",
  "Review is not allowed for this contract":
    "Você não pode avaliar este contrato.",
  "Contract was already reviewed": "Este contrato já foi avaliado.",
  "Only companies and freelancers can upload documents":
    "Somente empresas e profissionais podem enviar documentos.",
  "Unsupported file type":
    "Tipo de arquivo não aceito. Use PDF, JPG, PNG ou WebP.",
  "File must be up to 5 MB": "O arquivo deve ter no máximo 5 MB.",
  "Invalid file data": "Arquivo inválido.",
  "You cannot access this document": "Você não pode acessar este documento.",
  "Owner role cannot be invited":
    "O papel de dono só pertence ao primeiro administrador da empresa.",
  "User already belongs to a company":
    "Este usuário já está vinculado a uma empresa.",
  "User already belongs to another account type":
    "Este e-mail já está vinculado a outro tipo de conta.",
  "Invalid or expired company invitation":
    "Convite de empresa inválido ou expirado.",
};

function translateApiMessage(message: string) {
  if (apiMessageTranslations[message]) {
    return apiMessageTranslations[message];
  }

  return message
    .split(", ")
    .map(
      (item) =>
        apiMessageTranslations[item] ?? translateValidationMessage(item),
    )
    .join(", ");
}

function translateValidationMessage(message: string) {
  return message
    .replace("must be a string", "deve ser um texto")
    .replace("must be an integer number", "deve ser um número inteiro")
    .replace("must not be less than", "não pode ser menor que")
    .replace("must not be greater than", "não pode ser maior que")
    .replace("must be a valid ISO 8601 date string", "deve ser uma data válida")
    .replace("should not be empty", "não pode ficar vazio")
    .replace("must be an email", "deve ser um e-mail válido")
    .replace("must be longer than or equal to", "deve ter no mínimo")
    .replace("characters", "caracteres");
}

export async function apiFileRequest(path: string): Promise<Blob> {
  let response = await requestWithSession(path);

  if (!response.ok) {
    const refreshedResponse = await retryAfterAccessTokenRefresh(
      path,
      {},
      response,
    );
    if (refreshedResponse) {
      response = refreshedResponse;
    }
  }

  if (!response.ok) {
    throw new Error("Não foi possível abrir o documento.");
  }

  return response.blob();
}

export function formatCurrency(cents?: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}
