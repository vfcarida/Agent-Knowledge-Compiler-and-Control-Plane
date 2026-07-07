/**
 * @module automation/page-objects/gupy-pages
 * @description Page Object Models for Gupy Job Application automation.
 */

import type { Locator, Page } from 'playwright';

/**
 * POM representing the Gupy login page or candidate dashboard entry.
 */
export class GupyLoginPage {
  private readonly page: Page;
  public readonly emailInput: Locator;
  public readonly passwordInput: Locator;
  public readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"], input[name="email"]');
    this.passwordInput = page.locator('input[type="password"], input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
  }

  /**
   * > [!IMPORTANT]
   * > **Gupy Credential Strategy**:
   * > Like LinkedIn, Gupy heavily employs Cloudflare or similar WAF protection.
   * > We recommend using a persistent context where the candidate is already logged in,
   * > or cookies extraction. Typing email/password on clean browser sessions is brittle.
   */
  async login(email: string, pass: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
    await this.page.waitForNavigation({ waitUntil: 'networkidle' });
  }
}

/**
 * POM representing a Gupy Job Listing page.
 */
export class GupyJobPage {
  private readonly page: Page;
  public readonly applyButton: Locator;
  public readonly jobTitleHeader: Locator;
  public readonly companyNameHeader: Locator;

  constructor(page: Page) {
    this.page = page;
    // Gupy job pages typically have an "Apply for vacancy" (Candidatar-se à vaga) button
    this.applyButton = page.locator('[data-testid="apply-vacancy-button"], button:has-text("Candidatar-se"), button:has-text("Apply")');
    this.jobTitleHeader = page.locator('h1, [data-testid="job-title"]');
    this.companyNameHeader = page.locator('[data-testid="company-name"], .company-name');
  }

  async getJobTitle(): Promise<string> {
    if (await this.jobTitleHeader.isVisible()) {
      return (await this.jobTitleHeader.first().textContent())?.trim() ?? 'Unknown Position';
    }
    return 'Unknown Position';
  }

  async getCompanyName(): Promise<string> {
    if (await this.companyNameHeader.isVisible()) {
      return (await this.companyNameHeader.first().textContent())?.trim() ?? 'Unknown Company';
    }
    return 'Unknown Company';
  }

  async clickApply(): Promise<void> {
    await this.applyButton.first().click();
    await this.page.waitForTimeout(2000);
  }
}

/**
 * POM representing the Gupy application wizard forms.
 */
export class GupyApplicationWizard {
  private readonly page: Page;
  public readonly continueButton: Locator;
  public readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.continueButton = page.locator('button:has-text("Continuar"), button:has-text("Next"), button:has-text("Continue")');
    this.submitButton = page.locator('button:has-text("Enviar candidatura"), button:has-text("Submit application")');
  }

  async proceedThroughForm(): Promise<boolean> {
    let steps = 5;
    while (steps > 0) {
      steps--;

      if (await this.submitButton.isVisible()) {
        return true;
      }

      if (await this.continueButton.isVisible()) {
        await this.continueButton.click();
        await this.page.waitForTimeout(1500);
        continue;
      }

      break;
    }
    return false;
  }
}
