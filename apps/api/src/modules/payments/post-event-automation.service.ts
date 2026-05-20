import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaymentsService } from "./payments.service";

@Injectable()
export class PostEventAutomationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PostEventAutomationService.name);
  private interval?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    private readonly paymentsService: PaymentsService,
  ) {}

  onModuleInit() {
    if (!this.isEnabled()) {
      return;
    }

    const intervalMs = this.getIntervalMs();
    this.interval = setInterval(() => {
      void this.run();
    }, intervalMs);

    void this.run();
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async run(now = new Date()) {
    try {
      const result = await this.paymentsService.processPostEventAutomation(now);

      if (result.reminders.sent > 0 || result.releases.released > 0) {
        this.logger.log(
          `Post-event automation sent ${result.reminders.sent} reminder(s) and released ${result.releases.released} payment(s).`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error("Post-event automation failed", error);
      throw error;
    }
  }

  private isEnabled() {
    return (
      this.config.get<string>("POST_EVENT_AUTOMATION_ENABLED", "true") !==
      "false"
    );
  }

  private getIntervalMs() {
    const configured = Number(
      this.config.get<string | number>(
        "POST_EVENT_AUTOMATION_INTERVAL_MS",
        60 * 60 * 1000,
      ),
    );

    return Number.isFinite(configured) && configured > 0
      ? configured
      : 60 * 60 * 1000;
  }
}
