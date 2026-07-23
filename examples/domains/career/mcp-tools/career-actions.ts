import { z } from "zod";
import type {
  ActionDefinition,
  ActionContext,
  ActionResult,
} from "../../../../packages/mcp-automation-server/src/action-registry.js";
import { BrowserOrchestrator } from "./automation/browser-orchestrator.js";
import { OKFDocumentFactory, ApplicationStatus } from "@akcp/core";

const orchestrator = new BrowserOrchestrator();

export const careerActions: ActionDefinition[] = [
  {
    id: "preview_application",
    description:
      "Analyzes a job posting URL to detect required fields before preparing.",
    domain: "career",
    riskLevel: "low",
    parameters: z.object({
      jobUrl: z.string().url(),
    }),
    handler: async (
      params: unknown,
      context: ActionContext,
    ): Promise<ActionResult> => {
      const { jobUrl } = params as { jobUrl: string };
      // Stub implementation for example
      return {
        success: true,
        data: {
          jobUrl,
          platform: "unknown",
          requiredFields: [
            "first_name",
            "last_name",
            "email",
            "resume_file",
            "phone",
          ],
          estimatedAutonomyLevel: "act-with-approval",
        },
      };
    },
  },
  {
    id: "prepare_application",
    description: "Drafts a job application and returns an approval token.",
    domain: "career",
    riskLevel: "medium",
    parameters: z.object({
      jobUrl: z.string().url(),
    }),
    handler: async (
      params: unknown,
      context: ActionContext,
    ): Promise<ActionResult> => {
      // In a real implementation, this would interact with a document service and approval store
      return {
        success: true,
        data: {
          token: "dummy-approval-token-from-example",
          preparedFields: {
            rolesApplied: "Software Engineer",
            status: "Draft",
          },
        },
      };
    },
  },
  {
    id: "confirm_application_submission",
    description:
      "Consumes an approval token to autonomously submit a job application.",
    domain: "career",
    riskLevel: "critical",
    parameters: z.object({
      approvalToken: z.string(),
      jobUrl: z.string().url(),
      dryRun: z.boolean().optional().default(false),
    }),
    handler: async (
      params: unknown,
      context: ActionContext,
    ): Promise<ActionResult> => {
      const { approvalToken, jobUrl, dryRun } = params as {
        approvalToken: string;
        jobUrl: string;
        dryRun: boolean;
      };

      try {
        // This simulates passing in the career context from the document service
        const careerContext = { preferences: [], background: [] } as any;

        const result = await orchestrator.orchestrate(jobUrl, careerContext, {
          headless: true,
          dryRun,
        });

        if (!result.success) {
          return {
            success: false,
            error: `Automation execution failed: ${result.errors?.join("\n")}`,
          };
        }

        const appDoc = OKFDocumentFactory.createApplication(
          result.company,
          result.jobTitle,
          jobUrl,
          {
            platform: result.platform,
            applicationStatus: dryRun
              ? ApplicationStatus.Saved
              : ApplicationStatus.Applied,
            appliedAt: result.submittedAt,
          },
        );

        return {
          success: true,
          data: {
            appDoc,
            dryRun,
          },
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message,
        };
      }
    },
  },
];
