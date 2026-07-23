import type { Request, Response, NextFunction } from "express";
import { jwtVerify } from "jose";

export interface DashboardAuthConfig {
  jwtSecret?: string;
  issuer?: string;
  audience?: string;
  sessionTtl?: number;
}

export function createAuthMiddleware(config: DashboardAuthConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!config.jwtSecret) {
      // Allow fallback to anonymous if no secret is configured (for local dev)
      if (authHeader && authHeader.startsWith("Bearer ")) {
        (req as any).user = { identity: authHeader.substring(7) };
      } else {
        (req as any).user = { identity: "anonymous" };
      }
      return next();
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing authorization header" });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const secret = new TextEncoder().encode(config.jwtSecret);
      const { payload } = await jwtVerify(token, secret, {
        issuer: config.issuer,
        audience: config.audience,
        maxTokenAge: config.sessionTtl ? `${config.sessionTtl}s` : "1h",
      });

      (req as any).user = {
        identity: payload.sub || payload.email || "authenticated-user",
      };
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}
