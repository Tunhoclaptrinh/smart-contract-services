import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";
import { problemBody, verifyActorTokenAsync } from "@sc/nest-common";

/**
 * The API gateway (MS-R4): the only entry point of the system. It routes by path prefix, applies
 * policies (token check, rate limit, CORS, request id, timeouts) and holds no business rule: it
 * never reads a body and never imports service code. JWT check here is layer 1 (MS-B2); every
 * service checks again (layer 2) and scopes the data (layer 3).
 */
export interface Route {
  prefix: string;
  service: string;
}
export interface GatewayConfig {
  routes: Route[];
  /** "METHOD /path" or "METHOD /path/*" that pass without a token. */
  public: string[];
  /** service name → base URL (http://identity:3001). */
  targets: Record<string, string | undefined>;
  /** Allowed browser origins; empty: no CORS headers. */
  origins: string[];
  /** Requests per minute per client address. */
  rateLimit: number;
  /** Upstream answer deadline. */
  timeoutMs: number;
}

const json = (
  res: ServerResponse,
  status: number,
  body: unknown,
  type = "application/json",
) => {
  if (res.headersSent) return res.end();
  res.writeHead(status, { "content-type": type });
  res.end(JSON.stringify(body));
};
const problem = (
  res: ServerResponse,
  status: number,
  code: string,
  requestId: string,
  instance?: string,
) =>
  json(
    res,
    status,
    problemBody({ status, code, requestId, instance }),
    "application/problem+json",
  );

/** Longest matching prefix, on a segment boundary (`/api/v1/auth` ≠ `/api/v1/authors`). */
export function routeFor(routes: Route[], path: string): Route | undefined {
  return routes
    .filter((r) => path === r.prefix || path.startsWith(`${r.prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
}

export function isPublic(rules: string[], method: string, path: string) {
  return rules.some((rule) => {
    const [m, p] = rule.split(" ");
    if (m !== method) return false;
    return p.endsWith("/*")
      ? path.startsWith(p.slice(0, -1)) && path.length > p.length - 1
      : path === p;
  });
}

/** Fixed one-minute windows per client address. */
export class RateLimiter {
  private windows = new Map<string, { start: number; count: number }>();
  constructor(private limit: number) {}
  allow(client: string, now = Date.now()) {
    const w = this.windows.get(client);
    if (!w || now - w.start >= 60_000) {
      this.windows.set(client, { start: now, count: 1 });
      if (this.windows.size > 50_000)
        for (const [k, v] of this.windows)
          if (now - v.start >= 60_000) this.windows.delete(k);
      return true;
    }
    return ++w.count <= this.limit;
  }
}

const clientOf = (req: IncomingMessage) =>
  String(req.headers["x-forwarded-for"] ?? "")
    .split(",")[0]
    .trim() ||
  req.socket.remoteAddress ||
  "unknown";

/** Hop-by-hop headers are not forwarded (RFC 9110 §7.6.1). */
const HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
]);

export function createGateway(config: GatewayConfig) {
  const limiter = new RateLimiter(config.rateLimit);

  async function health(res: ServerResponse, requestId: string) {
    // The gateway is up; each upstream is asked for its own readiness, briefly.
    const services = await Promise.all(
      Object.entries(config.targets).map(async ([name, url]) => {
        if (!url) return [name, "not-configured"] as const;
        try {
          const r = await fetch(`${url}/api/v1/health`, {
            signal: AbortSignal.timeout(1500),
          });
          return [name, r.ok ? "ok" : `status-${r.status}`] as const;
        } catch {
          return [name, "down"] as const;
        }
      }),
    );
    json(res, 200, {
      success: true,
      data: {
        status: "ok",
        service: "gateway",
        upstreams: Object.fromEntries(services),
      },
      requestId,
    });
  }

  return createServer(async (req, res) => {
    const requestId =
      typeof req.headers["x-request-id"] === "string" &&
      /^[\w-]{8,100}$/.test(req.headers["x-request-id"])
        ? req.headers["x-request-id"]
        : randomUUID();
    res.setHeader("x-request-id", requestId);
    const url = new URL(req.url ?? "/", "http://gateway");
    const path = url.pathname;
    const method = req.method ?? "GET";

    const origin = req.headers.origin;
    if (origin && config.origins.includes(origin)) {
      res.setHeader("access-control-allow-origin", origin);
      res.setHeader("access-control-allow-credentials", "true");
      res.setHeader("vary", "origin");
      res.setHeader(
        "access-control-expose-headers",
        "x-request-id, content-disposition",
      );
    }
    if (method === "OPTIONS") {
      res.setHeader(
        "access-control-allow-methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      res.setHeader(
        "access-control-allow-headers",
        "authorization, content-type, x-request-id, idempotency-key",
      );
      res.setHeader("access-control-max-age", "600");
      res.writeHead(204);
      return res.end();
    }

    if (path === "/healthz") return json(res, 200, { status: "ok" });
    if (path === "/api/v1/health") return health(res, requestId);

    const client = clientOf(req);
    if (!limiter.allow(client))
      return problem(res, 429, "TOO_MANY_REQUESTS", requestId, path);

    const route = routeFor(config.routes, path);
    if (!route) return problem(res, 404, "ROUTE_NOT_FOUND", requestId, path);
    const target = config.targets[route.service];
    if (!target)
      return problem(res, 503, "UPSTREAM_NOT_CONFIGURED", requestId, path);

    // Layer 1: a valid access token, unless the route is public.
    if (!isPublic(config.public, method, path)) {
      const header = req.headers.authorization;
      if (!header?.startsWith("Bearer "))
        return problem(res, 401, "AUTHENTICATION_REQUIRED", requestId, path);
      try {
        await verifyActorTokenAsync(header.slice(7));
      } catch {
        return problem(res, 401, "INVALID_SESSION", requestId, path);
      }
    }

    const upstream = new URL(target);
    const headers: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(req.headers))
      if (value !== undefined && !HOP.has(key)) headers[key] = value;
    headers["x-request-id"] = requestId;
    headers["x-forwarded-for"] = req.headers["x-forwarded-for"]
      ? `${String(req.headers["x-forwarded-for"])}, ${req.socket.remoteAddress ?? ""}`
      : (req.socket.remoteAddress ?? "");
    headers["x-forwarded-host"] = String(req.headers.host ?? "");
    headers["x-forwarded-proto"] = "http";

    const proxied = httpRequest(
      {
        hostname: upstream.hostname,
        port: upstream.port || 80,
        method,
        path: `${path}${url.search}`,
        headers,
        timeout: config.timeoutMs,
      },
      (answer) => {
        const out: Record<string, string | string[]> = {};
        for (const [key, value] of Object.entries(answer.headers))
          if (value !== undefined && !HOP.has(key)) out[key] = value;
        res.writeHead(answer.statusCode ?? 502, out);
        answer.pipe(res);
      },
    );
    proxied.on("timeout", () => {
      proxied.destroy(new Error("timeout"));
      problem(res, 504, "UPSTREAM_TIMEOUT", requestId, path);
    });
    proxied.on("error", (error) => {
      if (error.message === "timeout") return;
      problem(res, 503, "UPSTREAM_UNAVAILABLE", requestId, path);
    });
    req.pipe(proxied);
  });
}
