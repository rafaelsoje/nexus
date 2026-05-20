import { Global, Module } from "@nestjs/common";
import { CompanyAccessService } from "./company-access.service";

@Global()
@Module({
  providers: [CompanyAccessService],
  exports: [CompanyAccessService],
})
export class CompanyAccessModule {}
