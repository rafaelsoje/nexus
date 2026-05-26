import {
  Body,
  Controller,
  Delete,
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
import { UpdateFreelancerAvatarDto } from "./dto/update-freelancer-avatar.dto";
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
  @Patch("profile/avatar")
  updateAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateFreelancerAvatarDto,
  ) {
    return this.freelancersService.updateMyAvatar(user.sub, dto);
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
  listPublicProfiles(@CurrentUser() user: CurrentUserPayload) {
    return this.freelancersService.listPublicProfiles(user.sub, user.role);
  }

  @Roles(UserRole.COMPANY)
  @Get("favorites")
  listFavorites(@CurrentUser() user: CurrentUserPayload) {
    return this.freelancersService.listFavoriteFreelancers(user.sub);
  }

  @Roles(UserRole.COMPANY)
  @Post(":id/favorite")
  favorite(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.freelancersService.favoriteFreelancer(user.sub, id);
  }

  @Roles(UserRole.COMPANY)
  @Delete(":id/favorite")
  unfavorite(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.freelancersService.unfavoriteFreelancer(user.sub, id);
  }

  @Roles(UserRole.COMPANY, UserRole.FREELANCER, UserRole.ADMIN)
  @Get(":id/public")
  publicProfile(@Param("id") id: string) {
    return this.freelancersService.findPublicProfile(id);
  }
}
