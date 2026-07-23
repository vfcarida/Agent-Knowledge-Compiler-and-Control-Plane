import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { SignJWT } from "jose";
import { createAuthMiddleware } from "../auth-middleware.js";
import { createCsrfMiddleware } from "../csrf-middleware.js";
import { createRateLimitMiddleware } from "../rate-limit-middleware.js";
import { createSecurityHeadersMiddleware } from "../security-headers.js";

function mockRes() {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

function mockReq(overrides = {}): Request {
  return {
    headers: {},
    method: "GET",
    socket: { remoteAddress: "127.0.0.1" },
    ...overrides,
  } as unknown as Request;
}

describe("Dashboard BFF Security", () => {
  const secret = "test-secret-12345678901234567890"; // min 32 chars
  const jwtSecret = new TextEncoder().encode(secret);

  describe("Auth Middleware", () => {
    const middleware = createAuthMiddleware({ jwtSecret: secret });

    it("rejects request without bearer token", async () => {
      const req = mockReq();
      const res = mockRes();
      const next = vi.fn();

      await middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("rejects request with invalid JWT", async () => {
      const req = mockReq({ headers: { authorization: "Bearer invalid" } });
      const res = mockRes();
      const next = vi.fn();

      await middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("accepts valid JWT", async () => {
      const token = await new SignJWT({ sub: "test-user" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(jwtSecret);

      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      const res = mockRes();
      const next = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect((req as any).user.identity).toBe("test-user");
    });
  });

  describe("CSRF Middleware", () => {
    const middleware = createCsrfMiddleware();

    it("allows SAFE methods", () => {
      const req = mockReq({ method: "GET" });
      const res = mockRes();
      const next = vi.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("blocks mutation without CSRF header", () => {
      const req = mockReq({ method: "POST" });
      const res = mockRes();
      const next = vi.fn();
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("allows mutation with X-Requested-With", () => {
      const req = mockReq({
        method: "POST",
        headers: { "x-requested-with": "XMLHttpRequest" },
      });
      const res = mockRes();
      const next = vi.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("allows mutation with application/json", () => {
      const req = mockReq({
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const res = mockRes();
      const next = vi.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("Rate Limit Middleware", () => {
    it("returns 429 after rate limit exceeded", () => {
      const middleware = createRateLimitMiddleware({
        windowMs: 1000,
        maxRequests: 2,
      });

      const req = mockReq();
      const res = mockRes();
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.setHeader).toHaveBeenCalledWith(
        "Retry-After",
        expect.any(String),
      );
    });
  });

  describe("Security Headers", () => {
    const middleware = createSecurityHeadersMiddleware();

    it("includes security headers in response", () => {
      const req = mockReq();
      const res = mockRes();
      const next = vi.fn();

      middleware(req, res, next);
      expect(res.setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY");
      expect(res.setHeader).toHaveBeenCalledWith(
        "X-Content-Type-Options",
        "nosniff",
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Security-Policy",
        expect.any(String),
      );
      expect(next).toHaveBeenCalled();
    });
  });
});
