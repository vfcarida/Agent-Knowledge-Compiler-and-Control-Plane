/**
 * @module server
 * @description Configures tools for the MCP Automation Server with stateful HITL gates.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import crypto from 'node:crypto';
import {
  OKFDocumentService,
  OKFDocumentFactory,
  ApplicationStatus,
  mcpToolCallsCounter,
  mcpToolFailuresCounter,
  automationAttemptsCounter,
  automationApprovalRequiredCounter,
  automationSubmissionSuccessCounter,
  createToolSuccess,
  createToolFailure,
} from '@ocf/core';
import { BrowserOrchestrator } from './automation/browser-orchestrator.js';
import { ApprovalStore } from './approval/approval-store.js';
import type { AgentPolicy } from '@ocf/core';
import { enforcePolicy } from '@ocf/core';
import { auditLogger } from './audit/audit-log.js';
import { automationServerCapabilities } from './capabilities.js';

const approvalStore = new ApprovalStore();

// Centralized approval store handles pending tokens

export class OCFMcpAutomationServer {
  private readonly server: McpServer;
  private readonly docService: OKFDocumentService;
  private readonly orchestrator: BrowserOrchestrator;
  private readonly policy?: AgentPolicy;

  constructor(docService: OKFDocumentService, policy?: AgentPolicy) {
    this.docService = docService;
    this.orchestrator = new BrowserOrchestrator();
    this.policy = policy;

    // Create the MCP server instance
    this.server = new McpServer({
      name: 'open-career-format-automation-server',
      version: '0.1.0',
    });

    this.registerTools();
  }

  getServerInstance(): McpServer {
    return this.server;
  }

  private registerTools(): void {
    // Tool: preview_application
    this.server.tool(
      'preview_application',
      {
        jobUrl: z.string().url().describe('The job posting vacancy URL to preview'),
      },
      async ({ jobUrl }) => {
        const reqId = crypto.randomUUID();
        const toolName = 'preview_application';
        const toolVersion = '0.1.0';
        mcpToolCallsCounter.add(1);

        try {
          const { data, durationMs } = await withToolTracing(toolName, toolVersion, reqId, async () => {
            const platform = this.detectPlatform(jobUrl);
            return {
              jobUrl,
              platform,
              requiredFields: ['first_name', 'last_name', 'email', 'resume_file', 'phone'],
              estimatedAutonomyLevel: 'act-with-approval',
            };
          });

          return {
            content: [{ 
              type: 'text', 
              text: JSON.stringify(createToolSuccess(data, { requestId: reqId, toolName, toolVersion, durationMs }), null, 2) 
            }],
          };
        } catch (err: any) {
          mcpToolFailuresCounter.add(1);
          return { 
            isError: true, 
            content: [{ 
              type: 'text', 
              text: JSON.stringify(createToolFailure(err.message, 'PREVIEW_ERROR', { requestId: reqId, toolName, toolVersion, durationMs: 0 }), null, 2) 
            }] 
          };
        }
      }
    );

    // Tool: prepare_application
    this.server.tool(
      'prepare_application',
      {
        jobUrl: z.string().url().describe('The target job posting vacancy URL'),
      },
      async ({ jobUrl }) => {
        const reqId = crypto.randomUUID();
        const toolName = 'prepare_application';
        const toolVersion = '0.1.0';
        mcpToolCallsCounter.add(1);
        automationAttemptsCounter.add(1);
        automationApprovalRequiredCounter.add(1);
        
        try {
          enforcePolicy(toolName, automationServerCapabilities, this.policy);
          
          const { data, durationMs } = await withToolTracing(toolName, toolVersion, reqId, async () => {
            const context = await this.docService.getCareerContext();
            
            const pref = context.preferences[0];
            const roles = pref?.frontmatter['roles'] || [];
            
            const preparedFields = {
              rolesApplied: Array.isArray(roles) ? roles.join(', ') : 'Software Engineer',
              status: 'Draft',
            };

            const payload = { jobUrl, context, preparedFields };
            const metadata = { jobUrl, platform: this.detectPlatform(jobUrl) };
            const token = approvalStore.generateToken('confirm_application_submission', payload, metadata);

            return { token, preparedFields };
          });

          auditLogger.log({
            requestId: data.token,
            toolName: 'prepare_application',
            autonomyLevel: this.policy?.autonomyLevel || 'act-with-approval',
            approvalRequired: false,
            sideEffectLevel: 'external-read',
            status: 'success',
            durationMs,
          });

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(createToolSuccess({
                message: 'Application pre-filled and locked. Explicit human authorization is required to submit.',
                approvalToken: data.token,
                autonomyLevel: 'act-with-approval',
                preparedFields: data.preparedFields,
              }, { requestId: reqId, toolName, toolVersion, durationMs }), null, 2)
            }],
          };
        } catch (err: any) {
          mcpToolFailuresCounter.add(1);
          auditLogger.log({
            requestId: reqId,
            toolName: 'prepare_application',
            autonomyLevel: 'advise',
            approvalRequired: false,
            sideEffectLevel: 'external-read',
            status: 'failure',
            durationMs: 0,
            details: { error: err.message }
          });
          return { 
            isError: true, 
            content: [{ 
              type: 'text', 
              text: JSON.stringify(createToolFailure(err.message, 'PREPARE_ERROR', { requestId: reqId, toolName, toolVersion, durationMs: 0 }), null, 2) 
            }] 
          };
        }
      }
    );

    // Tool: confirm_application_submission
    this.server.tool(
      'confirm_application_submission',
      {
        approvalToken: z.string().describe('The validation token generated by prepare_application'),
        jobUrl: z.string().url().describe('The target job posting vacancy URL'),
        dryRun: z.boolean().optional().default(false),
      },
      async ({ approvalToken, jobUrl, dryRun }) => {
        const reqId = crypto.randomUUID();
        const toolName = 'confirm_application_submission';
        const toolVersion = '0.1.0';
        mcpToolCallsCounter.add(1);

        try {
          enforcePolicy(toolName, automationServerCapabilities, this.policy);

          const { data, durationMs } = await withToolTracing(toolName, toolVersion, reqId, async () => {
            // Re-fetch context to rebuild the exact payload that was hashed
            const context = await this.docService.getCareerContext();
            const pref = context.preferences[0];
            const roles = pref?.frontmatter['roles'] || [];
            const preparedFields = {
              rolesApplied: Array.isArray(roles) ? roles.join(', ') : 'Software Engineer',
              status: 'Draft',
            };

            const expectedPayload = { jobUrl, context, preparedFields };
            
            const isValid = approvalStore.validateAndConsume(approvalToken, 'confirm_application_submission', expectedPayload);

            if (!isValid) {
              throw new Error(`Execution Blocked: Invalid, expired, or tampered approval token: ${approvalToken}`);
            }
            
            const mode = process.env['AUTOMATION_RUNTIME_MODE'] || 'sandbox';
            if (mode !== 'explicit-authorized-live' && !dryRun) {
              throw new Error(`Execution Blocked: AUTOMATION_RUNTIME_MODE is set to '${mode}'. Live application submissions are disabled unless mode is 'explicit-authorized-live' or dryRun is true.`);
            }

            // Trigger Playwright browser automation
            const result = await this.orchestrator.orchestrate(jobUrl, context, {
              headless: true,
              dryRun,
            });

            if (!result.success) {
              throw new Error(`Automation execution failed: ${result.errors?.join('\n')}`);
            }

            const appDoc = OKFDocumentFactory.createApplication(
              result.company,
              result.jobTitle,
              jobUrl,
              {
                platform: result.platform,
                status: dryRun ? ApplicationStatus.Saved : ApplicationStatus.Applied,
                appliedAt: result.submittedAt,
              }
            );

            await this.docService.createDocument(appDoc);
            automationSubmissionSuccessCounter.add(1);

            return { appDoc, dryRun };
          });

          auditLogger.log({
            requestId: approvalToken,
            toolName: 'confirm_application_submission',
            autonomyLevel: this.policy?.autonomyLevel || 'act-with-approval',
            approvalRequired: true,
            sideEffectLevel: 'external-submit',
            status: 'success',
            durationMs,
          });

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(createToolSuccess({
                message: data.dryRun
                  ? 'Dry-run application completed successfully.'
                  : 'Job application successfully submitted and registered in OKF bundle.',
                conceptId: data.appDoc.conceptId,
              }, { requestId: reqId, toolName, toolVersion, durationMs }), null, 2),
            }],
          };
        } catch (err: any) {
          mcpToolFailuresCounter.add(1);
          
          let failReason = 'automation_failed';
          if (err.message.includes('Invalid, expired, or tampered')) failReason = 'token_validation_failed';
          if (err.message.includes('AUTOMATION_RUNTIME_MODE')) failReason = 'runtime_mode_blocked';

          auditLogger.log({
            requestId: approvalToken,
            toolName: 'confirm_application_submission',
            autonomyLevel: this.policy?.autonomyLevel || 'act-with-approval',
            approvalRequired: true,
            sideEffectLevel: 'external-submit',
            status: failReason === 'automation_failed' ? 'failure' : 'blocked',
            durationMs: 0,
            details: { reason: failReason, error: err.message }
          });
          
          return { 
            isError: true, 
            content: [{ 
              type: 'text', 
              text: JSON.stringify(createToolFailure(err.message, failReason.toUpperCase(), { requestId: reqId, toolName, toolVersion, durationMs: 0 }), null, 2) 
            }] 
          };
        }
      }
    );

    // Tool: capture_job_posting
    this.server.tool('capture_job_posting', { jobUrl: z.string().url() }, async () => {
      const reqId = crypto.randomUUID();
      const toolName = 'capture_job_posting';
      const toolVersion = '0.1.0';
      mcpToolCallsCounter.add(1);
      
      return { 
        isError: true, 
        content: [{ 
          type: 'text', 
          text: JSON.stringify(createToolFailure('NOT_IMPLEMENTED: Feature deferred.', 'NOT_IMPLEMENTED', { requestId: reqId, toolName, toolVersion, durationMs: 0 }), null, 2) 
        }] 
      };
    });

    // Tool: extract_platform_metadata
    this.server.tool('extract_platform_metadata', { jobUrl: z.string().url() }, async () => {
      const reqId = crypto.randomUUID();
      const toolName = 'extract_platform_metadata';
      const toolVersion = '0.1.0';
      mcpToolCallsCounter.add(1);

      return { 
        isError: true, 
        content: [{ 
          type: 'text', 
          text: JSON.stringify(createToolFailure('NOT_IMPLEMENTED: Feature deferred.', 'NOT_IMPLEMENTED', { requestId: reqId, toolName, toolVersion, durationMs: 0 }), null, 2) 
        }] 
      };
    });

    // Tool: list_pending_approvals
    this.server.tool(
      'list_pending_approvals',
      {},
      async () => {
        const reqId = crypto.randomUUID();
        const toolName = 'list_pending_approvals';
        const toolVersion = '0.1.0';
        mcpToolCallsCounter.add(1);

        try {
          const { data, durationMs } = await withToolTracing(toolName, toolVersion, reqId, async () => {
            return approvalStore.getPendingApprovals();
          });

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(createToolSuccess({
                pending: data,
              }, { requestId: reqId, toolName, toolVersion, durationMs }), null, 2),
            }],
          };
        } catch (err: any) {
          mcpToolFailuresCounter.add(1);
          return { 
            isError: true, 
            content: [{ 
              type: 'text', 
              text: JSON.stringify(createToolFailure(err.message, 'LIST_ERROR', { requestId: reqId, toolName, toolVersion, durationMs: 0 }), null, 2) 
            }] 
          };
        }
      }
    );

    // Tool: revoke_approval
    this.server.tool(
      'revoke_approval',
      {
        approvalToken: z.string().describe('The token to revoke'),
      },
      async ({ approvalToken }) => {
        const reqId = crypto.randomUUID();
        const toolName = 'revoke_approval';
        const toolVersion = '0.1.0';
        mcpToolCallsCounter.add(1);

        try {
          const { data, durationMs } = await withToolTracing(toolName, toolVersion, reqId, async () => {
            const success = approvalStore.revokeToken(approvalToken);
            if (!success) {
              throw new Error('Token not found, already consumed, or expired');
            }
            return { revoked: true };
          });

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(createToolSuccess(data, { requestId: reqId, toolName, toolVersion, durationMs }), null, 2),
            }],
          };
        } catch (err: any) {
          mcpToolFailuresCounter.add(1);
          return { 
            isError: true, 
            content: [{ 
              type: 'text', 
              text: JSON.stringify(createToolFailure(err.message, 'REVOKE_ERROR', { requestId: reqId, toolName, toolVersion, durationMs: 0 }), null, 2) 
            }] 
          };
        }
      }
    );
  }

  private detectPlatform(url: string): string {
    const lower = url.toLowerCase();
    if (lower.includes('linkedin')) return 'LinkedIn';
    if (lower.includes('gupy')) return 'Gupy';
    if (lower.includes('indeed')) return 'Indeed';
    return 'GenericPlatform';
  }
}
