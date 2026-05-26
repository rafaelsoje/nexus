import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { AvailabilityModule } from "./modules/availability/availability.module";
import { AdminModule } from "./modules/admin/admin.module";
import { ApplicationsModule } from "./modules/applications/applications.module";
import { ChatModule } from "./modules/chat/chat.module";
import { CompanyAccessModule } from "./modules/company-access/company-access.module";
import { CompaniesModule } from "./modules/companies/companies.module";
import { ContractsModule } from "./modules/contracts/contracts.module";
import { DisputesModule } from "./modules/disputes/disputes.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { EventsModule } from "./modules/events/events.module";
import { FreelancersModule } from "./modules/freelancers/freelancers.module";
import { GatewayAccountsModule } from "./modules/gateway-accounts/gateway-accounts.module";
import { HealthModule } from "./modules/health/health.module";
import { InvitationsModule } from "./modules/invitations/invitations.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { SkillsModule } from "./modules/skills/skills.module";
import { UsersModule } from "./modules/users/users.module";
import { WalletModule } from "./modules/wallet/wallet.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CompanyAccessModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    FreelancersModule,
    GatewayAccountsModule,
    SkillsModule,
    EventsModule,
    AvailabilityModule,
    InvitationsModule,
    ContractsModule,
    PaymentsModule,
    WalletModule,
    ReviewsModule,
    ReportsModule,
    NotificationsModule,
    DisputesModule,
    DocumentsModule,
    HealthModule,
    AdminModule,
    ApplicationsModule,
    ChatModule,
  ],
})
export class AppModule {}
