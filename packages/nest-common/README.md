# @sc/nest-common

The microservice chassis: infrastructure every service shares.

| Part                                        | What                                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `bootstrapService()`                        | Startup: `.env`, `/api/v1`, request id across services, one error format, response envelope, Swagger                           |
| `Repository`                                | File, MongoDB or PostgreSQL storage; every write is one transaction with a sealed audit entry                                  |
| `BaseService`, `BaseController`             | Generic resource CRUD from `packages/contracts/resources.json`: filters, search, paging, versions, import/export, tenant scope |
| `permissions`, `RolesGuard`, roles          | The permission matrix (`packages/contracts/permissions.json`)                                                                  |
| `HealthController`, `PermissionsController` | `GET /health`, `GET /permissions`                                                                                              |

**Boundary: infrastructure only.** No business types (contract, milestone, payment), no business
rules, no tables another service reads. A change here reaches every service, so business code
belongs in the service's own repository; otherwise the services become a distributed monolith.
