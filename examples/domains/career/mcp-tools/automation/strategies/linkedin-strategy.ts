/**
 * @module automation/strategies/linkedin-strategy
 * @description Job application automation strategy for the LinkedIn platform.
 */

import type { Page } from "playwright";
import type { CareerContext } from "@akcp/core";
import type { IApplicationStrategy, ApplicationResult } from "../interfaces.js";
import {
  LinkedInJobPage,
  LinkedInEasyApplyDialog,
} from "../page-objects/linkedin-pages.js";
import { AutomationError } from "../../errors.js";

export class LinkedInStrategy implements IApplicationStrategy {
  /** @inheritdoc */
  supports(url: string): boolean {
    return (
      url.includes("linkedin.com/jobs/") ||
      url.includes("linkedin.com/jobs/view/")
    );
  }

  /** @inheritdoc */
  async apply(
    page: Page,
    _careerContext: CareerContext,
    url: string,
    dryRun?: boolean,
  ): Promise<ApplicationResult> {
    const platform = "LinkedIn";
    const errors: string[] = [];

    try {
      // 1. Navigate to job posting
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);

      const jobPage = new LinkedInJobPage(page);
      const jobTitle = await jobPage.getJobTitle();
      const company = await jobPage.getCompanyName();

      // 2. Detect Easy Apply button
      const hasEasyApply = await jobPage.easyApplyButton.isVisible();

      if (!hasEasyApply) {
        throw new AutomationError(
          platform,
          "detect_easy_apply",
          "Only LinkedIn Easy Apply is currently supported for automated submission. " +
            'Standard "Apply" redirects to external pages, which cannot be reliably completed automatically.',
        );
      }

      // 3. Click Easy Apply
      await jobPage.easyApplyButton.click();
      await page.waitForTimeout(2000);

      const dialog = new LinkedInEasyApplyDialog(page);
      const filledSteps = await dialog.fillApplicationSteps();

      if (!filledSteps) {
        throw new AutomationError(
          platform,
          "fill_form_steps",
          "Could not complete job application form steps. Manual intervention required.",
        );
      }

      if (dryRun) {
        // Safe dismiss
        await dialog.closeButton.click();
        await page
          .locator(
            'button[data-control-name="discard_application_confirm_btn"]',
          )
          .click();
        return {
          success: true,
          platform,
          jobTitle,
          company,
          submittedAt: new Date().toISOString(),
          errors: [
            "Dry run completed successfully. Application form was filled but not submitted.",
          ],
        };
      }

      // 4. Click Submit
      await dialog.submitButton.click();
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
