import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { platformSkills, slugify } from "./platform-seed-data";

const prisma = new PrismaClient();

const demoPassword = process.env.SEED_DEMO_PASSWORD ?? "Nexo@12345";

async function main() {
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  for (const skillSeed of platformSkills) {
    await prisma.skill.upsert({
      where: { slug: slugify(skillSeed.name) },
      update: {
        name: skillSeed.name,
        description: skillSeed.description,
        isActive: true,
      },
      create: {
        name: skillSeed.name,
        slug: slugify(skillSeed.name),
        description: skillSeed.description,
      },
    });
  }

  const admin = await prisma.user.upsert({
    where: { email: "admin@nexo.local" },
    update: {
      name: "Admin NEXO",
      passwordHash,
      phone: "(79) 99999-0001",
      role: "ADMIN",
      isActive: true,
    },
    create: {
      email: "admin@nexo.local",
      name: "Admin NEXO",
      passwordHash,
      phone: "(79) 99999-0001",
      role: "ADMIN",
    },
  });

  await prisma.adminProfile.upsert({
    where: { userId: admin.id },
    update: { accessLevel: "OWNER" },
    create: {
      userId: admin.id,
      accessLevel: "OWNER",
    },
  });
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
