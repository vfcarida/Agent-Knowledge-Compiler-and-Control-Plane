/**
 * @module domain/schemas
 * @description Zod validation schemas for OKF document types and Profile Registry.
 */

import { z } from 'zod';
import { OKFFrontmatterSchema } from './okf.js';
import { CareerFrontmatterSchema } from './profiles/career.js';
import { SoftwareProjectFrontmatterSchema } from './profiles/software-project.js';

/**
 * Profile Registry to dynamically resolve Zod schemas based on the target profile.
 */
export const ProfileRegistry = {

  getProfileSchema(profileName: string): z.ZodTypeAny {
    switch (profileName.toLowerCase()) {
      case 'career':
        return CareerFrontmatterSchema;
      case 'software-project':
      case 'software':
        return SoftwareProjectFrontmatterSchema;
      case 'none':
      case 'okf':
      case 'standard':
        return OKFFrontmatterSchema;
      default:
        console.warn(`[WARN] Profile '${profileName}' not found. Falling back to base OKF schema.`);
        return OKFFrontmatterSchema;
    }
  }
};

export * from './okf.js';
export * from './profiles/career.js';
export * from './profiles/software-project.js';
