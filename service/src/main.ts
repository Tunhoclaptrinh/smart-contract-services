import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import {
  BaseController,
  BaseService,
  bootstrapService,
  HealthController,
  PermissionsController,
  Repository,
  RolesGuard,
} from "@sc/nest-common";

/**
 * Service template. A service repository replaces this module with its own controllers and
 * providers; the chassis (@sc/nest-common) gives it storage, CRUD, errors and startup.
 */
@Module({
  controllers: [HealthController, BaseController, PermissionsController],
  providers: [
    Repository,
    BaseService,
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
class ServiceModule {}

void bootstrapService({ module: ServiceModule, name: "service" });
