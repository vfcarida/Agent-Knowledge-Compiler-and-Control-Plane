import type { Request, Response, NextFunction } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function createCsrfMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }

    // For mutations, require either:
    // 1. X-Requested-With header (AJAX only, blocked by CORS for cross-origin)
    // 2. Content-Type: application/json (not sendable by standard forms)
    const contentType = req.headers["content-type"];
    const xRequestedWith = req.headers["x-requested-with"];

    if (
      !xRequestedWith &&
      !(contentType && contentType.includes("application/json"))
    ) {
      res.status(403).json({ error: "CSRF validation failed" });
      return;
    }

    next();
  };
}
