import { PrismaClient } from "@prisma/client";

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
