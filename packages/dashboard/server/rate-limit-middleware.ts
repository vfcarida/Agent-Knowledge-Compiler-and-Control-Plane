import type { Request, Response, NextFunction } from "express";

export function createRateLimitMiddleware(options: {
  windowMs: number;
  maxRequests: number;
}) {
  const windows = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientId =
      (req.headers["x-forwarded-for"] as string) ||
      req.socket.remoteAddress ||
      "unknown";

    const now = Date.now();
    const window = windows.get(clientId);

    if (!window || now > window.resetAt) {
      windows.set(clientId, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (window.count >= options.maxRequests) {
      res.setHeader(
        "Retry-After",
        String(Math.ceil((window.resetAt - now) / 1000)),
      );
      res.status(429).json({ error: "Rate limit exceeded" });
      return;
    }

    window.count++;
    next();
  };
}
