import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const password = "Nexo@12345";

const skills = [
  "Técnico de áudio",
  "Técnico de luz",
  "Operador de LED",
  "Roadie",
  "Produtor",
  "Câmera",
  "Fotógrafo",
  "Operador de streaming",
  "Montador",
  "Carregador",
  "DJ",
  "Recepcionista",
  "Segurança",
  "Staff de apoio",
  "Bartender",
  "Garçom",
  "Brigadista",
  "Cerimonialista",
  "Social media",
  "Designer de palco",
];

const companySeeds = [
  {
    email: "empresa@nexo.local",
    name: "Alexandre Japiassú",
    companyName: "Japiassú Eventos",
    responsibleName: "Alexandre Japiassú",
    document: "12.345.678/0001-90",
    phone: "(79) 99999-9999",
    city: "Aracaju",
    state: "SE",
    verificationStatus: "VERIFIED",
  },
  {
    email: "aurora@nexo.local",
    name: "Bianca Costa",
    companyName: "Aurora Produções",
    responsibleName: "Bianca Costa",
    document: "22.456.111/0001-10",
    phone: "(79) 98811-2200",
    city: "Aracaju",
    state: "SE",
    verificationStatus: "VERIFIED",
  },
  {
    email: "litoral@nexo.local",
    name: "Caio Menezes",
    companyName: "Litoral Live Marketing",
    responsibleName: "Caio Menezes",
    document: "18.765.222/0001-44",
    phone: "(71) 97722-3311",
    city: "Salvador",
    state: "BA",
    verificationStatus: "PENDING",
  },
  {
    email: "sertao@nexo.local",
    name: "Daniela Rocha",
    companyName: "Sertão Eventos Corporativos",
    responsibleName: "Daniela Rocha",
    document: "09.333.444/0001-55",
    phone: "(81) 96633-4411",
    city: "Recife",
    state: "PE",
    verificationStatus: "REJECTED",
  },
] as const;

const freelancerSeeds = [
  {
    email: "freelancer@nexo.local",
    name: "Marina Santos",
    displayName: "Marina LED",
    phone: "(79) 98888-1000",
    city: "Aracaju",
    state: "SE",
    dailyRateCents: 45000,
    tools: "Notebook, controladora e interface de vídeo",
    transportation: "Carro próprio",
    verificationStatus: "VERIFIED",
    skills: [
      ["operador-de-led", 45000],
      ["tecnico-de-audio", 38000],
    ],
  },
  {
    email: "audio@nexo.local",
    name: "Rafael Lima",
    displayName: "Rafa Áudio",
    phone: "(79) 98844-1122",
    city: "Aracaju",
    state: "SE",
    dailyRateCents: 42000,
    tools: "Mesa digital, microfones sem fio e medidor SPL",
    transportation: "Moto",
    verificationStatus: "VERIFIED",
    skills: [
      ["tecnico-de-audio", 42000],
      ["roadie", 28000],
    ],
  },
  {
    email: "luz@nexo.local",
    name: "Patrícia Nunes",
    displayName: "Paty Luz",
    phone: "(79) 98855-2233",
    city: "Aracaju",
    state: "SE",
    dailyRateCents: 39000,
    tools: "Console DMX e kit de cabos",
    transportation: "Carro próprio",
    verificationStatus: "VERIFIED",
    skills: [
      ["tecnico-de-luz", 39000],
      ["designer-de-palco", 52000],
    ],
  },
  {
    email: "foto@nexo.local",
    name: "João Pedro",
    displayName: "JP Foto",
    phone: "(79) 98866-3344",
    city: "Aracaju",
    state: "SE",
    dailyRateCents: 65000,
    tools: "Câmeras full frame, flash e lentes 24-70/70-200",
    transportation: "Carro próprio",
    verificationStatus: "PENDING",
    skills: [
      ["fotografo", 65000],
      ["social-media", 35000],
    ],
  },
  {
    email: "dj@nexo.local",
    name: "Lucas Andrade",
    displayName: "DJ LK",
    phone: "(79) 98777-4455",
    city: "Aracaju",
    state: "SE",
    dailyRateCents: 70000,
    tools: "Controladora, notebook e backup de mídia",
    transportation: "Carro próprio",
    verificationStatus: "VERIFIED",
    skills: [
      ["dj", 70000],
      ["operador-de-streaming", 42000],
    ],
  },
  {
    email: "recepcao@nexo.local",
    name: "Nathália Reis",
    displayName: "Nath Recepção",
    phone: "(71) 98711-5566",
    city: "Salvador",
    state: "BA",
    dailyRateCents: 26000,
    tools: "Tablet e rádio comunicador",
    transportation: "Transporte público",
    verificationStatus: "VERIFIED",
    skills: [
      ["recepcionista", 26000],
      ["cerimonialista", 48000],
    ],
  },
  {
    email: "seguranca@nexo.local",
    name: "Bruno Oliveira",
    displayName: "Bruno Segurança",
    phone: "(71) 98622-6677",
    city: "Salvador",
    state: "BA",
    dailyRateCents: 30000,
    tools: "Rádio e EPI",
    transportation: "Moto",
    verificationStatus: "VERIFIED",
    skills: [
      ["seguranca", 30000],
      ["brigadista", 36000],
    ],
  },
  {
    email: "bar@nexo.local",
    name: "Camila Torres",
    displayName: "Cami Bar",
    phone: "(81) 98533-7788",
    city: "Recife",
    state: "PE",
    dailyRateCents: 32000,
    tools: "Kit bartender e uniforme",
    transportation: "Carro próprio",
    verificationStatus: "PENDING",
    skills: [
      ["bartender", 32000],
      ["garcom", 24000],
    ],
  },
  {
    email: "streaming@nexo.local",
    name: "Fábio Cruz",
    displayName: "Fábio Stream",
    phone: "(81) 98444-8899",
    city: "Recife",
    state: "PE",
    dailyRateCents: 58000,
    tools: "Switcher, encoder, capturas HDMI e notebook",
    transportation: "Carro próprio",
    verificationStatus: "VERIFIED",
    skills: [
      ["operador-de-streaming", 58000],
      ["camera", 45000],
    ],
  },
  {
    email: "montagem@nexo.local",
    name: "Igor Matos",
    displayName: "Igor Montagem",
    phone: "(79) 98355-9900",
    city: "Aracaju",
    state: "SE",
    dailyRateCents: 22000,
    tools: "Ferramentas manuais e EPI",
    transportation: "Van própria",
    verificationStatus: "REJECTED",
    skills: [
      ["montador", 22000],
      ["carregador", 18000],
    ],
  },
] as const;

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function moneyFromRequirements(
  requirements: Array<{ quantity: number; dailyRateCents: number }>,
) {
  return requirements.reduce(
    (total, requirement) =>
      total + requirement.quantity * requirement.dailyRateCents,
    0,
  );
}

async function upsertUser(
  email: string,
  data: {
    name: string;
    passwordHash: string;
    phone?: string;
    role: "ADMIN" | "COMPANY" | "FREELANCER";
  },
) {
  return prisma.user.upsert({
    where: { email },
    update: {
      name: data.name,
      passwordHash: data.passwordHash,
      phone: data.phone,
      role: data.role,
      isActive: true,
    },
    create: {
      email,
      name: data.name,
      passwordHash: data.passwordHash,
      phone: data.phone,
      role: data.role,
    },
  });
}

async function ensureCompanyWallet(companyId: string) {
  return prisma.wallet.upsert({
    where: { companyId },
    update: {},
    create: { companyId },
  });
}

async function ensureFreelancerWallet(freelancerId: string) {
  return prisma.wallet.upsert({
    where: { freelancerId },
    update: {},
    create: { freelancerId },
  });
}

async function createEventOnce(data: {
  companyId: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  location: string;
  city: string;
  state: string;
  description: string;
  eventType: string;
  status:
    | "OPEN"
    | "INVITING"
    | "CONFIRMED"
    | "IN_PROGRESS"
    | "FINISHED"
    | "CANCELLED";
  requirements: Array<{
    skillId: string;
    quantity: number;
    dailyRateCents: number;
  }>;
}) {
  const existing = await prisma.event.findFirst({
    where: { companyId: data.companyId, name: data.name },
    include: { requirements: true },
  });

  if (existing) {
    return existing;
  }

  return prisma.event.create({
    data: {
      companyId: data.companyId,
      name: data.name,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      location: data.location,
      city: data.city,
      state: data.state,
      description: data.description,
      eventType: data.eventType,
      desiredProfessionals: data.requirements.reduce(
        (total, requirement) => total + requirement.quantity,
        0,
      ),
      status: data.status,
      requirements: {
        create: data.requirements.map((requirement) => ({
          skillId: requirement.skillId,
          quantity: requirement.quantity,
          dailyRateCents: requirement.dailyRateCents,
        })),
      },
    },
    include: { requirements: true },
  });
}

async function createInvitationOnce(data: {
  eventId: string;
  companyId: string;
  freelancerId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  expiresAt: Date;
  respondedAt?: Date;
  message: string;
}) {
  const existing = await prisma.invitation.findFirst({
    where: { eventId: data.eventId, freelancerId: data.freelancerId },
  });

  if (existing) {
    return existing;
  }

  return prisma.invitation.create({ data });
}

async function createContractOnce(data: {
  eventId: string;
  companyId: string;
  freelancerId: string;
  invitationId?: string;
  status:
    | "PENDING_PAYMENT"
    | "CONFIRMED"
    | "COMPLETED"
    | "NO_SHOW"
    | "CANCELLED"
    | "DISPUTED"
    | "PAID";
  amountCents: number;
  startsAt: Date;
  endsAt: Date;
}) {
  const existing = data.invitationId
    ? await prisma.contract.findUnique({
        where: { invitationId: data.invitationId },
      })
    : await prisma.contract.findFirst({
        where: {
          eventId: data.eventId,
          freelancerId: data.freelancerId,
          startsAt: data.startsAt,
        },
      });

  if (existing) {
    return existing;
  }

  return prisma.contract.create({
    data: {
      eventId: data.eventId,
      companyId: data.companyId,
      freelancerId: data.freelancerId,
      invitationId: data.invitationId,
      status: data.status,
      amountCents: data.amountCents,
      platformFeeCents: Math.round(data.amountCents * 0.08),
      startsAt: data.startsAt,
      endsAt: data.endsAt,
    },
  });
}

async function createPaymentOnce(data: {
  contractId: string;
  status: "PAID" | "RELEASED_TO_FREELANCER";
  freelancerAmountCents: number;
  platformFeeCents: number;
}) {
  const existing = await prisma.payment.findUnique({
    where: { contractId: data.contractId },
  });

  if (existing) {
    return existing;
  }

  return prisma.payment.create({
    data: {
      contractId: data.contractId,
      status: data.status,
      freelancerAmountCents: data.freelancerAmountCents,
      platformFeeCents: data.platformFeeCents,
      grossAmountCents: data.freelancerAmountCents + data.platformFeeCents,
      gatewayTransactionId: `seed_${data.contractId}`,
      paidAt: new Date(),
      splits: {
        create: [
          {
            recipientType: "FREELANCER",
            amountCents: data.freelancerAmountCents,
            gatewayRecipientId: `freelancer_seed_${data.contractId}`,
          },
          {
            recipientType: "PLATFORM",
            amountCents: data.platformFeeCents,
            gatewayRecipientId: "platform",
          },
        ],
      },
    },
  });
}

async function createReviewOnce(data: {
  contractId: string;
  companyReviewerId?: string;
  freelancerReviewerId?: string;
  companyReviewedId?: string;
  freelancerReviewedId?: string;
  overallRating: number;
  comment: string;
}) {
  const existing = await prisma.review.findFirst({
    where: {
      contractId: data.contractId,
      companyReviewerId: data.companyReviewerId,
      freelancerReviewerId: data.freelancerReviewerId,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.review.create({
    data: {
      ...data,
      punctuality: data.freelancerReviewedId ? data.overallRating : undefined,
      technicalQuality: data.freelancerReviewedId
        ? data.overallRating
        : undefined,
      professionalPosture: data.freelancerReviewedId
        ? data.overallRating
        : undefined,
      communication: data.overallRating,
      organization: data.companyReviewedId ? data.overallRating : undefined,
      informationClarity: data.companyReviewedId
        ? data.overallRating
        : undefined,
      payment: data.companyReviewedId ? data.overallRating : undefined,
      professionalTreatment: data.companyReviewedId
        ? data.overallRating
        : undefined,
    },
  });
}

async function recalculateRatings() {
  const freelancers = await prisma.freelancerProfile.findMany({
    select: { id: true },
  });
  for (const freelancer of freelancers) {
    const result = await prisma.review.aggregate({
      where: { freelancerReviewedId: freelancer.id },
      _avg: { overallRating: true },
    });
    await prisma.freelancerProfile.update({
      where: { id: freelancer.id },
      data: {
        ratingAverage: result._avg.overallRating
          ? Number(result._avg.overallRating.toFixed(2))
          : 0,
      },
    });
  }

  const companies = await prisma.companyProfile.findMany({
    select: { id: true },
  });
  for (const company of companies) {
    const result = await prisma.review.aggregate({
      where: { companyReviewedId: company.id },
      _avg: { overallRating: true },
    });
    await prisma.companyProfile.update({
      where: { id: company.id },
      data: {
        ratingAverage: result._avg.overallRating
          ? Number(result._avg.overallRating.toFixed(2))
          : 0,
      },
    });
  }
}

async function createNotificationOnce(data: {
  userId: string;
  type: string;
  title: string;
  body: string;
}) {
  if (
    await prisma.notification.findFirst({
      where: { userId: data.userId, type: data.type, title: data.title },
    })
  ) {
    return;
  }

  await prisma.notification.create({ data });
}

async function createAvailabilityOnce(data: {
  freelancerId: string;
  startsAt: Date;
  endsAt: Date;
  isAvailable: boolean;
  reason: string;
}) {
  if (
    await prisma.availability.findFirst({
      where: {
        freelancerId: data.freelancerId,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        reason: data.reason,
      },
    })
  ) {
    return;
  }

  await prisma.availability.create({ data });
}

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);

  const skillMap = new Map<string, string>();
  for (const name of skills) {
    const skill = await prisma.skill.upsert({
      where: { slug: slugify(name) },
      update: { name, isActive: true },
      create: {
        name,
        slug: slugify(name),
      },
    });
    skillMap.set(skill.slug, skill.id);
  }

  const admin = await upsertUser("admin@nexo.local", {
    name: "Admin NEXO",
    passwordHash,
    role: "ADMIN",
    phone: "(79) 99999-0001",
  });

  const companies = new Map<
    string,
    Awaited<ReturnType<typeof prisma.companyProfile.upsert>>
  >();
  for (const companySeed of companySeeds) {
    const user = await upsertUser(companySeed.email, {
      name: companySeed.name,
      passwordHash,
      role: "COMPANY",
      phone: companySeed.phone,
    });
    const profile = await prisma.companyProfile.upsert({
      where: { userId: user.id },
      update: {
        companyName: companySeed.companyName,
        responsibleName: companySeed.responsibleName,
        document: companySeed.document,
        phone: companySeed.phone,
        email: companySeed.email,
        city: companySeed.city,
        state: companySeed.state,
        verificationStatus: companySeed.verificationStatus,
      },
      create: {
        userId: user.id,
        companyName: companySeed.companyName,
        responsibleName: companySeed.responsibleName,
        document: companySeed.document,
        phone: companySeed.phone,
        email: companySeed.email,
        city: companySeed.city,
        state: companySeed.state,
        verificationStatus: companySeed.verificationStatus,
        wallet: { create: {} },
      },
    });
    await ensureCompanyWallet(profile.id);
    companies.set(companySeed.companyName, profile);
  }

  const freelancers = new Map<
    string,
    Awaited<ReturnType<typeof prisma.freelancerProfile.upsert>>
  >();
  for (const freelancerSeed of freelancerSeeds) {
    const user = await upsertUser(freelancerSeed.email, {
      name: freelancerSeed.name,
      passwordHash,
      role: "FREELANCER",
      phone: freelancerSeed.phone,
    });
    const profile = await prisma.freelancerProfile.upsert({
      where: { userId: user.id },
      update: {
        displayName: freelancerSeed.displayName,
        city: freelancerSeed.city,
        state: freelancerSeed.state,
        tools: freelancerSeed.tools,
        transportation: freelancerSeed.transportation,
        dailyRateCents: freelancerSeed.dailyRateCents,
        verificationStatus: freelancerSeed.verificationStatus,
      },
      create: {
        userId: user.id,
        displayName: freelancerSeed.displayName,
        city: freelancerSeed.city,
        state: freelancerSeed.state,
        tools: freelancerSeed.tools,
        transportation: freelancerSeed.transportation,
        dailyRateCents: freelancerSeed.dailyRateCents,
        verificationStatus: freelancerSeed.verificationStatus,
        wallet: { create: {} },
      },
    });
    await ensureFreelancerWallet(profile.id);

    for (const [skillSlug, dailyRateCents] of freelancerSeed.skills) {
      const skillId = skillMap.get(skillSlug);
      if (!skillId) {
        continue;
      }
      await prisma.freelancerSkill.upsert({
        where: {
          freelancerId_skillId: {
            freelancerId: profile.id,
            skillId,
          },
        },
        update: { dailyRateCents },
        create: {
          freelancerId: profile.id,
          skillId,
          dailyRateCents,
        },
      });
    }

    freelancers.set(freelancerSeed.displayName, profile);
  }

  const eventSeeds = [
    {
      company: "Japiassú Eventos",
      name: "Festival de Verão NEXO",
      startsAt: "2026-06-12T18:00:00.000-03:00",
      endsAt: "2026-06-13T02:00:00.000-03:00",
      location: "Orla de Atalaia",
      city: "Aracaju",
      state: "SE",
      description: "Festival aberto com palco, LED, transmissão e operação técnica.",
      eventType: "Festival",
      status: "OPEN",
      requirements: [
        ["operador-de-led", 1, 45000],
        ["tecnico-de-audio", 2, 42000],
        ["tecnico-de-luz", 1, 39000],
      ],
    },
    {
      company: "Japiassú Eventos",
      name: "Casamento Marina & Theo",
      startsAt: "2026-06-20T15:00:00.000-03:00",
      endsAt: "2026-06-21T01:00:00.000-03:00",
      location: "Espaço Jardins",
      city: "Aracaju",
      state: "SE",
      description: "Cerimônia e festa com recepção, foto, DJ e apoio.",
      eventType: "Casamento",
      status: "CONFIRMED",
      requirements: [
        ["fotografo", 1, 65000],
        ["dj", 1, 70000],
        ["recepcionista", 2, 26000],
      ],
    },
    {
      company: "Aurora Produções",
      name: "Congresso Saúde Nordeste",
      startsAt: "2026-07-02T08:00:00.000-03:00",
      endsAt: "2026-07-02T20:00:00.000-03:00",
      location: "Centro de Convenções AM Malls",
      city: "Aracaju",
      state: "SE",
      description: "Congresso corporativo com streaming, credenciamento e plenária.",
      eventType: "Congresso",
      status: "INVITING",
      requirements: [
        ["operador-de-streaming", 2, 58000],
        ["recepcionista", 3, 26000],
        ["camera", 2, 45000],
      ],
    },
    {
      company: "Litoral Live Marketing",
      name: "Lançamento Rooftop Salvador",
      startsAt: "2026-07-10T17:00:00.000-03:00",
      endsAt: "2026-07-10T23:30:00.000-03:00",
      location: "Rooftop Comércio",
      city: "Salvador",
      state: "BA",
      description: "Ativação de marca com recepção, segurança e conteúdo social.",
      eventType: "Brand experience",
      status: "OPEN",
      requirements: [
        ["recepcionista", 4, 26000],
        ["seguranca", 3, 30000],
        ["social-media", 1, 35000],
      ],
    },
    {
      company: "Sertão Eventos Corporativos",
      name: "Workshop Comercial Recife",
      startsAt: "2026-05-29T09:00:00.000-03:00",
      endsAt: "2026-05-29T18:00:00.000-03:00",
      location: "Hotel Boa Viagem",
      city: "Recife",
      state: "PE",
      description: "Workshop com transmissão, bar de apoio e fotografia.",
      eventType: "Corporativo",
      status: "FINISHED",
      requirements: [
        ["operador-de-streaming", 1, 58000],
        ["bartender", 2, 32000],
        ["fotografo", 1, 65000],
      ],
    },
  ] as const;

  const events = new Map<string, Awaited<ReturnType<typeof createEventOnce>>>();
  for (const eventSeed of eventSeeds) {
    const company = companies.get(eventSeed.company);
    if (!company) {
      continue;
    }
    const event = await createEventOnce({
      companyId: company.id,
      name: eventSeed.name,
      startsAt: new Date(eventSeed.startsAt),
      endsAt: new Date(eventSeed.endsAt),
      location: eventSeed.location,
      city: eventSeed.city,
      state: eventSeed.state,
      description: eventSeed.description,
      eventType: eventSeed.eventType,
      status: eventSeed.status,
      requirements: eventSeed.requirements
        .map(([skillSlug, quantity, dailyRateCents]) => ({
          skillId: skillMap.get(skillSlug),
          quantity,
          dailyRateCents,
        }))
        .filter(
          (
            requirement,
          ): requirement is {
            skillId: string;
            quantity: number;
            dailyRateCents: number;
          } => Boolean(requirement.skillId),
        ),
    });
    events.set(eventSeed.name, event);
  }

  const scenarioSeeds = [
    {
      event: "Festival de Verão NEXO",
      company: "Japiassú Eventos",
      freelancer: "Marina LED",
      invitationStatus: "ACCEPTED",
      contractStatus: "PENDING_PAYMENT",
      amountCents: 45000,
    },
    {
      event: "Festival de Verão NEXO",
      company: "Japiassú Eventos",
      freelancer: "Rafa Áudio",
      invitationStatus: "ACCEPTED",
      contractStatus: "CONFIRMED",
      amountCents: 42000,
      paymentStatus: "PAID",
    },
    {
      event: "Festival de Verão NEXO",
      company: "Japiassú Eventos",
      freelancer: "Paty Luz",
      invitationStatus: "PENDING",
    },
    {
      event: "Casamento Marina & Theo",
      company: "Japiassú Eventos",
      freelancer: "DJ LK",
      invitationStatus: "ACCEPTED",
      contractStatus: "PAID",
      amountCents: 70000,
      paymentStatus: "RELEASED_TO_FREELANCER",
      review: true,
    },
    {
      event: "Casamento Marina & Theo",
      company: "Japiassú Eventos",
      freelancer: "JP Foto",
      invitationStatus: "ACCEPTED",
      contractStatus: "COMPLETED",
      amountCents: 65000,
      paymentStatus: "PAID",
      review: true,
    },
    {
      event: "Congresso Saúde Nordeste",
      company: "Aurora Produções",
      freelancer: "Fábio Stream",
      invitationStatus: "ACCEPTED",
      contractStatus: "DISPUTED",
      amountCents: 58000,
      paymentStatus: "PAID",
      dispute: true,
    },
    {
      event: "Congresso Saúde Nordeste",
      company: "Aurora Produções",
      freelancer: "Nath Recepção",
      invitationStatus: "DECLINED",
    },
    {
      event: "Lançamento Rooftop Salvador",
      company: "Litoral Live Marketing",
      freelancer: "Bruno Segurança",
      invitationStatus: "PENDING",
    },
    {
      event: "Lançamento Rooftop Salvador",
      company: "Litoral Live Marketing",
      freelancer: "Nath Recepção",
      invitationStatus: "PENDING",
    },
    {
      event: "Workshop Comercial Recife",
      company: "Sertão Eventos Corporativos",
      freelancer: "Cami Bar",
      invitationStatus: "ACCEPTED",
      contractStatus: "NO_SHOW",
      amountCents: 32000,
    },
  ] as const;

  for (const scenario of scenarioSeeds) {
    const event = events.get(scenario.event);
    const company = companies.get(scenario.company);
    const freelancer = freelancers.get(scenario.freelancer);
    if (!event || !company || !freelancer) {
      continue;
    }

    const invitation = await createInvitationOnce({
      eventId: event.id,
      companyId: company.id,
      freelancerId: freelancer.id,
      status: scenario.invitationStatus,
      expiresAt: new Date("2026-06-01T12:00:00.000-03:00"),
      respondedAt:
        scenario.invitationStatus === "PENDING"
          ? undefined
          : new Date("2026-05-19T12:00:00.000-03:00"),
      message: `Convite seed para ${scenario.event}.`,
    });

    if (!("contractStatus" in scenario)) {
      continue;
    }

    const contract = await createContractOnce({
      eventId: event.id,
      companyId: company.id,
      freelancerId: freelancer.id,
      invitationId: invitation.id,
      status: scenario.contractStatus,
      amountCents: scenario.amountCents,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
    });

    if ("paymentStatus" in scenario) {
      const platformFeeCents = Math.round(scenario.amountCents * 0.08);
      await createPaymentOnce({
        contractId: contract.id,
        status: scenario.paymentStatus,
        freelancerAmountCents: scenario.amountCents,
        platformFeeCents,
      });

      if (scenario.paymentStatus === "RELEASED_TO_FREELANCER") {
        const wallet = await ensureFreelancerWallet(freelancer.id);
        if (
          !(await prisma.transaction.findFirst({
            where: {
              walletId: wallet.id,
              description: `Seed repasse ${contract.id}`,
            },
          }))
        ) {
          await prisma.wallet.update({
            where: { id: wallet.id },
            data: { balanceCents: { increment: scenario.amountCents } },
          });
          await prisma.transaction.create({
            data: {
              walletId: wallet.id,
              type: "CREDIT",
              amountCents: scenario.amountCents,
              description: `Seed repasse ${contract.id}`,
            },
          });
        }
      }
    }

    if ("review" in scenario && scenario.review) {
      await createReviewOnce({
        contractId: contract.id,
        companyReviewerId: company.id,
        freelancerReviewedId: freelancer.id,
        overallRating: 5,
        comment: "Profissional pontual e bem preparado no cenário seed.",
      });
      await createReviewOnce({
        contractId: contract.id,
        freelancerReviewerId: freelancer.id,
        companyReviewedId: company.id,
        overallRating: 4,
        comment: "Briefing claro e pagamento acompanhado corretamente.",
      });
    }

    if ("dispute" in scenario && scenario.dispute) {
      if (
        !(await prisma.dispute.findFirst({
          where: { contractId: contract.id },
        }))
      ) {
        await prisma.dispute.create({
          data: {
            contractId: contract.id,
            reason: "Divergência no horário de encerramento",
            details:
              "Cenário seed para testar análise administrativa de disputa.",
            status: "UNDER_REVIEW",
          },
        });
      }
    }
  }

  const marina = freelancers.get("Marina LED");
  const rafa = freelancers.get("Rafa Áudio");
  if (marina) {
    await createAvailabilityOnce({
      freelancerId: marina.id,
      startsAt: new Date("2026-07-02T08:00:00.000-03:00"),
      endsAt: new Date("2026-07-02T20:00:00.000-03:00"),
      isAvailable: false,
      reason: "Agenda bloqueada para manutenção de equipamento",
    });
  }
  if (rafa) {
    await createAvailabilityOnce({
      freelancerId: rafa.id,
      startsAt: new Date("2026-07-10T17:00:00.000-03:00"),
      endsAt: new Date("2026-07-10T23:30:00.000-03:00"),
      isAvailable: false,
      reason: "Contrato externo informado pelo profissional",
    });
  }

  await recalculateRatings();

  await createNotificationOnce({
    userId: admin.id,
    type: "DEMO_READY",
    title: "Ambiente demo preparado",
    body: "Seed ampliado com empresas, freelancers, eventos, contratos, pagamentos e disputas.",
  });

  for (const [displayName, freelancer] of freelancers) {
    const user = await prisma.user.findUnique({
      where: { id: freelancer.userId },
    });
    if (!user) {
      continue;
    }
    await createNotificationOnce({
      userId: user.id,
      type: "SEED_PROFILE_READY",
      title: "Perfil demo criado",
      body: `${displayName}, seu perfil seed está pronto para testes.`,
    });
  }

  console.log("Demo users ready:");
  console.log(`admin@nexo.local / ${password}`);
  console.log(`empresa@nexo.local / ${password}`);
  console.log(`freelancer@nexo.local / ${password}`);
  console.log("Extra company users:");
  for (const company of companySeeds.slice(1)) {
    console.log(`${company.email} / ${password}`);
  }
  console.log("Extra freelancer users:");
  for (const freelancer of freelancerSeeds.slice(1)) {
    console.log(`${freelancer.email} / ${password}`);
  }
  console.log(
    `Seed summary: ${companySeeds.length} empresas, ${freelancerSeeds.length} freelancers, ${eventSeeds.length} eventos.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
