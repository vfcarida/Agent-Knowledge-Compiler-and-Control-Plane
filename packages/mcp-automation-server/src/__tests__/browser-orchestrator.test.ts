import { describe, it, expect, vi } from "vitest";
import { BrowserOrchestrator } from "../automation/browser-orchestrator.js";
import type { CareerContext } from "@akcp/core";
import { chromium } from "playwright";

vi.mock("playwright", () => ({
  chromium: {
    launch: vi.fn(),
  },
}));

describe("BrowserOrchestrator", () => {
  const dummyContext: CareerContext = {
    skills: [],
    experiences: [],
    education: [],
    certificates: [],
    projects: [],
    preferences: [],
    applications: [],
  };

  it("throws error if siteAutomationConsent is not explicitly true", async () => {
    const orchestrator = new BrowserOrchestrator();
    await expect(
      orchestrator.orchestrate(
        "https://www.linkedin.com/jobs/view/123",
        dummyContext,
      ),
    ).rejects.toThrow(/siteAutomationConsent must be explicitly true/);
  });

  it("throws PlatformNotSupportedError for unsupported domains", async () => {
    const orchestrator = new BrowserOrchestrator();
    await expect(
      orchestrator.orchestrate(
        "https://unsupported-job-board.xyz/job/123",
        dummyContext,
        { siteAutomationConsent: true },
      ),
    ).rejects.toThrow(/not supported yet/);
  });

  it("orchestrates supported application flow using strategy and cleans up browser", async () => {
    const mockPage = { goto: vi.fn() };
    const mockContext = { newPage: vi.fn().mockResolvedValue(mockPage) };
    const mockBrowser = {
      newContext: vi.fn().mockResolvedValue(mockContext),
      close: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(chromium.launch).mockResolvedValue(mockBrowser as any);

    const orchestrator = new BrowserOrchestrator();
    const customStrategy = {
      supports: (url: string) => url.includes("custom-platform.com"),
      apply: vi.fn().mockResolvedValue({
        success: true,
        platform: "CustomPlatform",
        jobTitle: "Staff Engineer",
        company: "Acme",
        appliedAt: new Date().toISOString(),
        logs: ["Navigated to job"],
      }),
    };
    orchestrator.registerStrategy(customStrategy);

    const result = await orchestrator.orchestrate(
      "https://custom-platform.com/jobs/456",
      dummyContext,
      { siteAutomationConsent: true, dryRun: true },
    );

    expect(result.success).toBe(true);
    expect(result.platform).toBe("CustomPlatform");
    expect(customStrategy.apply).toHaveBeenCalledWith(
      mockPage,
      dummyContext,
      "https://custom-platform.com/jobs/456",
      true,
    );
    expect(mockBrowser.close).toHaveBeenCalled();
  });
});
