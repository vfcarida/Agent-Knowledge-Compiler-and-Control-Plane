/**
 * @module domain/schemas
 * @description Zod validation schemas for OKF document types and Profile Registry.
 */

import { z } from "zod";
import { OKFFrontmatterSchema } from "./okf.js";
import { CareerFrontmatterSchema } from "./profiles/career.js";
import { SoftwareProjectFrontmatterSchema } from "./profiles/software-project.js";
import { CustomerSupportDomainSchema } from "./profiles/customer-support.js";
import { ITOperationsDomainSchema } from "./profiles/it-operations.js";

const customProfiles = new Map<string, z.ZodTypeAny>();

/**
 * Profile Registry to dynamically resolve Zod schemas based on the target profile.
 * Supports runtime registration of domain-specific profiles.
 */
export const ProfileRegistry = {
  /**
   * Register a custom profile schema at runtime.
   */
  registerProfileSchema(profileName: string, schema: z.ZodTypeAny): void {
    customProfiles.set(profileName.toLowerCase(), schema);
  },

  /**
   * Clear all dynamically registered custom profiles (useful for testing).
   */
  clearCustomProfiles(): void {
    customProfiles.clear();
  },

  getProfileSchema(profileName: string): z.ZodTypeAny {
    const key = profileName.toLowerCase();
    if (customProfiles.has(key)) {
      return customProfiles.get(key)!;
    }

    switch (key) {
      case "career":
        return CareerFrontmatterSchema;
      case "software-project":
      case "software":
        return SoftwareProjectFrontmatterSchema;
      case "customer-support":
        return CustomerSupportDomainSchema;
      case "it-operations":
      case "it-ops":
        return ITOperationsDomainSchema;
      case "none":
      case "okf":
      case "standard":
        return OKFFrontmatterSchema;
      default:
        console.warn(
          `[WARN] Profile '${profileName}' not found. Falling back to base OKF schema.`,
        );
        return OKFFrontmatterSchema;
    }
  },
};

export * from "./okf.js";
export * from "./profiles/career.js";
export * from "./profiles/software-project.js";
export * from "./profiles/customer-support.js";
export * from "./profiles/it-operations.js";
