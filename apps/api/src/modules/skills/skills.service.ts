import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSkillDto } from "./dto/create-skill.dto";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  listActive() {
    return this.prisma.skill.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async create(dto: CreateSkillDto) {
    const slug = slugify(dto.name);
    const existing = await this.prisma.skill.findUnique({ where: { slug } });

    if (existing) {
      throw new ConflictException("Skill already exists");
    }

    return this.prisma.skill.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
      },
    });
  }
}
