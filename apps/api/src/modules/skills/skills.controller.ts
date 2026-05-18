import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateSkillDto } from "./dto/create-skill.dto";
import { SkillsService } from "./skills.service";

@Controller("skills")
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  listActive() {
    return this.skillsService.listActive();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateSkillDto) {
    return this.skillsService.create(dto);
  }
}
