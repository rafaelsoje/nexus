import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RealPaymentGateway } from "./real-payment.gateway";

@Injectable()
export class PagarmePaymentGateway extends RealPaymentGateway {
  constructor(private readonly config: ConfigService) {
    super();
  }

  protected override notConfigured(): never {
    const hasSecretKey = Boolean(this.config.get<string>("PAGARME_SECRET_KEY"));

    throw new ServiceUnavailableException(
      hasSecretKey
        ? "Pagar.me gateway structure is prepared, but live integration is not implemented yet"
        : "Pagar.me gateway secret key is not configured",
    );
  }
}
