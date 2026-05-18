import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AdminService } from "./admin.service";
import { UpdateVerificationDto } from "./dto/update-verification.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("users")
  users() {
    return this.adminService.listUsers();
  }

  @Get("companies")
  companies() {
    return this.adminService.listCompanies();
  }

  @Get("freelancers")
  freelancers() {
    return this.adminService.listFreelancers();
  }

  @Get("events")
  events() {
    return this.adminService.listEvents();
  }

  @Get("payments")
  payments() {
    return this.adminService.listPayments();
  }

  @Get("disputes")
  disputes() {
    return this.adminService.listDisputes();
  }

  @Patch("companies/:id/verification")
  verifyCompany(@Param("id") id: string, @Body() dto: UpdateVerificationDto) {
    return this.adminService.updateCompanyVerification(id, dto.status);
  }

  @Patch("freelancers/:id/verification")
  verifyFreelancer(
    @Param("id") id: string,
    @Body() dto: UpdateVerificationDto,
  ) {
    return this.adminService.updateFreelancerVerification(id, dto.status);
  }
}
