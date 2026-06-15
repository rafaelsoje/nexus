import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NextFunction, Request, Response, json, urlencoded } from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const isProduction = config.get<string>("NODE_ENV") === "production";
  const allowedOrigins = getAllowedOrigins(config);

  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  app.getHttpAdapter().getInstance().disable("x-powered-by");
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  });
  app.use(createRateLimitMiddleware(config, isProduction));
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
    response.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );

    if (isProduction) {
      response.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains",
      );
    }

    next();
  });
  app.use(json({ limit: config.get<string>("JSON_BODY_LIMIT") ?? "8mb" }));
  app.use(
    urlencoded({
      extended: true,
      limit: config.get<string>("JSON_BODY_LIMIT") ?? "8mb",
    }),
  );
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(config.get<number>("PORT") ?? 3001);
}

bootstrap();

function getAllowedOrigins(config: ConfigService) {
  const configured =
    config.get<string>("WEB_ORIGINS") ??
    config.get<string>("WEB_ORIGIN") ??
    "http://localhost:3000";

  return configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function createRateLimitMiddleware(
  config: ConfigService,
  isProduction: boolean,
) {
  const windowMs = getPositiveNumber(
    config.get<string | number>("RATE_LIMIT_WINDOW_MS"),
    60_000,
  );
  const maxRequests = getPositiveNumber(
    config.get<string | number>("RATE_LIMIT_MAX_REQUESTS"),
    isProduction ? 300 : 1_000,
  );
  const entries = new Map<string, { count: number; resetAt: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of entries.entries()) {
      if (value.resetAt <= now) {
        entries.delete(key);
      }
    }
  }, windowMs).unref();

  return (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now();
    const key = request.ip || request.socket.remoteAddress || "unknown";
    const current = entries.get(key);

    if (!current || current.resetAt <= now) {
      entries.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    current.count += 1;
    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);

    response.setHeader("X-RateLimit-Limit", String(maxRequests));
    response.setHeader(
      "X-RateLimit-Remaining",
      String(Math.max(maxRequests - current.count, 0)),
    );
    response.setHeader("X-RateLimit-Reset", String(retryAfterSeconds));

    if (current.count > maxRequests) {
      response.setHeader("Retry-After", String(retryAfterSeconds));
      response.status(429).json({
        statusCode: 429,
        message: "Too many requests",
      });
      return;
    }

    next();
  };
}

function getPositiveNumber(value: string | number | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
