import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { CompaniesModule } from "./modules/companies/companies.module";
import { FreelancersModule } from "./modules/freelancers/freelancers.module";
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
  ],
})
export class AppModule {}
