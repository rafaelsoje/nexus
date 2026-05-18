import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { AvailabilityModule } from "./modules/availability/availability.module";
import { CompaniesModule } from "./modules/companies/companies.module";
import { ContractsModule } from "./modules/contracts/contracts.module";
import { EventsModule } from "./modules/events/events.module";
import { FreelancersModule } from "./modules/freelancers/freelancers.module";
import { InvitationsModule } from "./modules/invitations/invitations.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { SkillsModule } from "./modules/skills/skills.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    FreelancersModule,
    SkillsModule,
    EventsModule,
    AvailabilityModule,
    InvitationsModule,
    ContractsModule,
  ],
})
export class AppModule {}
