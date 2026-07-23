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
    options: { headless?: boolean; dryRun?: boolean } = {},
  ): Promise<ApplicationResult> {
    // 1. Identify strategy
    const strategy = this.strategies.find((strat) => strat.supports(url));

    if (!strategy) {
      throw new PlatformNotSupportedError(url);
    }

    const browser = await chromium.launch({
      headless: options.headless ?? true,
    });

    try {
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      });
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
