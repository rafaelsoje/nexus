import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { SetFreelancerSkillsDto } from "./dto/set-freelancer-skills.dto";
import { UpsertFreelancerProfileDto } from "./dto/upsert-freelancer-profile.dto";
import { FreelancersService } from "./freelancers.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("freelancers")
export class FreelancersController {
  constructor(private readonly freelancersService: FreelancersService) {}

  @Roles(UserRole.FREELANCER)
  @Post("profile")
  createProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpsertFreelancerProfileDto,
  ) {
    return this.freelancersService.upsertMyProfile(user.sub, dto);
  }

  @Roles(UserRole.FREELANCER)
  @Patch("profile")
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpsertFreelancerProfileDto,
  ) {
    return this.freelancersService.upsertMyProfile(user.sub, dto);
  }

  @Roles(UserRole.FREELANCER)
  @Get("profile")
  myProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.freelancersService.findMyPrivateProfile(user.sub);
  }

  @Roles(UserRole.FREELANCER)
  @Post("skills")
  setSkills(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SetFreelancerSkillsDto,
  ) {
    return this.freelancersService.setMySkills(user.sub, dto);
  }

  @Roles(UserRole.COMPANY, UserRole.ADMIN)
  @Get()
  listPublicProfiles() {
    return this.freelancersService.listPublicProfiles();
  }

  @Roles(UserRole.COMPANY, UserRole.FREELANCER, UserRole.ADMIN)
  @Get(":id/public")
  publicProfile(@Param("id") id: string) {
    return this.freelancersService.findPublicProfile(id);
  }
}
