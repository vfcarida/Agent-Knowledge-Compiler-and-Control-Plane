import { z } from "zod";
import { OKFFrontmatterSchema } from "../okf.js";

export const OKFDocumentType = {
  Profile: "Profile",
  Skill: "Skill",
  Experience: "Experience",
  Education: "Education",
  Preference: "Preference",
  Application: "Application",
  Certificate: "Certificate",
  Project: "Project",
} as const;

export type OKFDocumentType =
  (typeof OKFDocumentType)[keyof typeof OKFDocumentType];

export const ApplicationStatus = {
  Saved: "Saved",
  Applied: "Applied",
  Screening: "Screening",
  Interview: "Interview",
  Offer: "Offer",
  Rejected: "Rejected",
  Withdrawn: "Withdrawn",
} as const;

export type ApplicationStatus =
  (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export const SkillLevel = {
  Beginner: "Beginner",
  Intermediate: "Intermediate",
  Advanced: "Advanced",
  Expert: "Expert",
} as const;

export type SkillLevel = (typeof SkillLevel)[keyof typeof SkillLevel];

export const SkillFrontmatterSchema = OKFFrontmatterSchema.extend({
  type: z.literal(OKFDocumentType.Skill),
  level: z.nativeEnum(SkillLevel).optional(),
  yearsOfExperience: z.number().optional(),
  category: z.string().optional(),
});

export const ExperienceFrontmatterSchema = OKFFrontmatterSchema.extend({
  type: z.literal(OKFDocumentType.Experience),
  company: z.string().optional(),
  role: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  current: z.boolean().optional(),
  location: z.string().optional(),
});

export const EducationFrontmatterSchema = OKFFrontmatterSchema.extend({
  type: z.literal(OKFDocumentType.Education),
  institution: z.string().optional(),
  degree: z.string().optional(),
  field: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  current: z.boolean().optional(),
  location: z.string().optional(),
});

export const CertificateFrontmatterSchema = OKFFrontmatterSchema.extend({
  type: z.literal(OKFDocumentType.Certificate),
  issuer: z.string().optional(),
  dateObtained: z.string().optional(),
  expirationDate: z.string().optional(),
  credentialId: z.string().optional(),
  url: z.string().url().optional(),
});

export const ProjectFrontmatterSchema = OKFFrontmatterSchema.extend({
  type: z.literal(OKFDocumentType.Project),
  technologies: z.array(z.string()).optional(),
  url: z.string().url().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const PreferenceFrontmatterSchema = OKFFrontmatterSchema.extend({
  type: z.literal(OKFDocumentType.Preference),
  locations: z.array(z.string()).optional(),
  remote: z.boolean().optional(),
  salaryRange: z.string().optional(),
  roles: z.array(z.string()).optional(),
  companySize: z.string().optional(),
});

export const ApplicationFrontmatterSchema = OKFFrontmatterSchema.extend({
  type: z.literal(OKFDocumentType.Application),
  company: z.string().optional(),
  position: z.string().optional(),
  url: z.string().url().optional(),
  platform: z.string().optional(),
  applicationStatus: z.nativeEnum(ApplicationStatus).optional(),
  appliedAt: z.string().optional(),
  salary: z.string().optional(),
  location: z.string().optional(),
});

export const ProfileFrontmatterSchema = OKFFrontmatterSchema.extend({
  type: z.literal(OKFDocumentType.Profile),
  name: z.string().optional(),
  title: z.string().optional(),
  location: z.string().optional(),
  email: z.string().email().optional(),
});

export const CareerFrontmatterSchema = z.discriminatedUnion("type", [
  ProfileFrontmatterSchema,
  SkillFrontmatterSchema,
  ExperienceFrontmatterSchema,
  EducationFrontmatterSchema,
  CertificateFrontmatterSchema,
  ProjectFrontmatterSchema,
  PreferenceFrontmatterSchema,
  ApplicationFrontmatterSchema,
]);
