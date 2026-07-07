import type { OKFFrontmatter } from '@ocf/core';

export interface OKFDoc {
  frontmatter: OKFFrontmatter;
  body: string;
  conceptId: string;
  fileName: string;
}

export interface SkillDoc extends OKFDoc {
  level?: string;
  yearsOfExperience?: number;
  category?: string;
}

export interface ExperienceDoc extends OKFDoc {
  company?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  location?: string;
}

export interface ApplicationDoc extends OKFDoc {
  company: string;
  position: string;
  url?: string;
  platform?: string;
  status: string;
  appliedAt?: string;
  salary?: string;
  location?: string;
}

export interface PreferenceDoc extends OKFDoc {
  locations?: string[];
  remote?: boolean;
  salaryRange?: string;
  roles?: string[];
  companySize?: string;
}

export interface CareerBundleData {
  skills: SkillDoc[];
  experiences: ExperienceDoc[];
  preferences: PreferenceDoc[];
  applications: ApplicationDoc[];
  other: OKFDoc[];
  logEntries: Array<{
    timestamp: string;
    action: string;
    conceptId: string;
    details?: string;
  }>;
}
