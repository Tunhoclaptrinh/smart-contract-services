import "reflect-metadata";
import { Controller, Get, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

@Controller("health")
class HealthController {
  @Get() health() {
    return { status: "ok" };
  }
}

@Module({ controllers: [HealthController] })
class ApplicationModule {}

async function main() {
  const app = await NestFactory.create(ApplicationModule);
  app.setGlobalPrefix("api/v1");
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);
  await app.listen(port, process.env.API_HOST ?? "127.0.0.1");
}
void main();
