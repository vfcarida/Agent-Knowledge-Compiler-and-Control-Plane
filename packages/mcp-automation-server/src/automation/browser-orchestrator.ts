/**
 * @module automation/browser-orchestrator
 * @description Launches browser sessions and routes applications to platform strategies.
 */

import { chromium } from "playwright";
import type { CareerContext } from "@akcp/core";
import type { IApplicationStrategy, ApplicationResult } from "./interfaces.js";
import { PlatformNotSupportedError } from "../errors.js";
import { LinkedInStrategy } from "./strategies/linkedin-strategy.js";
import { GupyStrategy } from "./strategies/gupy-strategy.js";
import { IndeedStrategy } from "./strategies/indeed-strategy.js";

export class BrowserOrchestrator {
  private readonly strategies: IApplicationStrategy[] = [];

  constructor() {
    // Register default platform strategies
    this.strategies.push(new LinkedInStrategy());
    this.strategies.push(new GupyStrategy());
    this.strategies.push(new IndeedStrategy());
  }

  /**
   * Register a custom application strategy.
   */
  registerStrategy(strategy: IApplicationStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Automatically select the strategy that supports the given URL,
   * launch a browser tab, run the application flow, and close the browser.
   *
   * @param url - The job listing / application page URL
   * @param careerContext - Candidate professional context from OKF files
   * @param options - Browser session options (e.g. headless, dryRun)
   */
  async orchestrate(
    url: string,
    careerContext: CareerContext,
    options: {
      headless?: boolean;
      dryRun?: boolean;
      siteAutomationConsent?: boolean;
    } = {},
  ): Promise<ApplicationResult> {
    // Per ADR-004 (Browser Automation Safety): automating a third-party site's
    // UI (login/apply forms) can violate that site's Terms of Service. Require
    // an explicit, per-call acknowledgment rather than proceeding silently —
    // this is a safeguard in addition to (not a replacement for) the HITL
    // approval gate already enforced by the caller (see server.ts).
    if (!options.siteAutomationConsent) {
      throw new Error(
        "Execution Blocked: siteAutomationConsent must be explicitly true. " +
          "Automating this job site's UI may violate its Terms of Service — " +
          "the caller must acknowledge this before any live browser automation runs.",
      );
    }

    // 1. Identify strategy
    const strategy = this.strategies.find((strat) => strat.supports(url));

    if (!strategy) {
      throw new PlatformNotSupportedError(url);
    }

    const browser = await chromium.launch({
      headless: options.headless ?? true,
    });

    try {
      // No spoofed user-agent / anti-detection evasion: ADR-004 mandates failing
      // gracefully against a target site's bot defenses rather than evading them.
      // Playwright's default (honest) Chromium UA is used as-is.
      const context = await browser.newContext();
      const page = await context.newPage();

      // 3. Execute application strategy
      const result = await strategy.apply(
        page,
        careerContext,
        url,
        options.dryRun,
      );
      return result;
    } finally {
      // 4. Close browser tab & context
      await browser.close();
    }
  }
}
