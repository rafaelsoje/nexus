import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RealPaymentGateway } from "./real-payment.gateway";

@Injectable()
export class AsaasPaymentGateway extends RealPaymentGateway {
  constructor(private readonly config: ConfigService) {
    super();
  }

  protected override notConfigured(): never {
    const hasApiKey = Boolean(this.config.get<string>("ASAAS_API_KEY"));

    throw new ServiceUnavailableException(
      hasApiKey
        ? "Asaas gateway structure is prepared, but live integration is not implemented yet"
        : "Asaas gateway API key is not configured",
    );
  }
}
