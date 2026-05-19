import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
];

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const passwordHash = await bcrypt.hash("Nexo@12345", 12);

  for (const name of skills) {
    await prisma.skill.upsert({
      where: { slug: slugify(name) },
      update: { name, isActive: true },
      create: {
        name,
        slug: slugify(name),
      },
    });
  }

  const admin = await prisma.user.upsert({
    where: { email: "admin@nexo.local" },
    update: {
      name: "Admin NEXO",
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
    create: {
      name: "Admin NEXO",
      email: "admin@nexo.local",
      passwordHash,
      role: "ADMIN",
      phone: "(79) 99999-0001",
    },
  });

  const companyUser = await prisma.user.upsert({
    where: { email: "empresa@nexo.local" },
    update: {
      name: "Alexandre Japiassú",
      passwordHash,
      role: "COMPANY",
      isActive: true,
    },
    create: {
      name: "Alexandre Japiassú",
      email: "empresa@nexo.local",
      passwordHash,
      role: "COMPANY",
      phone: "(79) 99999-9999",
    },
  });

  const freelancerUser = await prisma.user.upsert({
    where: { email: "freelancer@nexo.local" },
    update: {
      name: "Marina Santos",
      passwordHash,
      role: "FREELANCER",
      isActive: true,
    },
    create: {
      name: "Marina Santos",
      email: "freelancer@nexo.local",
      passwordHash,
      role: "FREELANCER",
      phone: "(79) 98888-1000",
    },
  });

  const company = await prisma.companyProfile.upsert({
    where: { userId: companyUser.id },
    update: {
      companyName: "Japiassú Eventos",
      responsibleName: "Alexandre Japiassú",
      document: "12.345.678/0001-90",
      phone: "(79) 99999-9999",
      email: "empresa@nexo.local",
      city: "Aracaju",
      state: "SE",
      verificationStatus: "VERIFIED",
    },
    create: {
      userId: companyUser.id,
      companyName: "Japiassú Eventos",
      responsibleName: "Alexandre Japiassú",
      document: "12.345.678/0001-90",
      phone: "(79) 99999-9999",
      email: "empresa@nexo.local",
      city: "Aracaju",
      state: "SE",
      verificationStatus: "VERIFIED",
      wallet: { create: {} },
    },
  });

  await prisma.wallet.upsert({
    where: { companyId: company.id },
    update: {},
    create: { companyId: company.id },
  });

  const freelancer = await prisma.freelancerProfile.upsert({
    where: { userId: freelancerUser.id },
    update: {
      displayName: "Marina LED",
      city: "Aracaju",
      state: "SE",
      tools: "Notebook, controladora e interface de vídeo",
      transportation: "Carro próprio",
      dailyRateCents: 45000,
      verificationStatus: "VERIFIED",
    },
    create: {
      userId: freelancerUser.id,
      displayName: "Marina LED",
      city: "Aracaju",
      state: "SE",
      tools: "Notebook, controladora e interface de vídeo",
      transportation: "Carro próprio",
      dailyRateCents: 45000,
      verificationStatus: "VERIFIED",
      wallet: { create: {} },
    },
  });

  await prisma.wallet.upsert({
    where: { freelancerId: freelancer.id },
    update: {},
    create: { freelancerId: freelancer.id },
  });

  const ledSkill = await prisma.skill.findUniqueOrThrow({
    where: { slug: "operador-de-led" },
  });
  const audioSkill = await prisma.skill.findUniqueOrThrow({
    where: { slug: "tecnico-de-audio" },
  });

  await prisma.freelancerSkill.upsert({
    where: {
      freelancerId_skillId: {
        freelancerId: freelancer.id,
        skillId: ledSkill.id,
      },
    },
    update: { dailyRateCents: 45000 },
    create: {
      freelancerId: freelancer.id,
      skillId: ledSkill.id,
      dailyRateCents: 45000,
    },
  });

  await prisma.freelancerSkill.upsert({
    where: {
      freelancerId_skillId: {
        freelancerId: freelancer.id,
        skillId: audioSkill.id,
      },
    },
    update: { dailyRateCents: 38000 },
    create: {
      freelancerId: freelancer.id,
      skillId: audioSkill.id,
      dailyRateCents: 38000,
    },
  });

  const startsAt = new Date("2026-06-12T18:00:00.000-03:00");
  const endsAt = new Date("2026-06-13T02:00:00.000-03:00");
  const event =
    (await prisma.event.findFirst({
      where: { companyId: company.id, name: "Festival de Verão NEXO" },
    })) ??
    (await prisma.event.create({
      data: {
        companyId: company.id,
        name: "Festival de Verão NEXO",
        startsAt,
        endsAt,
        location: "Orla de Atalaia",
        city: "Aracaju",
        state: "SE",
        description: "Evento demo para validar convite, contrato e pagamento.",
        eventType: "Festival",
        desiredProfessionals: 2,
        status: "OPEN",
        requirements: {
          create: [
            {
              skillId: ledSkill.id,
              quantity: 1,
              dailyRateCents: 45000,
            },
            {
              skillId: audioSkill.id,
              quantity: 1,
              dailyRateCents: 38000,
            },
          ],
        },
      },
    }));

  const invitation =
    (await prisma.invitation.findFirst({
      where: {
        eventId: event.id,
        freelancerId: freelancer.id,
      },
    })) ??
    (await prisma.invitation.create({
      data: {
        eventId: event.id,
        companyId: company.id,
        freelancerId: freelancer.id,
        status: "ACCEPTED",
        expiresAt: new Date("2026-06-01T12:00:00.000-03:00"),
        respondedAt: new Date("2026-05-19T12:00:00.000-03:00"),
        message: "Convite demo aceito para validar o fluxo completo.",
      },
    }));

  const contract =
    (await prisma.contract.findUnique({
      where: { invitationId: invitation.id },
    })) ??
    (await prisma.contract.create({
      data: {
        eventId: event.id,
        companyId: company.id,
        freelancerId: freelancer.id,
        invitationId: invitation.id,
        status: "PENDING_PAYMENT",
        amountCents: 45000,
        platformFeeCents: 3600,
        startsAt,
        endsAt,
      },
    }));

  if (
    !(await prisma.notification.findFirst({
      where: { userId: admin.id, type: "DEMO_READY" },
    }))
  ) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: "DEMO_READY",
        title: "Ambiente demo preparado",
        body: "Contas, evento e contrato inicial foram criados pelo seed.",
      },
    });
  }

  if (
    !(await prisma.notification.findFirst({
      where: { userId: freelancerUser.id, type: "INVITATION_ACCEPTED" },
    }))
  ) {
    await prisma.notification.create({
      data: {
        userId: freelancerUser.id,
        type: "INVITATION_ACCEPTED",
        title: "Convite aceito",
        body: `Você aceitou o convite para ${event.name}.`,
      },
    });
  }

  console.log("Demo users ready:");
  console.log("admin@nexo.local / Nexo@12345");
  console.log("empresa@nexo.local / Nexo@12345");
  console.log("freelancer@nexo.local / Nexo@12345");
  console.log(`Demo contract: ${contract.id}`);
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
