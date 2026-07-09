/**
 * @module server
 * @description Configures tools, resources, and prompts for the MCP Profile Server.
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import path from 'node:path';
import { z } from 'zod';
import crypto from 'node:crypto';
import {
  OKFDocumentService,
  mcpToolCallsCounter,
  mcpToolFailuresCounter,
  bundleMigrationsCounter,
  okfParseFailuresCounter,
  migrateBundle,
  FileSystemAdapter,
  FrontmatterParser,
  ProfileRegistry,
  OKFDocumentType,
  IndexService,
  createToolSuccess,
  createToolFailure,
  withToolTracing
} from '@ocf/core';
import { profileServerCapabilities } from './capabilities.js';

export class OCFMcpProfileServer {
  private readonly server: McpServer;
  private readonly docService: OKFDocumentService;

  constructor(docService: OKFDocumentService) {
    this.docService = docService;

    // Create the MCP server instance
    this.server = new McpServer({
      name: 'open-career-format-profile-server',
      version: '0.1.0',
    });

    this.registerResources();
    this.registerPrompts();
    this.registerTools();
  }

  getServerInstance(): McpServer {
    return this.server;
  }

  /**
   * Register resources: bundle://index, bundle://log, bundle://documents/{conceptId}
   */
  private registerResources(): void {
    // Resource: bundle://index
    this.server.resource(
      'bundle-index',
      'bundle://index',
      {
        mimeType: 'text/markdown',
        description: 'Chronological indices catalog listing all folders in the bundle',
      },
      async () => {
        const doc = await this.docService.getDocument('index');
        return {
          contents: [
            {
              uri: 'bundle://index',
              mimeType: 'text/markdown',
              text: doc ? doc.body : '# Bundle Index empty',
            },
          ],
        };
      }
    );

    // Resource: bundle://log
    this.server.resource(
      'bundle-log',
      'bundle://log',
      {
        mimeType: 'text/markdown',
        description: 'Audit log tracking bundle modifications',
      },
      async () => {
        const doc = await this.docService.getDocument('log');
        return {
          contents: [
            {
              uri: 'bundle://log',
              mimeType: 'text/markdown',
              text: doc ? doc.body : '# Bundle Log empty',
            },
          ],
        };
      }
    );

    // Resource template: bundle://documents/{conceptId}
    this.server.resource(
      'bundle-document',
      new ResourceTemplate('bundle://documents/{conceptId}', { list: undefined }),
      async (uri, { conceptId }) => {
        if (typeof conceptId !== 'string') {
          throw new Error('conceptId must be a string');
        }
        const doc = await this.docService.getDocument(conceptId);
        if (!doc) {
          throw new Error(`Document not found: ${conceptId}`);
        }
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'text/markdown',
              text: `---\n${JSON.stringify(doc.frontmatter, null, 2)}\n---\n\n${doc.body}`,
            },
          ],
        };
      }
    );
  }

  /**
   * Register prompts: summarize_career_profile, tailor_resume_from_job
   */
  private registerPrompts(): void {
    this.server.prompt(
      'summarize_career_profile',
      {},
      () => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Please review my skills and experience from the career bundle and compile a concise 2-sentence elevator pitch.',
            },
          },
        ],
      })
    );

    this.server.prompt(
      'tailor_resume_from_job',
      {
        jobTitle: z.string().describe('Target job title'),
      },
      (args) => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Generate suggested resume adjustments highlighting my experiences related to: ${args.jobTitle}.`,
            },
          },
        ],
      })
    );
  }

  /**
   * Register tools
   */
  private registerTools(): void {
    // Tool list_capabilities
    this.server.tool('list_capabilities', {}, async () => {
      const reqId = crypto.randomUUID();
      const toolName = 'list_capabilities';
      const toolVersion = '1.0.0';
      mcpToolCallsCounter.add(1);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(createToolSuccess(profileServerCapabilities, { requestId: reqId, toolName, toolVersion, durationMs: 0 }), null, 2)
        }]
      };
    });

    // Tool list_documents
    this.server.tool('list_documents', {}, async () => {
      const reqId = crypto.randomUUID();
      const toolName = 'list_documents';
      const toolVersion = '1.0.0';
      mcpToolCallsCounter.add(1);
      
      try {
        const { data, durationMs } = await withToolTracing(toolName, toolVersion, reqId, async () => {
          const context = await this.docService.getCareerContext();
          const docs = [
            ...context.skills,
            ...context.experiences,
            ...context.applications,
            ...context.preferences,
            ...context.education,
            ...context.certificates,
            ...context.projects,
          ];
          return docs.map((d) => ({ id: d.conceptId, type: d.frontmatter.type }));
        });
        
        return { 
          content: [{ 
            type: 'text', 
            text: JSON.stringify(createToolSuccess(data, { requestId: reqId, toolName, toolVersion, durationMs }), null, 2) 
          }] 
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
    });

    // Tool read_document
    this.server.tool('read_document', { conceptId: z.string() }, async ({ conceptId }) => {
      const reqId = crypto.randomUUID();
      const toolName = 'read_document';
      const toolVersion = '1.0.0';
      mcpToolCallsCounter.add(1);

      try {
        const { data, durationMs } = await withToolTracing(toolName, toolVersion, reqId, async () => {
          const doc = await this.docService.getDocument(conceptId);
          if (!doc) {
            throw new Error(`Document not found: ${conceptId}`);
          }
          return { frontmatter: doc.frontmatter, body: doc.body };
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
            text: JSON.stringify(createToolFailure(err.message, 'READ_ERROR', { requestId: reqId, toolName, toolVersion, durationMs: 0 }), null, 2) 
          }] 
        };
      }
    });

    // Tool create_document
    this.server.tool(
      'create_document',
      {
        conceptId: z.string(),
        frontmatter: z.record(z.any()),
        body: z.string(),
      },
      async ({ conceptId, frontmatter, body }) => {
        const reqId = crypto.randomUUID();
        const toolName = 'create_document';
        const toolVersion = '1.0.0';
        mcpToolCallsCounter.add(1);

        try {
          const { data, durationMs } = await withToolTracing(toolName, toolVersion, reqId, async () => {
            await this.docService.createDocument(frontmatter as any, body, conceptId);
            return { conceptId, action: 'created' };
          });

          return {
            content: [{ 
              type: 'text', 
              text: JSON.stringify(createToolSuccess(data, { requestId: reqId, toolName, toolVersion, durationMs }), null, 2) 
            }],
          };
        } catch (err: any) {
          mcpToolFailuresCounter.add(1);
          okfParseFailuresCounter.add(1);
          return { 
            isError: true, 
            content: [{ 
              type: 'text', 
              text: JSON.stringify(createToolFailure(err.message, 'CREATE_ERROR', { requestId: reqId, toolName, toolVersion, durationMs: 0 }), null, 2) 
            }] 
          };
        }
      }
    );

    // Tool update_document
    this.server.tool(
      'update_document',
      {
        conceptId: z.string(),
        updates: z.record(z.any()),
        bodyUpdate: z.string().optional(),
      },
      async ({ conceptId, updates, bodyUpdate }) => {
        const reqId = crypto.randomUUID();
        const toolName = 'update_document';
        const toolVersion = '1.0.0';
        mcpToolCallsCounter.add(1);

        try {
          const { data, durationMs } = await withToolTracing(toolName, toolVersion, reqId, async () => {
            await this.docService.updateDocument(conceptId, updates, bodyUpdate);
            return { conceptId, action: 'updated' };
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
              text: JSON.stringify(createToolFailure(err.message, 'UPDATE_ERROR', { requestId: reqId, toolName, toolVersion, durationMs: 0 }), null, 2) 
            }] 
          };
        }
      }
    );

    // Tool delete_document
    this.server.tool('delete_document', { conceptId: z.string() }, async ({ conceptId }) => {
      const reqId = crypto.randomUUID();
      const toolName = 'delete_document';
      const toolVersion = '1.0.0';
      mcpToolCallsCounter.add(1);

      try {
        const { data, durationMs } = await withToolTracing(toolName, toolVersion, reqId, async () => {
          await this.docService.deleteDocument(conceptId);
          return { conceptId, action: 'deleted' };
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
            text: JSON.stringify(createToolFailure(err.message, 'DELETE_ERROR', { requestId: reqId, toolName, toolVersion, durationMs: 0 }), null, 2) 
          }] 
        };
      }
    });

    // Tool validate_bundle
    this.server.tool('validate_bundle', { profile: z.string().optional().default('career') }, async ({ profile }) => {
      const reqId = crypto.randomUUID();
      const toolName = 'validate_bundle';
      const toolVersion = '1.0.0';
      mcpToolCallsCounter.add(1);

      try {
        const { data, durationMs } = await withToolTracing(toolName, toolVersion, reqId, async () => {
          const bundlePath = this.docService.bundleRootPath;
          const fsAdapter = new FileSystemAdapter();
          const fmParser = new FrontmatterParser();
          const SchemaValidator = ProfileRegistry.getProfileSchema(profile);
          const relativeFiles = await fsAdapter.listFiles(bundlePath);
          const RESERVED_FILENAMES = new Set(['index.md', 'log.md']);
          
          let validCount = 0;
          let invalidCount = 0;
          const errors: string[] = [];
          
          for (const relPath of relativeFiles) {
            if (!relPath.endsWith('.md') || RESERVED_FILENAMES.has(path.basename(relPath))) continue;
            const fullPath = path.join(bundlePath, relPath);
            try {
              const content = await fsAdapter.readFile(fullPath);
              const doc = fmParser.parse(content, fullPath, bundlePath);
              const validation = SchemaValidator.safeParse(doc.frontmatter);
              if (validation.success) {
                validCount++;
              } else {
                invalidCount++;
                errors.push(`[${relPath}] ${validation.error.message}`);
              }
            } catch (err: any) {
              invalidCount++;
              errors.push(`[${relPath}] Parse error: ${err.message}`);
            }
          }
          
          return {
            ok: invalidCount === 0,
            bundlePath,
            checkedAt: new Date().toISOString(),
            profile,
            summary: {
              filesChecked: validCount + invalidCount,
              validDocuments: validCount,
              invalidDocuments: invalidCount,
              warnings: 0
            },
            diagnostics: errors.map(msg => ({ severity: 'error', message: msg, file: '', code: '' }))
          };
        });
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(createToolSuccess(data, { requestId: reqId, toolName, toolVersion, durationMs }), null, 2)
          }]
        };
      } catch (err: any) {
        mcpToolFailuresCounter.add(1);
        return { 
          isError: true, 
          content: [{ 
            type: 'text', 
            text: JSON.stringify(createToolFailure(err.message, 'VALIDATE_ERROR', { requestId: reqId, toolName, toolVersion, durationMs: 0 }), null, 2) 
          }] 
        };
      }
    });

    // Tool migrate_bundle
    this.server.tool('migrate_bundle', { write: z.boolean().optional().default(false) }, async ({ write }) => {
      const reqId = crypto.randomUUID();
      const toolName = 'migrate_bundle';
      const toolVersion = '1.0.0';
      mcpToolCallsCounter.add(1);
      bundleMigrationsCounter.add(1);

      try {
        const { data, durationMs } = await withToolTracing(toolName, toolVersion, reqId, async () => {
          const fsAdapter = new FileSystemAdapter();
          const fmParser = new FrontmatterParser();
          const bundlePath = this.docService.bundleRootPath;
          const report = await migrateBundle(fsAdapter, fmParser, bundlePath, { write, backup: write });
          return report;
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
            text: JSON.stringify(createToolFailure(err.message, 'MIGRATE_ERROR', { requestId: reqId, toolName, toolVersion, durationMs: 0 }), null, 2) 
          }] 
        };
      }
    });

    // Tool rebuild_indexes
    this.server.tool('rebuild_indexes', {}, async () => {
      const reqId = crypto.randomUUID();
      const toolName = 'rebuild_indexes';
      const toolVersion = '1.0.0';
      mcpToolCallsCounter.add(1);

      try {
        const { data, durationMs } = await withToolTracing(toolName, toolVersion, reqId, async () => {
          const bundlePath = this.docService.bundleRootPath;
          const fsAdapter = new FileSystemAdapter();
          const fmParser = new FrontmatterParser();
          const indexService = new IndexService(fsAdapter, fmParser, bundlePath);
          
          const subdirs = ['.'];
          for (const type of Object.values(OKFDocumentType)) {
              let plural = type.toLowerCase() + 's';
              if (plural === 'educations') plural = 'education';
              subdirs.push(plural);
          }
          
          const generated: string[] = [];
          for (const dir of subdirs) {
            const dirPath = path.join(bundlePath, dir);
            if (await fsAdapter.exists(dirPath)) {
              await indexService.generate(dirPath);
              generated.push(dir);
            }
          }
          return { generatedDirs: generated };
        });
        
        return { 
          content: [{ 
            type: 'text', 
            text: JSON.stringify(createToolSuccess(data, { requestId: reqId, toolName, toolVersion, durationMs }), null, 2) 
          }] 
        };
      } catch (err: any) {
        mcpToolFailuresCounter.add(1);
        return { 
          isError: true, 
          content: [{ 
            type: 'text', 
            text: JSON.stringify(createToolFailure(err.message, 'REBUILD_ERROR', { requestId: reqId, toolName, toolVersion, durationMs: 0 }), null, 2) 
          }] 
        };
      }
    });
  }
}
