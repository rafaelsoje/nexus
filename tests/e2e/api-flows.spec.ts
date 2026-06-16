import { expect, test, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const password = process.env.SEED_DEMO_PASSWORD ?? "Nexo@12345";
const prisma = new PrismaClient();
const tinyPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

type Session = {
  accessToken: string;
  user: { id: string; role: "ADMIN" | "COMPANY" | "FREELANCER" };
};

type Skill = { id: string; name: string };
type FreelancerProfile = {
  id: string;
  skills?: Array<{ skill: Skill; dailyRateCents?: number }>;
};
type CompanyProfile = {
  id: string;
  email?: string;
  companyName?: string;
  document?: string | null;
  responsibleName?: string;
  phone?: string | null;
  wallet?: unknown;
  verificationDocuments?: Array<{ id: string; originalName: string }>;
};
type EventItem = {
  id: string;
  name: string;
  requirements?: Array<{ id: string; skillId: string }>;
};
type InvitationItem = {
  id: string;
  event?: EventItem;
  counterAmountCents?: number;
  agreedAmountCents?: number;
};
type ApplicationItem = {
  id: string;
  status: string;
  event?: EventItem;
  contract?: ContractItem;
};
type ChatThreadItem = {
  id: string;
  event?: EventItem;
  messages: Array<{ id: string; body: string }>;
};
type ContractItem = { id: string; status: string; amountCents?: number };
type PaymentItem = {
  id: string;
  status: string;
  gatewayPaymentId?: string;
  checkoutUrl?: string;
  splits?: Array<{
    id: string;
    freelancerNetAmountCents: number;
    releaseStatus: string;
  }>;
};
type ReviewItem = { id: string; overallRating: number };
type DisputeItem = { id: string; status: string };
type WalletItem = { balanceCents: number };
type PayoutItem = { id: string; amountCents: number; status: string };
type GatewayAccountItem = {
  id: string;
  documentNumber?: string | null;
  account?: string | null;
  pixKey?: string | null;
  rawGatewayResponse?: unknown;
  status: string;
};
type CompanyTeamItem = {
  members: Array<{
    id: string;
    role: string;
    isActive: boolean;
    user: { email: string };
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    token?: string;
  }>;
};
type AdminUserItem = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
};

const sensitivePublicKeys = [
  "account",
  "accountDigit",
  "addressComplement",
  "addressNumber",
  "addressStreet",
  "agency",
  "bankCode",
  "bankData",
  "cpf",
  "document",
  "documentNumber",
  "email",
  "gatewayAccounts",
  "identityDocument",
  "neighborhood",
  "phone",
  "pixKey",
  "postalCode",
  "rawGatewayResponse",
  "responsibleName",
  "verificationDocuments",
  "wallet",
];

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.describe.serial("NEXO e2e API flows", () => {
  test.beforeAll(async () => {
    await cleanupE2eArtifacts();
  });

  test("company invites freelancer, pays, completes and reviews contract", async ({
    request,
  }) => {
    const company = await login(request, "empresa@nexo.local");
    const freelancer = await login(request, "freelancer@nexo.local");
    const { contractId } = await createAcceptedContract(request, {
      company,
      freelancer,
      offsetDays: 520,
      name: "E2E Contratacao Completa",
    });

    await post(request, company, "/api/wallet/top-up", {
      amountCents: 200000,
      description: "Carga e2e contratacao completa",
    });

    const payment = await post<PaymentItem>(
      request,
      company,
      `/api/payments/contracts/${contractId}/pay`,
    );
    expect(payment.status).toBe("PAID");

    await moveContractToPast(contractId);

    const completed = await patch<ContractItem>(
      request,
      company,
      `/api/contracts/${contractId}/status`,
      { status: "COMPLETED" },
    );
    expect(completed.status).toBe("COMPLETED");

    const review = await post<ReviewItem>(request, company, "/api/reviews", {
      contractId,
      punctuality: 5,
      technicalQuality: 5,
      professionalPosture: 5,
      communication: 5,
      overallRating: 5,
      comment: "Fluxo e2e concluido com sucesso.",
    });
    expect(review.overallRating).toBe(5);

    const reviews = await get<ReviewItem[]>(request, company, "/api/reviews");
    expect(reviews.some((item) => item.id === review.id)).toBeTruthy();
  });

  test("freelancer applies to open opportunity and company approves", async ({
    request,
  }) => {
    const company = await login(request, "empresa@nexo.local");
    const freelancer = await login(request, "freelancer@nexo.local");
    const skills = await get<Skill[]>(request, company, "/api/skills");
    const skill = skills[0];

    await post(request, freelancer, "/api/freelancers/skills", {
      skills: [{ skillId: skill.id, dailyRateCents: 42000 }],
    });

    const window = futureWindow(1200);
    const event = await post<EventItem>(request, company, "/api/events", {
      name: `E2E Oportunidade Aberta ${Date.now()}`,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      location: "Centro E2E",
      city: "Aracaju",
      state: "SE",
      eventType: "Teste automatizado",
      desiredProfessionals: 1,
      requirements: [
        {
          skillId: skill.id,
          quantity: 1,
          dailyRateCents: 42000,
        },
      ],
    });

    const opportunities = await get<EventItem[]>(
      request,
      freelancer,
      "/api/applications/opportunities",
    );
    expect(opportunities.some((item) => item.id === event.id)).toBeTruthy();

    const application = await post<ApplicationItem>(
      request,
      freelancer,
      "/api/applications",
      {
        eventId: event.id,
        message: "Candidatura gerada pelo e2e.",
        proposedAmountCents: 43000,
      },
    );
    expect(application.status).toBe("PENDING");

    const received = await get<ApplicationItem[]>(
      request,
      company,
      "/api/applications/received",
    );
    expect(received.some((item) => item.id === application.id)).toBeTruthy();

    const accepted = await post<{ contract: ContractItem }>(
      request,
      company,
      `/api/applications/${application.id}/accept`,
    );
    expect(accepted.contract.status).toBe("PENDING_PAYMENT");

    const threads = await get<ChatThreadItem[]>(
      request,
      freelancer,
      "/api/chat/threads",
    );
    const thread = threads.find((item) => item.event?.id === event.id);
    expect(thread).toBeTruthy();

    const message = await post<{ body: string }>(
      request,
      freelancer,
      `/api/chat/threads/${thread?.id}/messages`,
      { body: "Mensagem de negociacao pelo e2e." },
    );
    expect(message.body).toBe("Mensagem de negociacao pelo e2e.");

    const companyThreads = await get<ChatThreadItem[]>(
      request,
      company,
      "/api/chat/threads",
    );
    expect(
      companyThreads
        .find((item) => item.id === thread?.id)
        ?.messages.some((item) => item.body === message.body),
    ).toBeTruthy();
  });

  test("opportunities respect freelancer conflicts and availability blocks", async ({
    request,
  }) => {
    const company = await login(request, "empresa@nexo.local");
    const freelancer = await login(request, "freelancer@nexo.local");
    const freelancerProfile = await get<FreelancerProfile>(
      request,
      freelancer,
      "/api/freelancers/profile",
    );
    const skills = await get<Skill[]>(request, company, "/api/skills");
    const skillId = freelancerProfile.skills?.[0]?.skill.id ?? skills[0].id;

    await post(request, freelancer, "/api/freelancers/skills", {
      skills: [{ skillId, dailyRateCents: 42000 }],
    });

    await createAcceptedContract(request, {
      company,
      freelancer,
      offsetDays: 1210,
      name: "E2E Conflito Agenda",
    });

    const conflictWindow = futureWindow(1210);
    const contractConflictEvent = await post<EventItem>(
      request,
      company,
      "/api/events",
      {
        name: `E2E Oportunidade Conflito Contrato ${Date.now()}`,
        startsAt: conflictWindow.startsAt,
        endsAt: conflictWindow.endsAt,
        location: "Centro E2E",
        city: "Aracaju",
        state: "SE",
        eventType: "Teste automatizado",
        desiredProfessionals: 1,
        requirements: [{ skillId, quantity: 1, dailyRateCents: 42000 }],
      },
    );

    const blockedWindow = futureWindow(1220);
    const availabilityConflictEvent = await post<EventItem>(
      request,
      company,
      "/api/events",
      {
        name: `E2E Oportunidade Conflito Disponibilidade ${Date.now()}`,
        startsAt: blockedWindow.startsAt,
        endsAt: blockedWindow.endsAt,
        location: "Centro E2E",
        city: "Aracaju",
        state: "SE",
        eventType: "Teste automatizado",
        desiredProfessionals: 1,
        requirements: [{ skillId, quantity: 1, dailyRateCents: 42000 }],
      },
    );

    await post(request, freelancer, "/api/availability", {
      startsAt: blockedWindow.startsAt,
      endsAt: blockedWindow.endsAt,
      isAvailable: false,
      reason: "Bloqueio e2e",
    });

    const opportunities = await get<EventItem[]>(
      request,
      freelancer,
      `/api/applications/opportunities?skillId=${skillId}&minDailyRateCents=40000&maxDailyRateCents=43000`,
    );

    expect(
      opportunities.some((item) => item.id === contractConflictEvent.id),
    ).toBeFalsy();
    expect(
      opportunities.some((item) => item.id === availabilityConflictEvent.id),
    ).toBeFalsy();
  });

  test("company and freelancer can cancel pre-contract hiring steps", async ({
    request,
  }) => {
    const company = await login(request, "empresa@nexo.local");
    const freelancer = await login(request, "freelancer@nexo.local");
    const skills = await get<Skill[]>(request, company, "/api/skills");
    const freelancerProfile = await get<FreelancerProfile>(
      request,
      freelancer,
      "/api/freelancers/profile",
    );
    const skillId = freelancerProfile.skills?.[0]?.skill.id ?? skills[0].id;

    await post(request, freelancer, "/api/freelancers/skills", {
      skills: [{ skillId, dailyRateCents: 41000 }],
    });

    const window = futureWindow(1300);
    const event = await post<EventItem>(request, company, "/api/events", {
      name: `E2E Cancelamentos Fluxo ${Date.now()}`,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      location: "Centro E2E",
      city: "Aracaju",
      state: "SE",
      eventType: "Teste automatizado",
      desiredProfessionals: 1,
      requirements: [{ skillId, quantity: 1, dailyRateCents: 41000 }],
    });

    const invitation = await post<InvitationItem>(
      request,
      company,
      "/api/invitations",
      {
        eventId: event.id,
        freelancerId: freelancerProfile.id,
        eventRequirementId: event.requirements?.[0]?.id,
        expiresAt: futureWindow(1299).startsAt,
        message: "Convite que sera cancelado.",
      },
    );
    const cancelledInvitation = await post<InvitationItem>(
      request,
      company,
      `/api/invitations/${invitation.id}/cancel`,
    );
    expect(cancelledInvitation.status).toBe("CANCELLED");

    const application = await post<ApplicationItem>(
      request,
      freelancer,
      "/api/applications",
      {
        eventId: event.id,
        eventRequirementId: event.requirements?.[0]?.id,
        message: "Candidatura inicial.",
        proposedAmountCents: 42000,
      },
    );
    const updatedApplication = await patch<ApplicationItem>(
      request,
      freelancer,
      `/api/applications/${application.id}`,
      {
        message: "Candidatura atualizada.",
        proposedAmountCents: 43000,
      },
    );
    expect(updatedApplication.proposedAmountCents).toBe(43000);

    const cancelledApplication = await post<ApplicationItem>(
      request,
      freelancer,
      `/api/applications/${application.id}/cancel`,
    );
    expect(cancelledApplication.status).toBe("CANCELLED");

    const cancelledEvent = await post<EventItem>(
      request,
      company,
      `/api/events/${event.id}/cancel`,
    );
    expect(cancelledEvent.status).toBe("CANCELLED");
  });

  test("company owner manages team invitations and members", async ({
    request,
  }) => {
    const company = await login(request, "empresa@nexo.local");
    const email = `e2e-team-${Date.now()}@nexo.local`;

    const invitation = await post<{ id: string; token: string; status: string }>(
      request,
      company,
      "/api/companies/team/invitations",
      { email, role: "OPERATOR" },
    );
    expect(invitation.status).toBe("PENDING");

    const cancelledInvitation = await post<{ status: string }>(
      request,
      company,
      `/api/companies/team/invitations/${invitation.id}/cancel`,
    );
    expect(cancelledInvitation.status).toBe("CANCELLED");

    const acceptedInvitation = await post<{ token: string }>(
      request,
      company,
      "/api/companies/team/invitations",
      { email, role: "OPERATOR" },
    );
    await post(request, null, "/api/companies/team/invitations/accept", {
      token: acceptedInvitation.token,
      name: "E2E Membro Empresa",
      phone: "79999999999",
      password,
    });

    const team = await get<CompanyTeamItem>(request, company, "/api/companies/team");
    const member = team.members.find((item) => item.user.email === email);
    expect(member).toBeTruthy();

    const updatedMember = await patch<{ role: string }>(
      request,
      company,
      `/api/companies/team/members/${member?.id}/role`,
      { role: "VIEWER" },
    );
    expect(updatedMember.role).toBe("VIEWER");

    const inactiveMember = await post<{ isActive: boolean }>(
      request,
      company,
      `/api/companies/team/members/${member?.id}/deactivate`,
    );
    expect(inactiveMember.isActive).toBeFalsy();
  });

  test("profile document upload appears in admin verification queue", async ({
    request,
  }) => {
    const company = await login(request, "empresa@nexo.local");
    const admin = await login(request, "admin@nexo.local");

    const document = await post<{ id: string; originalName: string }>(
      request,
      company,
      "/api/documents/verification",
      {
        category: "document",
        originalName: "e2e-documento.png",
        mimeType: "image/png",
        data: `data:image/png;base64,${tinyPng}`,
      },
    );

    const profile = await get<CompanyProfile>(
      request,
      company,
      "/api/companies/profile",
    );
    expect(
      profile.verificationDocuments?.some((item) => item.id === document.id),
    ).toBeTruthy();

    const companies = await get<CompanyProfile[]>(
      request,
      admin,
      "/api/admin/companies",
    );
    expect(
      companies.some((item) =>
        item.verificationDocuments?.some((doc) => doc.id === document.id),
      ),
    ).toBeTruthy();

    const file = await request.get(`/api/documents/${document.id}/file`, {
      headers: authHeaders(admin),
    });
    expect(file.ok()).toBeTruthy();
    expect(file.headers()["content-type"]).toContain("image/png");

    const updated = await patch<CompanyProfile>(
      request,
      admin,
      `/api/admin/companies/${profile.id}/verification`,
      { status: "VERIFIED" },
    );
    expect((updated as CompanyProfile & { verificationStatus: string }).verificationStatus).toBe(
      "VERIFIED",
    );
  });

  test("admin cannot verify company profile before required fields are complete", async ({
    request,
  }) => {
    const admin = await login(request, "admin@nexo.local");
    const email = `e2e-incomplete-company-${Date.now()}@nexo.local`;
    const company = await post<Session>(request, null, "/api/auth/register", {
      name: "Empresa Incompleta E2E",
      email,
      phone: "79999999999",
      password,
      role: "COMPANY",
    });

    const profile = await post<CompanyProfile>(
      request,
      company,
      "/api/companies/profile",
      {
        companyName: "Empresa Incompleta E2E",
        responsibleName: "Responsavel Incompleto",
        email,
      },
    );

    await post(request, company, "/api/documents/verification", {
      category: "document",
      originalName: "e2e-incomplete-company-documento.png",
      mimeType: "image/png",
      data: `data:image/png;base64,${tinyPng}`,
    });

    await expectStatus(
      request,
      admin,
      "PATCH",
      `/api/admin/companies/${profile.id}/verification`,
      [400],
      { status: "VERIFIED" },
    );
  });

  test("company can anonymize its own account and remove private data", async ({
    request,
  }) => {
    const email = `e2e-lgpd-${Date.now()}@nexo.local`;
    const session = await post<Session>(request, null, "/api/auth/register", {
      name: "Empresa LGPD E2E",
      email,
      phone: "79999999999",
      password,
      role: "COMPANY",
    });
    const admin = await login(request, "admin@nexo.local");

    const profile = await post<CompanyProfile>(
      request,
      session,
      "/api/companies/profile",
      {
        companyName: "Empresa LGPD E2E",
        responsibleName: "Responsavel LGPD",
        document: "12345678000199",
        phone: "79999999999",
        email,
        city: "Aracaju",
        state: "SE",
      },
    );
    expect(profile.email).toBe(email);

    const document = await post<{ id: string }>(
      request,
      session,
      "/api/documents/verification",
      {
        category: "document",
        originalName: "e2e-lgpd-documento.png",
        mimeType: "image/png",
        data: `data:image/png;base64,${tinyPng}`,
      },
    );
    expect(document.id).toBeTruthy();

    const result = await post<{ ok: boolean }>(
      request,
      session,
      "/api/users/me/anonymize",
      { password },
    );
    expect(result.ok).toBeTruthy();

    const loginResponse = await request.post("/api/auth/login", {
      data: { email, password },
    });
    expect(loginResponse.status()).toBe(401);

    await expectStatus(request, session, "GET", "/api/users/me", [401]);

    const users = await get<AdminUserItem[]>(request, admin, "/api/admin/users");
    const anonymizedUser = users.find((item) => item.id === session.user.id);
    expect(anonymizedUser?.isActive).toBeFalsy();
    expect(anonymizedUser?.email).toContain("deleted-");
    expect(anonymizedUser?.name).toContain("Conta excluída");

    const anonymizedProfile = await prisma.companyProfile.findUnique({
      where: { id: profile.id },
      select: {
        companyName: true,
        document: true,
        responsibleName: true,
        phone: true,
        email: true,
        city: true,
      },
    });
    expect(anonymizedProfile?.companyName).toBe("Empresa excluída");
    expect(anonymizedProfile?.document).toBeNull();
    expect(anonymizedProfile?.phone).toBeNull();
    expect(anonymizedProfile?.city).toBeNull();

    const remainingDocument = await prisma.verificationDocument.findUnique({
      where: { id: document.id },
    });
    expect(remainingDocument).toBeNull();
  });

  test("participant opens dispute and admin resolves it", async ({ request }) => {
    const company = await login(request, "empresa@nexo.local");
    const freelancer = await login(request, "freelancer@nexo.local");
    const admin = await login(request, "admin@nexo.local");
    const { contractId } = await createAcceptedContract(request, {
      company,
      freelancer,
      offsetDays: 540,
      name: "E2E Disputa",
    });

    const dispute = await post<DisputeItem>(request, company, "/api/disputes", {
      contractId,
      reason: "Divergencia operacional",
      details: "Teste e2e de abertura de disputa.",
    });
    expect(dispute.status).toBe("OPEN");

    const adminDisputes = await get<DisputeItem[]>(
      request,
      admin,
      "/api/admin/disputes",
    );
    expect(adminDisputes.some((item) => item.id === dispute.id)).toBeTruthy();

    const resolved = await patch<DisputeItem>(
      request,
      admin,
      `/api/admin/disputes/${dispute.id}/status`,
      { status: "RESOLVED" },
    );
    expect(resolved.status).toBe("RESOLVED");
  });

  test("public profiles do not expose private company or freelancer data", async ({
    request,
  }) => {
    const company = await login(request, "empresa@nexo.local");
    const freelancer = await login(request, "freelancer@nexo.local");

    const privateCompany = await get<CompanyProfile>(
      request,
      company,
      "/api/companies/profile",
    );
    expect(privateCompany.email).toBeTruthy();
    expect(privateCompany.wallet).toBeTruthy();

    const publicCompany = await get<Record<string, unknown>>(
      request,
      freelancer,
      `/api/companies/${privateCompany.id}/public`,
    );
    expect(publicCompany.id).toBe(privateCompany.id);
    assertNoSensitivePublicKeys(publicCompany);

    const privateFreelancer = await get<Record<string, unknown>>(
      request,
      freelancer,
      "/api/freelancers/profile",
    );
    expect(privateFreelancer.wallet).toBeTruthy();
    expect(privateFreelancer.gatewayAccounts).toBeTruthy();
    expect((privateFreelancer.user as { email?: string })?.email).toBeTruthy();

    const publicFreelancers = await get<Array<Record<string, unknown>>>(
      request,
      company,
      "/api/freelancers",
    );
    expect(publicFreelancers.length).toBeGreaterThan(0);
    for (const item of publicFreelancers) {
      assertNoSensitivePublicKeys(item);
    }

    const publicFreelancer = await get<Record<string, unknown>>(
      request,
      company,
      `/api/freelancers/${privateFreelancer.id}/public`,
    );
    expect(publicFreelancer.id).toBe(privateFreelancer.id);
    assertNoSensitivePublicKeys(publicFreelancer);
  });

  test("marketplace split payment releases to wallet and payout is paid", async ({
    request,
  }) => {
    const company = await login(request, "empresa@nexo.local");
    const freelancer = await login(request, "freelancer@nexo.local");
    const admin = await login(request, "admin@nexo.local");
    const { contractId, eventId } = await createAcceptedContract(request, {
      company,
      freelancer,
      offsetDays: 1560,
      name: "E2E Marketplace Split",
    });

    await createFreelancerGatewayAccount(request, freelancer);
    await post(request, company, "/api/wallet/top-up", {
      amountCents: 200000,
      description: "Carga e2e marketplace",
    });

    const payment = await post<PaymentItem>(
      request,
      company,
      `/api/payments/events/${eventId}/pay`,
    );
    expect(payment.status).toBe("PAID");
    expect(payment.splits?.length).toBe(1);

    await moveContractToPast(contractId);

    const completed = await patch<ContractItem>(
      request,
      company,
      `/api/contracts/${contractId}/status`,
      { status: "COMPLETED" },
    );
    expect(completed.status).toBe("COMPLETED");

    const walletBefore = await get<WalletItem>(request, freelancer, "/api/wallet");
    const release = await post<{ released: number; splits: PaymentItem["splits"] }>(
      request,
      admin,
      `/api/payments/${payment.id}/release`,
    );
    expect(release.released).toBe(1);

    const releasedAmount =
      release.splits?.[0]?.freelancerNetAmountCents ??
      payment.splits?.[0]?.freelancerNetAmountCents ??
      0;
    expect(releasedAmount).toBeGreaterThan(0);

    const walletAfter = await get<WalletItem>(request, freelancer, "/api/wallet");
    expect(walletAfter.balanceCents).toBeGreaterThanOrEqual(
      walletBefore.balanceCents + releasedAmount,
    );

    const payout = await post<PayoutItem>(request, freelancer, "/api/wallet/payouts", {
      amountCents: releasedAmount,
      description: "Saque e2e marketplace",
    });
    expect(payout.status).toBe("SCHEDULED");

    const paidPayout = await patch<PayoutItem>(
      request,
      admin,
      `/api/admin/payouts/${payout.id}/status`,
      { status: "PAID" },
    );
    expect(paidPayout.status).toBe("PAID");

    const audit = await get<Array<{ action: string }>>(
      request,
      admin,
      "/api/admin/audit-logs?action=PAYOUT",
    );
    expect(audit.some((item) => item.action === "PAYOUT_STATUS_UPDATED")).toBeTruthy();
  });

  test("admin applies financial dispute refund for blocked split", async ({
    request,
  }) => {
    const company = await login(request, "empresa@nexo.local");
    const freelancer = await login(request, "freelancer@nexo.local");
    const admin = await login(request, "admin@nexo.local");
    const { contractId, eventId } = await createAcceptedContract(request, {
      company,
      freelancer,
      offsetDays: 1580,
      name: "E2E Disputa Financeira",
    });

    await createFreelancerGatewayAccount(request, freelancer);
    await post(request, company, "/api/wallet/top-up", {
      amountCents: 200000,
      description: "Carga e2e disputa financeira",
    });

    const payment = await post<PaymentItem>(
      request,
      company,
      `/api/payments/events/${eventId}/pay`,
    );
    expect(payment.status).toBe("PAID");

    const dispute = await post<DisputeItem>(request, company, "/api/disputes", {
      contractId,
      reason: "Contestacao financeira e2e",
      details: "Split deve ser estornado para a empresa.",
    });
    expect(dispute.status).toBe("OPEN");

    const resolution = await post<{
      dispute: DisputeItem;
      splits: Array<{ releaseStatus: string }>;
    }>(request, admin, `/api/admin/disputes/${dispute.id}/financial-resolution`, {
      resolution: "REFUND_COMPANY",
    });

    expect(resolution.dispute.status).toBe("RESOLVED");
    expect(resolution.splits.every((split) => split.releaseStatus === "REFUNDED"))
      .toBeTruthy();
  });

  test("financial data is isolated by role and owner", async ({ request }) => {
    const company = await login(request, "empresa@nexo.local");
    const otherCompany = await login(request, "aurora@nexo.local");
    const freelancer = await login(request, "freelancer@nexo.local");
    const otherFreelancer = await login(request, "audio@nexo.local");
    const admin = await login(request, "admin@nexo.local");
    const { eventId } = await createAcceptedContract(request, {
      company,
      freelancer,
      offsetDays: 1700,
      name: "E2E Isolamento Financeiro",
    });

    await createFreelancerGatewayAccount(request, freelancer);
    await post(request, company, "/api/wallet/top-up", {
      amountCents: 200000,
      description: "Carga e2e isolamento financeiro",
    });

    const payment = await post<PaymentItem>(
      request,
      company,
      `/api/payments/events/${eventId}/pay`,
    );
    expect(payment.status).toBe("PAID");

    const companyPayments = await get<PaymentItem[]>(
      request,
      company,
      "/api/payments",
    );
    expect(companyPayments.some((item) => item.id === payment.id)).toBeTruthy();

    const otherCompanyPayments = await get<PaymentItem[]>(
      request,
      otherCompany,
      "/api/payments",
    );
    expect(otherCompanyPayments.some((item) => item.id === payment.id)).toBeFalsy();

    const freelancerPayments = await get<PaymentItem[]>(
      request,
      freelancer,
      "/api/payments",
    );
    expect(freelancerPayments.some((item) => item.id === payment.id)).toBeTruthy();

    const otherFreelancerPayments = await get<PaymentItem[]>(
      request,
      otherFreelancer,
      "/api/payments",
    );
    expect(
      otherFreelancerPayments.some((item) => item.id === payment.id),
    ).toBeFalsy();

    const gatewayAccount = await get<GatewayAccountItem>(
      request,
      freelancer,
      "/api/gateway-accounts/freelancer/me",
    );
    expect(gatewayAccount.rawGatewayResponse).toBeUndefined();
    expect(gatewayAccount.documentNumber).toContain("***");
    expect(gatewayAccount.account).toContain("*");
    expect(gatewayAccount.pixKey).toContain("***");

    const adminAccounts = await get<GatewayAccountItem[]>(
      request,
      admin,
      "/api/admin/gateway-accounts",
    );
    expect(adminAccounts.some((item) => item.id === gatewayAccount.id)).toBeTruthy();
  });

  test("events contracts and chat are isolated to hiring participants", async ({
    request,
  }) => {
    const company = await login(request, "empresa@nexo.local");
    const otherCompany = await login(request, "aurora@nexo.local");
    const freelancer = await login(request, "freelancer@nexo.local");
    const otherFreelancer = await login(request, "audio@nexo.local");
    const { contractId, eventId } = await createAcceptedContract(request, {
      company,
      freelancer,
      offsetDays: 1710,
      name: "E2E Isolamento Operacional",
    });

    const ownEvent = await get<EventItem>(request, company, `/api/events/${eventId}`);
    expect(ownEvent.id).toBe(eventId);

    const otherCompanyEvents = await get<EventItem[]>(
      request,
      otherCompany,
      "/api/events",
    );
    expect(otherCompanyEvents.some((item) => item.id === eventId)).toBeFalsy();

    await expectStatus(request, otherCompany, "GET", `/api/events/${eventId}`, [
      404,
    ]);
    await expectStatus(
      request,
      otherCompany,
      "PATCH",
      `/api/events/${eventId}`,
      [404],
      { name: "Tentativa indevida" },
    );
    await expectStatus(
      request,
      otherCompany,
      "POST",
      `/api/events/${eventId}/cancel`,
      [404],
    );

    const companyContracts = await get<ContractItem[]>(
      request,
      company,
      "/api/contracts",
    );
    expect(companyContracts.some((item) => item.id === contractId)).toBeTruthy();

    const otherCompanyContracts = await get<ContractItem[]>(
      request,
      otherCompany,
      "/api/contracts",
    );
    expect(
      otherCompanyContracts.some((item) => item.id === contractId),
    ).toBeFalsy();

    const otherFreelancerContracts = await get<ContractItem[]>(
      request,
      otherFreelancer,
      "/api/contracts",
    );
    expect(
      otherFreelancerContracts.some((item) => item.id === contractId),
    ).toBeFalsy();

    await expectStatus(
      request,
      otherCompany,
      "PATCH",
      `/api/contracts/${contractId}/status`,
      [404],
      { status: "COMPLETED" },
    );
    await expectStatus(
      request,
      otherFreelancer,
      "PATCH",
      `/api/contracts/${contractId}/status`,
      [404],
      { status: "COMPLETED" },
    );

    const companyThreads = await get<ChatThreadItem[]>(
      request,
      company,
      "/api/chat/threads",
    );
    const thread = companyThreads.find((item) => item.event?.id === eventId);
    expect(thread).toBeTruthy();

    const otherCompanyThreads = await get<ChatThreadItem[]>(
      request,
      otherCompany,
      "/api/chat/threads",
    );
    expect(otherCompanyThreads.some((item) => item.id === thread?.id)).toBeFalsy();

    const otherFreelancerThreads = await get<ChatThreadItem[]>(
      request,
      otherFreelancer,
      "/api/chat/threads",
    );
    expect(
      otherFreelancerThreads.some((item) => item.id === thread?.id),
    ).toBeFalsy();

    await expectStatus(
      request,
      otherCompany,
      "POST",
      `/api/chat/threads/${thread?.id}/messages`,
      [404],
      { body: "Mensagem indevida" },
    );
    await expectStatus(
      request,
      otherFreelancer,
      "POST",
      `/api/chat/threads/${thread?.id}/messages`,
      [404],
      { body: "Mensagem indevida" },
    );
  });

  test("common users cannot access admin financial endpoints", async ({
    request,
  }) => {
    const company = await login(request, "empresa@nexo.local");
    const freelancer = await login(request, "freelancer@nexo.local");

    await expectStatus(request, company, "GET", "/api/admin/gateway-accounts", [
      403,
    ]);
    await expectStatus(request, freelancer, "GET", "/api/admin/gateway-accounts", [
      403,
    ]);
    await expectStatus(request, company, "GET", "/api/admin/payments", [403]);
    await expectStatus(request, freelancer, "GET", "/api/admin/payments", [403]);
  });

  test("marketplace payment is blocked when freelancer has no active gateway account", async ({
    request,
  }) => {
    const company = await login(request, "empresa@nexo.local");
    const freelancer = await login(request, "luz@nexo.local");
    const { eventId } = await createAcceptedContract(request, {
      company,
      freelancer,
      offsetDays: 1720,
      name: "E2E Recebedor Obrigatorio",
    });

    await removeGatewayAccountsForUser("luz@nexo.local");
    await post(request, company, "/api/wallet/top-up", {
      amountCents: 200000,
      description: "Carga e2e recebedor obrigatorio",
    });

    const response = await request.post(`/api/payments/events/${eventId}/pay`, {
      headers: authHeaders(company),
    });
    const body = await response.text();

    expect(response.status()).toBe(400);
    expect(body).toContain("O freelancer ainda não configurou");
  });

  test("simulated payment webhook is idempotent", async ({ request }) => {
    const company = await login(request, "empresa@nexo.local");
    const freelancer = await login(request, "freelancer@nexo.local");
    const { eventId } = await createAcceptedContract(request, {
      company,
      freelancer,
      offsetDays: 1740,
      name: "E2E Webhook Idempotente",
    });

    await createFreelancerGatewayAccount(request, freelancer);
    await resetCompanyWallet("empresa@nexo.local");

    const payment = await post<PaymentItem>(
      request,
      company,
      `/api/payments/events/${eventId}/pay`,
    );
    expect(payment.status).toBe("WAITING_PAYMENT");
    expect(payment.gatewayPaymentId).toBeTruthy();

    const payload = {
      event: "PAYMENT_APPROVED",
      status: "PAID",
      transactionId: payment.gatewayPaymentId,
      gatewayEventId: `${payment.gatewayPaymentId}_E2E_DUPLICATE`,
    };

    const first = await post<{ processed: boolean; duplicate: boolean }>(
      request,
      null,
      "/api/payment-webhooks/simulated",
      payload,
    );
    expect(first.processed).toBeTruthy();
    expect(first.duplicate).toBeFalsy();

    const second = await post<{ processed: boolean; duplicate: boolean }>(
      request,
      null,
      "/api/payment-webhooks/simulated",
      payload,
    );
    expect(second.processed).toBeFalsy();
    expect(second.duplicate).toBeTruthy();
  });

  test("post-event automation reminds before deadline and releases after it expires", async ({
    request,
  }) => {
    const company = await login(request, "empresa@nexo.local");
    const freelancer = await login(request, "freelancer@nexo.local");
    const admin = await login(request, "admin@nexo.local");
    const { contractId, eventId } = await createAcceptedContract(request, {
      company,
      freelancer,
      offsetDays: 1760,
      name: "E2E Automacao Pos Evento",
    });

    await createFreelancerGatewayAccount(request, freelancer);
    await post(request, company, "/api/wallet/top-up", {
      amountCents: 200000,
      description: "Carga e2e automacao pos evento",
    });

    const payment = await post<PaymentItem>(
      request,
      company,
      `/api/payments/events/${eventId}/pay`,
    );
    expect(payment.status).toBe("PAID");

    await moveContractToRecentlyFinished(contractId);

    const reminderRun = await post<{
      reminders: { sent: number };
      releases: { released: number };
    }>(request, admin, "/api/payments/process-due-releases");
    expect(reminderRun.reminders.sent).toBeGreaterThanOrEqual(1);
    expect(reminderRun.releases.released).toBeGreaterThanOrEqual(0);
    await expectPaymentSplitStatus(contractId, "WAITING_RELEASE");

    const reminderAudit = await get<Array<{ action: string }>>(
      request,
      admin,
      "/api/admin/audit-logs?action=POST_EVENT_REVIEW_REMINDER_SENT",
    );
    expect(
      reminderAudit.some((item) => item.action === "POST_EVENT_REVIEW_REMINDER_SENT"),
    ).toBeTruthy();

    await moveContractToPast(contractId);

    const walletBefore = await get<WalletItem>(request, freelancer, "/api/wallet");
    const releaseRun = await post<{
      reminders: { sent: number };
      releases: { released: number };
    }>(request, admin, "/api/payments/process-due-releases");
    expect(releaseRun.releases.released).toBeGreaterThanOrEqual(1);
    await expectPaymentSplitStatus(contractId, "PAID");

    const walletAfter = await get<WalletItem>(request, freelancer, "/api/wallet");
    expect(walletAfter.balanceCents).toBeGreaterThan(walletBefore.balanceCents);

    const releaseAudit = await get<Array<{ action: string }>>(
      request,
      admin,
      "/api/admin/audit-logs?action=AUTO_PAYMENT_SPLIT_RELEASED",
    );
    expect(
      releaseAudit.some((item) => item.action === "AUTO_PAYMENT_SPLIT_RELEASED"),
    ).toBeTruthy();
  });
});

async function createAcceptedContract(
  api: APIRequestContext,
  input: {
    company: Session;
    freelancer: Session;
    offsetDays: number;
    name: string;
  },
) {
  const skills = await get<Skill[]>(api, input.company, "/api/skills");
  const freelancerProfile = await get<FreelancerProfile>(
    api,
    input.freelancer,
    "/api/freelancers/profile",
  );
  const matchingSkillId = freelancerProfile.skills?.[0]?.skill.id ?? skills[0].id;

  if (!freelancerProfile.skills?.length) {
    await post(api, input.freelancer, "/api/freelancers/skills", {
      skills: [{ skillId: matchingSkillId, dailyRateCents: 45000 }],
    });
  }

  const window = futureWindow(input.offsetDays);
  const event = await post<EventItem>(api, input.company, "/api/events", {
    name: `${input.name} ${Date.now()}`,
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    location: "Centro de Convencoes E2E",
    city: "Aracaju",
    state: "SE",
    eventType: "Teste automatizado",
    desiredProfessionals: 1,
    requirements: [
      {
        skillId: matchingSkillId,
        quantity: 1,
        dailyRateCents: 45000,
      },
    ],
  });

  const invitation = await post<InvitationItem>(
    api,
    input.company,
    "/api/invitations",
    {
      eventId: event.id,
      freelancerId: freelancerProfile.id,
      eventRequirementId: event.requirements?.[0]?.id,
      expiresAt: futureWindow(input.offsetDays - 1).startsAt,
      message: "Convite gerado pelo e2e.",
    },
  );

  const received = await get<InvitationItem[]>(
    api,
    input.freelancer,
    "/api/invitations/received",
  );
  expect(received.some((item) => item.id === invitation.id)).toBeTruthy();

  const counterProposal = await post<InvitationItem>(
    api,
    input.freelancer,
    `/api/invitations/${invitation.id}/propose-amount`,
    {
      amountCents: 47000,
      message: "Contraproposta de valor pelo e2e.",
    },
  );
  expect(counterProposal.counterAmountCents).toBe(47000);

  const agreed = await post<InvitationItem>(
    api,
    input.company,
    `/api/invitations/${invitation.id}/accept-amount`,
  );
  expect(agreed.agreedAmountCents).toBe(47000);

  const accepted = await post<{ contract: ContractItem }>(
    api,
    input.freelancer,
    `/api/invitations/${invitation.id}/accept`,
  );
  expect(accepted.contract.status).toBe("PENDING_PAYMENT");
  expect(accepted.contract.amountCents).toBe(47000);

  return { contractId: accepted.contract.id, eventId: event.id };
}

async function login(api: APIRequestContext, email: string) {
  return post<Session>(api, null, "/api/auth/login", { email, password });
}

async function createFreelancerGatewayAccount(
  api: APIRequestContext,
  session: Session,
) {
  return post(api, session, "/api/gateway-accounts/freelancer/me", {
    documentType: "CPF",
    documentNumber: "12345678900",
    holderName: "Freelancer E2E",
    bankCode: "001",
    agency: "1234",
    account: "12345",
    accountDigit: "6",
    accountType: "CHECKING",
    pixKey: "freelancer@nexo.local",
    pixKeyType: "EMAIL",
  });
}

async function get<T>(api: APIRequestContext, session: Session, path: string) {
  return json<T>(await api.get(path, { headers: authHeaders(session) }));
}

async function post<T>(
  api: APIRequestContext,
  session: Session | null,
  path: string,
  data?: unknown,
) {
  return json<T>(
    await api.post(path, {
      headers: session ? authHeaders(session) : undefined,
      data,
    }),
  );
}

async function patch<T>(
  api: APIRequestContext,
  session: Session,
  path: string,
  data: unknown,
) {
  return json<T>(
    await api.patch(path, {
      headers: authHeaders(session),
      data,
    }),
  );
}

async function del(api: APIRequestContext, session: Session, path: string) {
  return json<{ ok: boolean }>(
    await api.delete(path, { headers: authHeaders(session) }),
  );
}

async function expectStatus(
  api: APIRequestContext,
  session: Session,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  statuses: number[],
  data?: unknown,
) {
  const response = await api.fetch(path, {
    method,
    headers: authHeaders(session),
    data,
  });

  expect(statuses, await response.text()).toContain(response.status());
}

async function json<T>(response: Awaited<ReturnType<APIRequestContext["get"]>>) {
  const body = await response.text();
  expect(response.ok(), body).toBeTruthy();
  return (body ? JSON.parse(body) : undefined) as T;
}

function authHeaders(session: Session) {
  return { Authorization: `Bearer ${session.accessToken}` };
}

function futureWindow(offsetDays: number) {
  const startsAt = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  startsAt.setUTCHours(18, 0, 0, 0);
  const endsAt = new Date(startsAt);
  endsAt.setUTCHours(23, 0, 0, 0);

  return {
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

async function moveContractToPast(contractId: string) {
  const startsAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  startsAt.setUTCHours(18, 0, 0, 0);
  const endsAt = new Date(startsAt);
  endsAt.setUTCHours(23, 0, 0, 0);

  await prisma.contract.update({
    where: { id: contractId },
    data: { startsAt, endsAt },
  });
}

async function moveContractToRecentlyFinished(contractId: string) {
  const startsAt = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const endsAt = new Date(Date.now() - 60 * 60 * 1000);

  await prisma.contract.update({
    where: { id: contractId },
    data: { startsAt, endsAt },
  });
}

async function cleanupE2eArtifacts() {
  await prisma.user.deleteMany({
    where: { email: { startsWith: "e2e-lgpd-" } },
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: "e2e-team-" } },
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: "e2e-incomplete-company-" } },
  });
  await prisma.companyInvitation.deleteMany({
    where: { email: { startsWith: "e2e-team-" } },
  });
  await prisma.verificationDocument.deleteMany({
    where: { originalName: { startsWith: "e2e-" } },
  });
  await prisma.event.deleteMany({
    where: { name: { startsWith: "E2E " } },
  });
}

async function removeGatewayAccountsForUser(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { freelancerProfile: true },
  });

  if (!user?.freelancerProfile) {
    return;
  }

  await prisma.gatewayAccount.deleteMany({
    where: { freelancerId: user.freelancerProfile.id },
  });
}

async function resetCompanyWallet(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { companyProfile: { include: { wallet: true } } },
  });

  const wallet = user?.companyProfile?.wallet;
  if (!wallet) {
    return;
  }

  await prisma.wallet.update({
    where: { id: wallet.id },
    data: { balanceCents: 0 },
  });
}

async function expectPaymentSplitStatus(contractId: string, releaseStatus: string) {
  const split = await prisma.paymentSplit.findFirst({
    where: { contractId },
    select: { releaseStatus: true },
  });

  expect(split?.releaseStatus).toBe(releaseStatus);
}

function assertNoSensitivePublicKeys(value: unknown) {
  const found = findSensitivePublicKeys(value);
  expect(found).toEqual([]);
}

function findSensitivePublicKeys(value: unknown, path = "$"): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findSensitivePublicKeys(item, `${path}[${index}]`),
    );
  }

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => {
      const currentPath = `${path}.${key}`;
      const current = sensitivePublicKeys.includes(key) ? [currentPath] : [];
      return [...current, ...findSensitivePublicKeys(child, currentPath)];
    },
  );
}
