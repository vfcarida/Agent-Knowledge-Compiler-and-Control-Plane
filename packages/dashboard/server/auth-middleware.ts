import type { Request, Response, NextFunction } from "express";
import { jwtVerify } from "jose";

export interface DashboardAuthConfig {
  jwtSecret?: string;
  issuer?: string;
  audience?: string;
  sessionTtl?: number;
  /**
   * Explicit opt-in required to run without real JWT verification. When true and
   * no jwtSecret is set, the raw Bearer header value is trusted as-is (no IdP
   * exists in this project) — never enable this in a real deployment.
   */
  allowDemoMode?: boolean;
}

export function createAuthMiddleware(config: DashboardAuthConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!config.jwtSecret) {
      if (!config.allowDemoMode) {
        res.status(401).json({
          error:
            "Unauthorized: no jwtSecret configured. Set DASHBOARD_JWT_SECRET, " +
            "or explicitly opt into unauthenticated demo mode with DASHBOARD_DEMO_MODE=true.",
        });
        return;
      }
      // Demo mode only: no real IdP exists in this project, so the client-supplied
      // identity string is trusted as-is. Never enable in a real deployment.
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
