import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get<string>("WEB_ORIGIN") ?? "http://localhost:3000",
    credentials: true,
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
