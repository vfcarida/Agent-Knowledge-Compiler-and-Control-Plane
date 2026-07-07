/**
 * @module automation/page-objects/indeed-pages
 * @description Page Object Models for Indeed Job Application automation.
 */

import type { Locator, Page } from 'playwright';

/**
 * POM representing the Indeed Login page.
 */
export class IndeedLoginPage {
  private readonly page: Page;
  public readonly emailInput: Locator;
  public readonly passwordInput: Locator;
  public readonly continueButton: Locator;
  public readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#ifl-InputFormField-3, input[type="email"]');
    this.passwordInput = page.locator('#ifl-InputFormField-15, input[type="password"]');
    this.continueButton = page.locator('button[type="submit"]');
    this.submitButton = page.locator('button[type="submit"]');
  }

  /**
   * > [!IMPORTANT]
   * > **Indeed Credential Strategy**:
   * > Indeed blocks programmatic login attempts with aggressive CAPTCHAs.
   * > Candidates are strongly advised to inject session cookies or run with a active, logged-in browser profile directory.
   */
  async login(email: string, pass: string): Promise<void> {
    if (await this.emailInput.isVisible()) {
      await this.emailInput.fill(email);
      await this.continueButton.click();
      await this.page.waitForTimeout(1000);
    }
    if (await this.passwordInput.isVisible()) {
      await this.passwordInput.fill(pass);
      await this.submitButton.click();
      await this.page.waitForNavigation({ waitUntil: 'networkidle' });
    }
  }
}

/**
 * POM representing an Indeed Job listing page.
 */
export class IndeedJobPage {
  private readonly page: Page;
  public readonly applyNowButton: Locator;
  public readonly jobTitleHeader: Locator;
  public readonly companyNameHeader: Locator;

  constructor(page: Page) {
    this.page = page;
    // Indeed typically has an "Apply Now" (Candidatar-se agora) button
    this.applyNowButton = page.locator('#indeedApplyButton, .indeed-apply-button');
    this.jobTitleHeader = page.locator('.jobsearch-JobInfoHeader-title-container h1');
    this.companyNameHeader = page.locator('[data-company-name="true"], .jobsearch-CompanyInfoWithoutHeaderImage a');
  }

  async getJobTitle(): Promise<string> {
    if (await this.jobTitleHeader.isVisible()) {
      return (await this.jobTitleHeader.textContent())?.trim() ?? 'Unknown Position';
    }
    return 'Unknown Position';
  }

  async getCompanyName(): Promise<string> {
    if (await this.companyNameHeader.isVisible()) {
      return (await this.companyNameHeader.first().textContent())?.trim() ?? 'Unknown Company';
    }
    return 'Unknown Company';
  }

  async clickApplyNow(): Promise<void> {
    await this.applyNowButton.click();
    await this.page.waitForTimeout(2000);
  }
}

/**
 * POM representing the Indeed multi-step application form.
 */
export class IndeedApplicationWizard {
  private readonly page: Page;
  public readonly nextButton: Locator;
  public readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nextButton = page.locator('button:has-text("Continue"), button:has-text("Continuar")');
    this.submitButton = page.locator('button:has-text("Submit application"), button:has-text("Enviar candidatura")');
  }

  async proceedThroughForm(): Promise<boolean> {
    let steps = 6;
    while (steps > 0) {
      steps--;

      if (await this.submitButton.isVisible()) {
        return true;
      }

      if (await this.nextButton.isVisible()) {
        await this.nextButton.click();
        await this.page.waitForTimeout(1500);
        continue;
      }

      break;
    }
    return false;
  }
}
