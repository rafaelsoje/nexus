import { expect, test, type APIRequestContext } from "@playwright/test";

const password = "Nexo@12345";
const tinyPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

type Session = {
  accessToken: string;
  user: { role: "ADMIN" | "COMPANY" | "FREELANCER" };
};

type Skill = { id: string; name: string };
type FreelancerProfile = {
  id: string;
  skills?: Array<{ skill: Skill; dailyRateCents?: number }>;
};
type CompanyProfile = {
  id: string;
  verificationDocuments?: Array<{ id: string; originalName: string }>;
};
type EventItem = { id: string; name: string };
type InvitationItem = { id: string; event?: EventItem };
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
type ContractItem = { id: string; status: string };
type PaymentItem = { id: string; status: string };
type ReviewItem = { id: string; overallRating: number };
type DisputeItem = { id: string; status: string };

test.describe.serial("NEXO e2e API flows", () => {
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

    const payment = await post<PaymentItem>(
      request,
      company,
      `/api/payments/contracts/${contractId}/pay`,
    );
    expect(payment.status).toBe("PAID");

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

    const window = futureWindow(800);
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

    await del(request, company, `/api/documents/${document.id}`);
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
        skillId: skills[0].id,
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

  const accepted = await post<{ contract: ContractItem }>(
    api,
    input.freelancer,
    `/api/invitations/${invitation.id}/accept`,
  );
  expect(accepted.contract.status).toBe("PENDING_PAYMENT");

  return { contractId: accepted.contract.id, eventId: event.id };
}

async function login(api: APIRequestContext, email: string) {
  return post<Session>(api, null, "/api/auth/login", { email, password });
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
