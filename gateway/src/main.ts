import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createGateway, type Route } from "./gateway";

/**
 * Starts the gateway. Routes come from gateway/routes.json; each service's address from its
 * <NAME>_URL variable (IDENTITY_URL…), tokens are checked with identity's JWKS (JWKS_URL).
 */
const file = JSON.parse(
  readFileSync(resolve(__dirname, "../routes.json"), "utf8"),
) as { routes: Route[]; public: string[] };
const services = [...new Set(file.routes.map((r) => r.service))];
const targets = Object.fromEntries(
  services.map((name) => [
    name,
    process.env[`${name.toUpperCase().replace(/-/g, "_")}_URL`],
  ]),
);
if (!process.env.JWKS_URL && targets.identity)
  process.env.JWKS_URL = `${targets.identity}/api/v1/.well-known/jwks.json`;

const port = Number(process.env.PORT ?? process.env.GATEWAY_PORT ?? 3000);
const host =
  process.env.GATEWAY_HOST ?? (process.env.PORT ? "0.0.0.0" : "127.0.0.1");
createGateway({
  routes: file.routes,
  public: file.public,
  targets,
  origins: (
    process.env.WEB_ORIGIN ?? "http://127.0.0.1:5173,http://localhost:5173"
  )
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  rateLimit: Number(process.env.GATEWAY_RATE_LIMIT ?? 600),
  timeoutMs: Number(process.env.GATEWAY_TIMEOUT_MS ?? 10_000),
}).listen(port, host, () =>
  console.log(`gateway on http://${host}:${port} → ${JSON.stringify(targets)}`),
);
