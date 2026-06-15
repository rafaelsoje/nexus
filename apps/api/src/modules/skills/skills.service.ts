import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSkillDto } from "./dto/create-skill.dto";
import { UpdateSkillDto } from "./dto/update-skill.dto";

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
      orderBy: { createdAt: "desc" },
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

  async update(id: string, dto: UpdateSkillDto) {
    const skill = await this.prisma.skill.findUnique({ where: { id } });

    if (!skill || !skill.isActive) {
      throw new NotFoundException("Skill not found");
    }

    const name = dto.name?.trim();
    const description = dto.description?.trim();

    if (dto.name !== undefined && !name) {
      throw new BadRequestException("Skill name is required");
    }

    const data: { name?: string; slug?: string; description?: string } = {};

    if (name && name !== skill.name) {
      const slug = slugify(name);
      const existing = await this.prisma.skill.findFirst({
        where: {
          id: { not: id },
          OR: [{ name }, { slug }],
        },
      });

      if (existing) {
        throw new ConflictException("Skill already exists");
      }

      data.name = name;
      data.slug = slug;
    }

    if (dto.description !== undefined) {
      data.description = description || "";
    }

    return this.prisma.skill.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            freelancers: true,
            requirements: true,
          },
        },
      },
    });

    if (!skill || !skill.isActive) {
      throw new NotFoundException("Skill not found");
    }

    const hasUsage =
      skill._count.freelancers > 0 || skill._count.requirements > 0;

    if (!hasUsage) {
      await this.prisma.skill.delete({ where: { id } });
      return { deleted: true, deactivated: false };
    }

    await this.prisma.skill.update({
      where: { id },
      data: { isActive: false },
    });

    return { deleted: false, deactivated: true };
  }
}
