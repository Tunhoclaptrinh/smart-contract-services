import { Controller, Get, Inject } from "@nestjs/common";
import { Public } from "./decorators/roles.decorator";
import { Repository } from "./repository";

/** `GET /health`: the service is up and which storage it uses. Every service registers it. */
@Controller("health")
export class HealthController {
  constructor(@Inject(Repository) private repo: Repository) {}
  @Public() @Get() health() {
    return {
      status: "ok",
      service: process.env.SERVICE_NAME ?? "service",
      storage: this.repo.driver,
    };
  }
}
