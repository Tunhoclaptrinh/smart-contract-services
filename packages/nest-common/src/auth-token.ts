import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import jwt from "jsonwebtoken";
import { auditContext } from "./audit-events";
import { permissionsFor } from "./permissions";
import type { Actor, Role } from "./types";

/**
 * Access tokens between services. Identity signs them; every other service checks the signature
 * with the same JWT_SECRET and reads the actor from the claims, without a call to identity.
 * Revocation (`tv`, the user's token version) is checked only by identity, so a revoked token
 * stays valid elsewhere until it expires: keep TOKEN_TTL short.
 */
export const TOKEN_ISSUER = "sc-identity";
export const TOKEN_AUDIENCE = "sc-web";
const DEV_SECRET = "dev-only-shared-secret-change-me-in-production";

/** One secret for all services; development uses a fixed one so local services agree. */
export function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production")
    throw new Error("JWT_SECRET is required");
  return DEV_SECRET;
}

interface ActorClaims extends jwt.JwtPayload {
  sub: string;
  tv: number;
  role: Role;
  org: string;
  chip: string;
  party: string | null;
  name: string;
  email: string;
  title: string;
}

export function signActorToken(actor: Actor, tokenVersion = 0) {
  const claims: Omit<ActorClaims, "sub"> = {
    tv: tokenVersion,
    role: actor.role,
    org: actor.organizationId,
    chip: actor.roleChipOrganization,
    party: actor.partyId,
    name: actor.displayName,
    email: actor.email,
    title: actor.title,
  };
  return jwt.sign(claims, jwtSecret(), {
    subject: actor.id,
    expiresIn: (process.env.TOKEN_TTL ?? "8h") as jwt.SignOptions["expiresIn"],
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });
}

/** The actor in a token, or UnauthorizedException("INVALID_SESSION"). */
export function verifyActorToken(token: string): {
  actor: Actor;
  tokenVersion: number;
} {
  try {
    const c = jwt.verify(token, jwtSecret(), {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    }) as ActorClaims;
    if (typeof c.sub !== "string" || typeof c.role !== "string")
      throw new Error("claims");
    return {
      tokenVersion: Number(c.tv ?? 0),
      actor: {
        id: c.sub,
        email: c.email,
        displayName: c.name,
        role: c.role,
        organizationId: c.org,
        roleChipOrganization: c.chip ?? c.org,
        partyId: c.party ?? null,
        title: c.title ?? "",
        permissions: permissionsFor(c.role),
        active: true,
      },
    };
  } catch {
    throw new UnauthorizedException("INVALID_SESSION");
  }
}

/** The bearer token of a request, or UnauthorizedException("AUTHENTICATION_REQUIRED"). */
export function bearerToken(header: string | undefined) {
  if (!header?.startsWith("Bearer "))
    throw new UnauthorizedException("AUTHENTICATION_REQUIRED");
  return header.slice(7);
}

/**
 * Global guard of every service except identity: `@Public()` routes pass, every other request
 * needs a valid token and gets `req.user` (and the audit actor) from its claims. Register it
 * before RolesGuard.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(Reflector) private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride("public", [
        ctx.getHandler(),
        ctx.getClass(),
      ])
    )
      return true;
    const req = ctx.switchToHttp().getRequest();
    req.user = verifyActorToken(bearerToken(req.headers.authorization)).actor;
    const context = auditContext.getStore();
    if (context) context.actor = req.user;
    return true;
  }
}
