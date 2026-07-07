/**
 * @module automation/interfaces
 * @description Strategy pattern contracts for multi-platform browser application automation.
 */

import type { Page } from 'playwright';
import type { CareerContext } from '@ocf/core';

/**
 * Result of a browser automation attempt.
 */
export interface ApplicationResult {
  /** Whether the application was successfully submitted. */
  success: boolean;
  /** The platform target (e.g. 'LinkedIn', 'Gupy', 'Indeed'). */
  platform: string;
  /** Position title extracted or applied to. */
  jobTitle: string;
  /** Company name extracted or applied to. */
  company: string;
  /** ISO 8601 timestamp of execution. */
  submittedAt: string;
  /** Any error details if the submission failed. */
  errors?: string[];
}

/**
 * Strategy interface for platform-specific job application workflows.
 * Implementing classes must handle specific platforms (LinkedIn, Gupy, Indeed).
 */
export interface IApplicationStrategy {
  /**
   * Identifies if the URL is supported by this strategy.
   *
   * @param url - The job application URL
   * @returns true if the strategy can process this URL, false otherwise
   */
  supports(url: string): boolean;

  /**
   * Automate application submission on the target page.
   *
   * This is a scaffold. Per security restrictions, it uses POM classes
   * and logs progress, but does not perform real form submission using real credentials.
   *
   * @param page - Playwright page object representing the current browser tab
   * @param careerContext - The parsed OKF career bundle containing candidate context
   * @param url - The job listing URL
   * @param dryRun - Whether to run without submitting
   * @returns The outcome of the application attempt
   * @throws {AutomationError} If any locator or step fails
   */
  apply(
    page: Page,
    careerContext: CareerContext,
    url: string,
    dryRun?: boolean,
  ): Promise<ApplicationResult>;
}
