/**
 * @module automation/page-objects/linkedin-pages
 * @description Page Object Models for LinkedIn Job Application automation.
 */

import type { Locator, Page } from "playwright";

/**
 * POM representing the LinkedIn Login Page.
 */
export class LinkedInLoginPage {
  private readonly page: Page;
  public readonly usernameInput: Locator;
  public readonly passwordInput: Locator;
  public readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator("#username");
    this.passwordInput = page.locator("#password");
    this.submitButton = page.locator('button[type="submit"]');
  }

  /**
   * Perform login actions.
   *
   * > [!IMPORTANT]
   * > **Playwright Credential Management Strategy**:
   * > To minimize security risks and avoid triggering LinkedIn's bot-detection
   * > mechanisms (which frequently display CAPTCHAs during login), the recommended
   * > strategy is to **run Playwright with a persistent user profile directory**
   * > (e.g., `chromium.launchPersistentContext(userDataDir)`) or **inject cookies**
   * > from an authenticated browser session, rather than typing credentials.
   * > This method remains as a fallback.
   */
  async login(username: string, pass: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
    await this.page.waitForNavigation({ waitUntil: "networkidle" });
  }
}

/**
 * POM representing a LinkedIn Job Listing page.
 */
export class LinkedInJobPage {
  public readonly easyApplyButton: Locator;
  public readonly applyButton: Locator;
  public readonly jobTitleHeader: Locator;
  public readonly companyNameLink: Locator;

  constructor(page: Page) {
    this.easyApplyButton = page.locator(
      'button.jobs-apply-button:has-text("Easy Apply")',
    );
    this.applyButton = page.locator(
      'button.jobs-apply-button:has-text("Apply")',
    );
    this.jobTitleHeader = page.locator(
      ".job-details-jobs-unified-top-card__job-title",
    );
    this.companyNameLink = page.locator(
      ".job-details-jobs-unified-top-card__company-name a",
    );
  }

  async getJobTitle(): Promise<string> {
    if (await this.jobTitleHeader.isVisible()) {
      return (
        (await this.jobTitleHeader.textContent())?.trim() ?? "Unknown Position"
      );
    }
    return "Unknown Position";
  }

  async getCompanyName(): Promise<string> {
    if (await this.companyNameLink.isVisible()) {
      return (
        (await this.companyNameLink.textContent())?.trim() ?? "Unknown Company"
      );
    }
    return "Unknown Company";
  }
}

/**
 * POM representing the LinkedIn "Easy Apply" multi-step dialog.
 */
export class LinkedInEasyApplyDialog {
  private readonly page: Page;
  public readonly nextButton: Locator;
  public readonly reviewButton: Locator;
  public readonly submitButton: Locator;
  public readonly closeButton: Locator;
  public readonly progressIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nextButton = page.getByRole("button", { name: /Next/i });
    this.reviewButton = page.getByRole("button", { name: /Review/i });
    this.submitButton = page.getByRole("button", {
      name: /Submit application/i,
    });
    this.closeButton = page.getByRole("button", { name: /Dismiss/i });
    this.progressIndicator = page.locator(".jobs-easy-apply-modal__progress");
  }

  /**
   * Loop through multi-step dialog screens answering basic questions or clicking Next.
   * Scaffolding: logs what it encounters and proceeds safely.
   */
  async fillApplicationSteps(): Promise<boolean> {
    let stepsLeft = 10; // safety limit to prevent infinite loops

    while (stepsLeft > 0) {
      stepsLeft--;

      if (await this.submitButton.isVisible()) {
        // Ready to submit
        return true;
      }

      if (await this.reviewButton.isVisible()) {
        await this.reviewButton.click();
        await this.page.waitForTimeout(1000);
        continue;
      }

      if (await this.nextButton.isVisible()) {
        await this.nextButton.click();
        await this.page.waitForTimeout(1000);
        continue;
      }

      // If no buttons are visible but modal is open, we might be blocked or at an unhandled step
      break;
    }

    return false;
  }
}
