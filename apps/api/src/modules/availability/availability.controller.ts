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
import { AvailabilityService } from "./availability.service";
import { CreateAvailabilityDto } from "./dto/create-availability.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FREELANCER)
@Controller("availability")
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.availabilityService.listMine(user.sub);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.availabilityService.create(user.sub, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.availabilityService.update(user.sub, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.availabilityService.remove(user.sub, id);
  }
}
