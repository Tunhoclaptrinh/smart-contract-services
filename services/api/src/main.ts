import { NestExpressApplication } from "@nestjs/platform-express";
import "reflect-metadata";
import { config as loadEnv } from "dotenv";
import {
  Module,
  Controller,
  Get,
  Inject,
  BadRequestException,
  PayloadTooLargeException,
} from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { NestFactory, APP_GUARD } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { Repository } from "./common/repository";
import { BaseService } from "./common/services/base.service";
import { BaseController } from "./common/controllers/base.controller";
import { AuthService, AuthGuard, AuthController } from "./auth";
import { RolesGuard } from "./common/guards/roles.guard";
import { Public } from "./common/decorators/roles.decorator";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { PermissionsController } from "./permissions.controller";
import { auditContext } from "./common/audit-events";
import { AuditReadsInterceptor } from "./common/audit-http";
import { AuditExportController } from "./common/audit-export";
process.env.REPO_ROOT ??= resolve(__dirname, "../../..");
loadEnv({ path: resolve(process.env.REPO_ROOT, ".env") });
process.chdir(process.env.REPO_ROOT);
@Controller("health")
class HealthController {
  constructor(@Inject(Repository) private repo: Repository) {}
  @Public() @Get() health() {
    return { status: "ok", storage: this.repo.driver };
  }
}
@Module({
  controllers: [
    AuditExportController,
    HealthController,
    AuthController,
    BaseController,
    PermissionsController,
  ],
  providers: [
    Repository,
    BaseService,
    AuthService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
class ApplicationModule {}
async function main() {
  const app =
    await NestFactory.create<NestExpressApplication>(ApplicationModule);
  // A complete 128-rule revision exceeds Express's default 100 KB JSON limit.
  app.useBodyParser("json", { limit: "4mb" });
  // Normalize parser errors before Nest maps SyntaxError to its implementation message.
  app.use(
    (
      error: { type?: string },
      _req: Request,
      _res: Response,
      next: NextFunction,
    ) => {
      if (error.type === "entity.parse.failed")
        return next(new BadRequestException("INVALID_JSON"));
      if (error.type === "entity.too.large")
        return next(new PayloadTooLargeException("PAYLOAD_TOO_LARGE"));
      next(error);
    },
  );
  await app.get(Repository).init();
  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: process.env.WEB_ORIGIN ? process.env.WEB_ORIGIN.split(",") : true,
  });
  app.use((req: any, res: any, next: () => void) => {
    if (req.path === "/healthz") {
      res.status(200).send("ok\n");
      return;
    }
    req.requestId = randomUUID();
    res.setHeader("x-request-id", req.requestId);
    auditContext.run(
      { requestId: req.requestId, method: req.method, path: req.path },
      next,
    );
  });
  app.useGlobalFilters(new AllExceptionsFilter(app.get(Repository)));
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
    new AuditReadsInterceptor(app.get(Repository), app.get(BaseService)),
  );
  // Seed organisations and accounts; production seeds only with an explicit seed password.
  if (process.env.NODE_ENV !== "production" || process.env.SEED_PASSWORD)
    await app.get(AuthService).seed();
  const config = new DocumentBuilder()
    .setTitle("Smart Contract API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    "api/docs",
    app,
    SwaggerModule.createDocument(app, config),
  );
  app.enableShutdownHooks();

  // Cloud PaaS (Render, Koyeb, Railway, Cloud Run) supply PORT and expect 0.0.0.0.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);
  const host =
    process.env.API_HOST ?? (process.env.PORT ? "0.0.0.0" : "127.0.0.1");
  await app.listen(port, host);
}
void main();
