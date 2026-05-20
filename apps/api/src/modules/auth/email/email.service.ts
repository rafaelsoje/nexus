import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type PasswordResetEmail = {
  email: string;
  name: string;
  resetToken: string;
  expiresInMinutes: number;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendPasswordResetEmail(input: PasswordResetEmail) {
    const provider = this.config.get<string>("EMAIL_PROVIDER") ?? "local";

    if (provider !== "local") {
      throw new Error(`Email provider "${provider}" is not implemented`);
    }

    this.logger.log(
      `Password reset token for ${input.email} (${input.name}) expires in ${input.expiresInMinutes} minutes: ${input.resetToken}`,
    );
  }

  shouldExposeDevTokens() {
    return this.config.get<string>("EMAIL_EXPOSE_DEV_TOKENS") === "true";
  }
}
