/**
 * @module server
 * @description Configures and registers tools for the Open Career Format MCP Server.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { OKFDocumentService, OKFDocumentFactory, OKFDocumentType, ApplicationStatus } from '@ocf/core';
import { BrowserOrchestrator } from './automation/browser-orchestrator.js';
import { MCPToolExecutionError } from './errors.js';
import { OllamaService } from './services/ollama-service.js';

export class OCFMcpServer {
  private readonly server: McpServer;
  private readonly docService: OKFDocumentService;
  private readonly orchestrator: BrowserOrchestrator;

  constructor(docService: OKFDocumentService) {
    this.docService = docService;
    this.orchestrator = new BrowserOrchestrator();

    // Create the MCP server instance
    this.server = new McpServer({
      name: 'open-career-format-orchestrator',
      version: '0.1.0',
    });

    this.registerTools();
  }

  /**
   * Get the underlying McpServer instance.
   */
  getServerInstance(): McpServer {
    return this.server;
  }

  /**
   * Register tools with the MCP Server.
   */
  private registerTools(): void {
    // ─── TOOL: read_career_context ───────────────────────────────────────────────
    this.server.tool(
      'read_career_context',
      {
        includeTypes: z
          .array(z.nativeEnum(OKFDocumentType))
          .optional()
          .describe('Optional filter to only return specific types of career documents (e.g. Skill, Experience)'),
      },
      async ({ includeTypes }) => {
        try {
          const context = await this.docService.getCareerContext();
          const formatDocList = (docs: any[]) =>
            docs
              .map((d) => {
                const titleLine = `### ${d.frontmatter.title || d.conceptId}\n`;
                const metadata = Object.entries(d.frontmatter)
                  .filter(([key]) => key !== 'title')
                  .map(([key, val]) => `*${key}: ${JSON.stringify(val)}*`)
                  .join('\n');
                return `${titleLine}${metadata}\n\n${d.body}`;
              })
              .join('\n\n');

          const sections: string[] = [];

          if (!includeTypes || includeTypes.includes(OKFDocumentType.Skill)) {
            sections.push(`## Skills\n\n${formatDocList(context.skills)}`);
          }
          if (!includeTypes || includeTypes.includes(OKFDocumentType.Experience)) {
            sections.push(`## Professional Experience\n\n${formatDocList(context.experiences)}`);
          }
          if (!includeTypes || includeTypes.includes(OKFDocumentType.Preference)) {
            sections.push(`## Preferences\n\n${formatDocList(context.preferences)}`);
          }
          if (!includeTypes || includeTypes.includes(OKFDocumentType.Education)) {
            sections.push(`## Education\n\n${formatDocList(context.education)}`);
          }
          if (!includeTypes || includeTypes.includes(OKFDocumentType.Certificate)) {
            sections.push(`## Certifications\n\n${formatDocList(context.certificates)}`);
          }
          if (!includeTypes || includeTypes.includes(OKFDocumentType.Project)) {
            sections.push(`## Projects\n\n${formatDocList(context.projects)}`);
          }
          if (!includeTypes || includeTypes.includes(OKFDocumentType.Application)) {
            sections.push(`## Submitted Applications\n\n${formatDocList(context.applications)}`);
          }

          const responseText = [
            '# Open Career Format — Candidate Professional Profile',
            'This context is retrieved dynamically from the user\'s local OKF markdown bundle directory.',
            '',
            sections.join('\n\n---\n\n'),
          ].join('\n');

          return {
            content: [{ type: 'text', text: responseText }],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          throw new MCPToolExecutionError('read_career_context', message);
        }
      },
    );

    // ─── TOOL: tailor_resume ───────────────────────────────────────────────────
    this.server.tool(
      'tailor_resume',
      {
        jobDescription: z.string().describe('The full text description of the target job vacancy'),
        format: z.enum(['markdown', 'text']).optional().default('markdown').describe('Format of the output tailored suggestions'),
        focusAreas: z.array(z.string()).optional().describe('Core skills or concepts to prioritize in tailoring'),
        localGeneration: z.boolean().optional().default(false).describe('If true, queries local Ollama gemma4 instance to return the tailored resume suggestions directly'),
      },
      async ({ jobDescription, format: _format, focusAreas, localGeneration }) => {
        try {
          const context = await this.docService.getCareerContext();

          // Aggregate skills and experiences for resume compilation
          const skillsList = context.skills.map((s) => `- **${s.frontmatter.title || s.conceptId}**: ${s.frontmatter.description || ''}`).join('\n');
          const experienceList = context.experiences
            .map((e) => `### ${e.frontmatter.role} at ${e.frontmatter.company}\n*Period: ${e.frontmatter.startDate || ''} - ${e.frontmatter.endDate || (e.frontmatter.current ? 'Present' : '')}*\n\n${e.body}`)
            .join('\n\n');

          const isLocal = localGeneration || process.env['LLM_PROVIDER'] === 'ollama';

          if (isLocal) {
            const ollama = new OllamaService();
            const prompt = [
              'Please generate highly optimized resume suggestions and a cover letter draft based on the candidate profile and target job description below.',
              '',
              '### Candidate Profile',
              '#### Available Skills:',
              skillsList || 'None listed.',
              '',
              '#### Professional Experience:',
              experienceList || 'None listed.',
              '',
              '### Target Job Description',
              jobDescription,
              '',
              focusAreas && focusAreas.length > 0 ? `### Prioritize Focus Areas:\n${focusAreas.join(', ')}` : '',
              '',
              'Provide professional suggestions, key adjustments, and drafts in clear Markdown.',
            ].join('\n');

            const systemPrompt = 'You are an elite ATS optimization engine that tailors candidate profiles to match vacancy descriptions with absolute precision.';
            const responseText = await ollama.generateCompletion(prompt, systemPrompt);

            return {
              content: [{ type: 'text', text: responseText }],
            };
          }

          const responseText = [
            '# ATS Resume Tailoring Instructions & Suggested Content',
            'Below is the candidate\'s raw context along with target job requirements. Use this data to synthesize a tailored CV / cover letter.',
            '',
            '## Candidate Capabilities',
            '### Available Skills:',
            skillsList || 'None listed.',
            '',
            '### Professional Experience:',
            experienceList || 'None listed.',
            '',
            '## Target Job Description',
            jobDescription,
            '',
            focusAreas && focusAreas.length > 0 ? `## Requested Focus Areas\n${focusAreas.map((f) => `- ${f}`).join('\n')}\n` : '',
            '## ATS Optimization Advice:',
            '1. Integrate key terms from the job description directly into the skills profile.',
            '2. Emphasize relevant experiences that match the job responsibilities.',
            '3. Format outputs strictly in clear Markdown matching standard curriculum templates.',
          ].join('\n');

          return {
            content: [{ type: 'text', text: responseText }],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          throw new MCPToolExecutionError('tailor_resume', message);
        }
      },
    );

    // ─── TOOL: orchestrate_application ─────────────────────────────────────────
    this.server.tool(
      'orchestrate_application',
      {
        jobUrl: z.string().url().describe('The HTTP(S) URL of the vacancy to apply for (e.g. LinkedIn, Gupy, Indeed)'),
        dryRun: z.boolean().optional().default(false).describe('If true, compiles form fields and navigates but does not submit the final application'),
      },
      async ({ jobUrl, dryRun }) => {
        try {
          // Get candidate context
          const context = await this.docService.getCareerContext();

          // 1. Trigger Playwright automation orchestrator
          const result = await this.orchestrator.orchestrate(jobUrl, context, {
            headless: true,
            dryRun: dryRun ?? false,
          });

          if (!result.success) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Job application failed. Errors encountered:\n${result.errors?.join('\n')}`,
                },
              ],
            };
          }

          // 2. Create Application document
          const appDoc = OKFDocumentFactory.createApplication(
            result.company,
            result.jobTitle,
            jobUrl,
            {
              platform: result.platform,
              status: dryRun ? ApplicationStatus.Saved : ApplicationStatus.Applied,
              appliedAt: result.submittedAt,
            },
          );

          // 3. Save application document via service (this auto-updates directory index.md and log.md)
          await this.docService.createDocument(appDoc);

          const statusMsg = dryRun
            ? `Successfully compiled form details for "${result.jobTitle}" at "${result.company}" (Dry Run: Saved in OKF bundle).`
            : `Successfully submitted application for "${result.jobTitle}" at "${result.company}" and registered submission in OKF bundle.`;

          return {
            content: [
              {
                type: 'text',
                text: `${statusMsg}\n\nRegistered concept ID: ${appDoc.conceptId}`,
              },
            ],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          throw new MCPToolExecutionError('orchestrate_application', message);
        }
      },
    );
  }
}
