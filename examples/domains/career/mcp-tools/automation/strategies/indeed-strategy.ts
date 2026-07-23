/**
 * @module automation/strategies/indeed-strategy
 * @description Job application automation strategy for the Indeed platform.
 */

import type { Page } from "playwright";
import type { CareerContext } from "@akcp/core";
import type { IApplicationStrategy, ApplicationResult } from "../interfaces.js";
import {
  IndeedJobPage,
  IndeedApplicationWizard,
} from "../page-objects/indeed-pages.js";

export class IndeedStrategy implements IApplicationStrategy {
  /** @inheritdoc */
  supports(url: string): boolean {
    return url.includes("indeed.com") || url.includes(".indeed.com");
  }

  /** @inheritdoc */
  async apply(
    page: Page,
    _careerContext: CareerContext,
    url: string,
    dryRun?: boolean,
  ): Promise<ApplicationResult> {
    const platform = "Indeed";
    const errors: string[] = [];

    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);

      const jobPage = new IndeedJobPage(page);
      const jobTitle = await jobPage.getJobTitle();
      const company = await jobPage.getCompanyName();

      // Click Apply
      await jobPage.clickApplyNow();

      const wizard = new IndeedApplicationWizard(page);
      const isReadyToSubmit = await wizard.proceedThroughForm();

      if (!isReadyToSubmit) {
        throw new Error(
          "Failed to proceed through Indeed application form steps automatically.",
        );
      }

      if (dryRun) {
        return {
          success: true,
          platform,
          jobTitle,
          company,
          submittedAt: new Date().toISOString(),
          errors: [
            "Dry run completed successfully. Indeed form filled but not submitted.",
          ],
        };
      }

      // Submit
      await wizard.submitButton.click();
      await page.waitForTimeout(3000);

      return {
        success: true,
        platform,
        jobTitle,
        company,
        submittedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      return {
        success: false,
        platform,
        jobTitle: "Unknown Position",
        company: "Unknown Company",
        submittedAt: new Date().toISOString(),
        errors,
      };
    }
  }
}
