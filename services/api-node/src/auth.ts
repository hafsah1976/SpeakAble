import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { RequestHandler } from "express";
import { AppError } from "./errors.js";
import type { Settings } from "./config.js";

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

export function authMiddleware(settings: Settings): RequestHandler {
  return async (request, _response, next) => {
    try {
      if (!settings.authRequired) {
        request.user = { id: "local-demo-user", authProvider: "local" };
        next();
        return;
      }

      if (!settings.authIssuer || !settings.authAudience) {
        throw new AppError(503, "AUTH_UNAVAILABLE", "Sign-in is temporarily unavailable.");
      }

      const token = readBearerToken(request.headers.authorization);
      if (!token) {
        throw new AppError(401, "UNAUTHORIZED", "Sign in to continue.");
      }

      jwks ??= createRemoteJWKSet(new URL(`${settings.authIssuer}/.well-known/jwks.json`));
      const verified = await jwtVerify(token, jwks, {
        issuer: settings.authIssuer
      });
      requireExpectedAudience(verified.payload, settings.authAudience);

      request.user = payloadToUser(verified.payload);
      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
        return;
      }

      next(new AppError(401, "UNAUTHORIZED", "Sign in to continue."));
    }
  };
}

function readBearerToken(header: string | undefined): string | undefined {
  if (!header?.startsWith("Bearer ")) {
    return undefined;
  }

  return header.slice("Bearer ".length).trim();
}

function payloadToUser(payload: JWTPayload) {
  const subject = typeof payload.sub === "string" && payload.sub ? payload.sub : undefined;
  if (!subject) {
    throw new AppError(401, "UNAUTHORIZED", "Sign in to continue.");
  }

  return {
    id: subject,
    email: typeof payload.email === "string" ? payload.email : undefined,
    authProvider: "jwt" as const
  };
}

export function tokenMatchesExpectedAudience(payload: JWTPayload, expectedAudience: string): boolean {
  const audienceValues = Array.isArray(payload.aud)
    ? payload.aud
    : typeof payload.aud === "string"
      ? [payload.aud]
      : [];
  const clientId = typeof payload.client_id === "string" ? payload.client_id : undefined;

  return audienceValues.includes(expectedAudience) || clientId === expectedAudience;
}

function requireExpectedAudience(payload: JWTPayload, expectedAudience: string): void {
  if (!tokenMatchesExpectedAudience(payload, expectedAudience)) {
    throw new AppError(401, "UNAUTHORIZED", "Sign in to continue.");
  }
}
