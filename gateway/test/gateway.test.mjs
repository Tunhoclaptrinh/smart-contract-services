// The gateway: routing, public routes, token check (layer 1), 503/504, rate limit, CORS, trace.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const keys = mkdtempSync(join(tmpdir(), "gw-jwt-"));
process.env.JWT_KEY_DIR = keys;
const { signActorToken } = await import("@sc/nest-common");
const { createGateway, routeFor, isPublic } =
  await import("../dist/gateway.js");

let upstream, gateway, base;
const seen = [];
const listen = (server) =>
  new Promise((done) =>
    server.listen(0, "127.0.0.1", () => done(server.address().port)),
  );
before(async () => {
  upstream = createServer((req, res) => {
    seen.push({ url: req.url, headers: req.headers });
    if (req.url.startsWith("/api/v1/auth/slow"))
      return setTimeout(() => res.end("{}"), 400);
    res.writeHead(200, {
      "content-type": "application/json",
      "set-cookie": "a=b",
    });
    res.end(JSON.stringify({ success: true, data: { path: req.url } }));
  });
  const upPort = await listen(upstream);
  gateway = createGateway({
    routes: [
      { prefix: "/api/v1/auth", service: "identity" },
      { prefix: "/api/v1/contracts", service: "contract" },
      { prefix: "/api/v1/missing", service: "nobody" },
    ],
    public: ["POST /api/v1/auth/login", "GET /api/v1/auth/invitations/*"],
    targets: {
      identity: `http://127.0.0.1:${upPort}`,
      contract: "http://127.0.0.1:1",
    },
    origins: ["http://web.test"],
    rateLimit: 30,
    timeoutMs: 200,
  });
  base = `http://127.0.0.1:${await listen(gateway)}`;
});
after(() => {
  for (const s of [upstream, gateway]) {
    s.closeAllConnections();
    s.close();
  }
  rmSync(keys, { recursive: true, force: true });
});
const token = () =>
  signActorToken({
    id: "u1",
    email: "a@x.vn",
    displayName: "A",
    role: "SYSTEM_ADMIN",
    organizationId: "OPS",
    roleChipOrganization: "OPS",
    partyId: null,
    title: "",
    permissions: [],
  });

test("routing takes the longest prefix on a segment boundary", () => {
  const routes = [
    { prefix: "/api/v1/auth", service: "a" },
    { prefix: "/api/v1/auth/admin", service: "b" },
  ];
  assert.equal(routeFor(routes, "/api/v1/auth/admin/x").service, "b");
  assert.equal(routeFor(routes, "/api/v1/auth").service, "a");
  assert.equal(routeFor(routes, "/api/v1/authors"), undefined);
  assert.equal(isPublic(["GET /a/*"], "GET", "/a/b"), true);
  assert.equal(isPublic(["GET /a/*"], "GET", "/a/"), false);
  assert.equal(isPublic(["GET /a/*"], "POST", "/a/b"), false);
});

test("public routes pass without a token; others need a valid one", async () => {
  const open = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    body: "{}",
  });
  assert.equal(open.status, 200);
  assert.equal(open.headers.get("set-cookie"), "a=b");
  const closed = await fetch(`${base}/api/v1/auth/me`);
  assert.equal(closed.status, 401);
  assert.match(closed.headers.get("content-type"), /problem\+json/);
  assert.equal((await closed.json()).code, "AUTHENTICATION_REQUIRED");
  const forged = await fetch(`${base}/api/v1/auth/me`, {
    headers: { authorization: `Bearer ${token().slice(0, -3)}abc` },
  });
  assert.equal((await forged.json()).code, "INVALID_SESSION");
  const ok = await fetch(`${base}/api/v1/auth/me?x=1`, {
    headers: {
      authorization: `Bearer ${token()}`,
      "x-request-id": "trace-12345678",
    },
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("x-request-id"), "trace-12345678");
  const last = seen.at(-1);
  assert.equal(last.url, "/api/v1/auth/me?x=1");
  assert.equal(last.headers["x-request-id"], "trace-12345678");
  assert.ok(last.headers["x-forwarded-for"]);
});

test("unknown routes 404, unreachable 503, slow 504, unconfigured 503", async () => {
  const auth = { headers: { authorization: `Bearer ${token()}` } };
  assert.equal((await fetch(`${base}/api/v1/nowhere`)).status, 404);
  const down = await fetch(`${base}/api/v1/contracts/1`, auth);
  assert.equal(down.status, 503);
  assert.equal((await down.json()).code, "UPSTREAM_UNAVAILABLE");
  const slow = await fetch(`${base}/api/v1/auth/slow`, auth);
  assert.equal(slow.status, 504);
  assert.equal((await slow.json()).code, "UPSTREAM_TIMEOUT");
  assert.equal((await fetch(`${base}/api/v1/missing/x`, auth)).status, 503);
});

test("CORS answers allowed origins only", async () => {
  const pre = await fetch(`${base}/api/v1/auth/login`, {
    method: "OPTIONS",
    headers: { origin: "http://web.test" },
  });
  assert.equal(pre.status, 204);
  assert.equal(
    pre.headers.get("access-control-allow-origin"),
    "http://web.test",
  );
  assert.equal(pre.headers.get("access-control-allow-credentials"), "true");
  const other = await fetch(`${base}/api/v1/auth/login`, {
    method: "OPTIONS",
    headers: { origin: "http://evil.test" },
  });
  assert.equal(other.headers.get("access-control-allow-origin"), null);
});

test("each client address has its own request budget", async () => {
  let limited = 0;
  for (let i = 0; i < 40; i++) {
    const r = await fetch(`${base}/api/v1/auth/login`, {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.7" },
    });
    if (r.status === 429) limited++;
  }
  assert.ok(limited > 0);
  const other = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "x-forwarded-for": "198.51.100.8" },
  });
  assert.equal(other.status, 200);
});
