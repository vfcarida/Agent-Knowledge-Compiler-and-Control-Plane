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
  withToolTracing,
  ContextPacker,
  MCPGateway,
  type GatewayConfig
} from '@ocf/core';
import { profileServerCapabilities } from './capabilities.js';

export class OCFMcpProfileServer {
  private readonly server: McpServer;
  private readonly docService: OKFDocumentService;
  private readonly gateway: MCPGateway;

  constructor(docService: OKFDocumentService, gatewayConfig: GatewayConfig = { policies: {} }) {
    this.docService = docService;
    this.gateway = new MCPGateway(gatewayConfig);

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
    this.server.tool('list_capabilities', 'Lists all available tools and their risk profiles.', { _agentId: z.string().optional() }, async ({ _agentId }) => {
      const reqId = crypto.randomUUID();
      const toolName = 'list_capabilities';
      const toolVersion = '1.0.0';
      mcpToolCallsCounter.add(1);

      try {
        const { data, durationMs } = await this.gateway.execute({
          requestId: reqId,
          toolName,
          sideEffect: 'read',
          agentId: _agentId,
          payload: {}
        }, async () => {
          return await withToolTracing(toolName, toolVersion, reqId, async () => {
            return profileServerCapabilities;
          });
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
            text: JSON.stringify(createToolFailure(err.message, 'GATEWAY_BLOCKED', { requestId: reqId, toolName, toolVersion, durationMs: 0 }), null, 2)
          }]
        };
      }
    });

    // Tool build_context_pack
    this.server.tool(
      'build_context_pack',
      profileServerCapabilities.find(c => c.name === 'build_context_pack')?.description || '',
      {
        task: z.string().describe('The task or query to build context for'),
        profile: z.string().optional().default('career'),
        maxTokens: z.number().optional().default(10000),
        mode: z.enum(['minimal', 'balanced', 'full', 'audit']).optional().default('balanced'),
        includeProvenance: z.boolean().optional().default(true),
        _agentId: z.string().optional(),
      },
      async ({ task, profile, maxTokens, mode, includeProvenance, _agentId }) => {
        const reqId = crypto.randomUUID();
        const toolName = 'build_context_pack';
        const toolVersion = '1.0.0';
        mcpToolCallsCounter.add(1);

        try {
          const { data, durationMs } = await this.gateway.execute({
            requestId: reqId,
            toolName,
            sideEffect: 'read',
            agentId: _agentId,
            payload: { task, profile, maxTokens, mode, includeProvenance }
          }, async () => {
            return await withToolTracing(toolName, toolVersion, reqId, async () => {
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
              
              const packer = new ContextPacker();
              return packer.pack(docs, {
                task,
                profile,
                maxTokens,
                mode,
                includeProvenance,
              });
            });
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
              text: JSON.stringify(createToolFailure(err.message, 'BUILD_CONTEXT_ERROR', { requestId: reqId, toolName, toolVersion, durationMs: 0 }), null, 2)
            }]
          };
        }
      }
    );

    // Tool list_documents
    this.server.tool(
      'list_documents',
      profileServerCapabilities.find(c => c.name === 'list_documents')?.description || '',
      { _agentId: z.string().optional() }, 
      async ({ _agentId }) => {
      const reqId = crypto.randomUUID();
      const toolName = 'list_documents';
      const toolVersion = '1.0.0';
      mcpToolCallsCounter.add(1);
      
      try {
        const { data, durationMs } = await this.gateway.execute({
          requestId: reqId,
          toolName,
          sideEffect: 'read',
          agentId: _agentId,
          payload: {}
        }, async () => {
          return await withToolTracing(toolName, toolVersion, reqId, async () => {
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
    this.server.tool(
      'read_document',
      profileServerCapabilities.find(c => c.name === 'read_document')?.description || '',
      { 
        conceptId: z.string(),
        summaryOnly: z.boolean().optional().describe('If true, returns only the frontmatter to save token budget.'),
        offset: z.number().optional().describe('Line number (0-indexed) to start reading from.'),
        limit: z.number().optional().describe('Maximum number of lines to return.'),
        maxLength: z.number().optional().describe('Maximum number of characters of the body to return. Useful for context compression.'),
        _agentId: z.string().optional()
      }, 
      async ({ conceptId, summaryOnly, offset, limit, maxLength, _agentId }) => {
      const reqId = crypto.randomUUID();
      const toolName = 'read_document';
      const toolVersion = '1.2.0';
      mcpToolCallsCounter.add(1);

      try {
        const { data, durationMs } = await this.gateway.execute({
          requestId: reqId,
          toolName,
          sideEffect: 'read',
          agentId: _agentId,
          payload: { conceptId, summaryOnly, offset, limit, maxLength }
        }, async () => {
          return await withToolTracing(toolName, toolVersion, reqId, async () => {
            const doc = await this.docService.getDocument(conceptId);
            if (!doc) {
              throw new Error(`Document not found: ${conceptId}`);
            }
            
            if (summaryOnly) {
              return { frontmatter: doc.frontmatter, body: '[TRUNCATED FOR CONTEXT COMPRESSION]' };
            }
            
            let responseBody = doc.body;
            
            if (offset !== undefined || limit !== undefined) {
               const lines = responseBody.split('\n');
               const startIdx = offset || 0;
               const endIdx = limit !== undefined ? startIdx + limit : lines.length;
               responseBody = lines.slice(startIdx, endIdx).join('\n');
               
               if (endIdx < lines.length) {
                  responseBody += '\n\n...[TRUNCATED: Use offset/limit to paginate further]';
               }
            }
            
            if (maxLength && responseBody.length > maxLength) {
              responseBody = responseBody.substring(0, maxLength) + '\n\n...[TRUNCATED FOR CONTEXT COMPRESSION]';
            }
            
            return { frontmatter: doc.frontmatter, body: responseBody };
          });
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
      profileServerCapabilities.find(c => c.name === 'create_document')?.description || '',
      {
        conceptId: z.string(),
        frontmatter: z.record(z.any()),
        body: z.string(),
        _agentId: z.string().optional()
      },
      async ({ conceptId, frontmatter, body, _agentId }) => {
        const reqId = crypto.randomUUID();
        const toolName = 'create_document';
        const toolVersion = '1.0.0';
        mcpToolCallsCounter.add(1);

        try {
          const { data, durationMs } = await this.gateway.execute({
            requestId: reqId,
            toolName,
            sideEffect: 'write',
            agentId: _agentId,
            payload: { conceptId, frontmatter, body }
          }, async () => {
            return await withToolTracing(toolName, toolVersion, reqId, async () => {
              await this.docService.createDocument(frontmatter as any, body, conceptId);
              return { conceptId, action: 'created' };
            });
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
      profileServerCapabilities.find(c => c.name === 'update_document')?.description || '',
      {
        conceptId: z.string(),
        updates: z.record(z.any()),
        bodyUpdate: z.string().optional(),
        _agentId: z.string().optional()
      },
      async ({ conceptId, updates, bodyUpdate, _agentId }) => {
        const reqId = crypto.randomUUID();
        const toolName = 'update_document';
        const toolVersion = '1.0.0';
        mcpToolCallsCounter.add(1);

        try {
          const { data, durationMs } = await this.gateway.execute({
            requestId: reqId,
            toolName,
            sideEffect: 'write',
            agentId: _agentId,
            payload: { conceptId, updates, bodyUpdate }
          }, async () => {
            return await withToolTracing(toolName, toolVersion, reqId, async () => {
              await this.docService.updateDocument(conceptId, updates, bodyUpdate);
              return { conceptId, action: 'updated' };
            });
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
    this.server.tool(
      'delete_document',
      profileServerCapabilities.find(c => c.name === 'delete_document')?.description || '',
      { conceptId: z.string(), _agentId: z.string().optional() },
      async ({ conceptId, _agentId }) => {
      const reqId = crypto.randomUUID();
      const toolName = 'delete_document';
      const toolVersion = '1.0.0';
      mcpToolCallsCounter.add(1);

      try {
        const { data, durationMs } = await this.gateway.execute({
          requestId: reqId,
          toolName,
          sideEffect: 'write',
          agentId: _agentId,
          payload: { conceptId }
        }, async () => {
          return await withToolTracing(toolName, toolVersion, reqId, async () => {
            await this.docService.deleteDocument(conceptId);
            return { conceptId, action: 'deleted' };
          });
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
    this.server.tool(
      'validate_bundle',
      profileServerCapabilities.find(c => c.name === 'validate_bundle')?.description || '',
      { profile: z.string().optional().default('career'), _agentId: z.string().optional() },
      async ({ profile, _agentId }) => {
      const reqId = crypto.randomUUID();
      const toolName = 'validate_bundle';
      const toolVersion = '1.0.0';
      mcpToolCallsCounter.add(1);

      try {
        const { data, durationMs } = await this.gateway.execute({
          requestId: reqId,
          toolName,
          sideEffect: 'read',
          agentId: _agentId,
          payload: { profile }
        }, async () => {
          return await withToolTracing(toolName, toolVersion, reqId, async () => {
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
    this.server.tool(
      'migrate_bundle',
      profileServerCapabilities.find(c => c.name === 'migrate_bundle')?.description || '',
      { write: z.boolean().optional().default(false), _agentId: z.string().optional() },
      async ({ write, _agentId }) => {
      const reqId = crypto.randomUUID();
      const toolName = 'migrate_bundle';
      const toolVersion = '1.0.0';
      mcpToolCallsCounter.add(1);
      bundleMigrationsCounter.add(1);

      try {
        const { data, durationMs } = await this.gateway.execute({
          requestId: reqId,
          toolName,
          sideEffect: 'write',
          agentId: _agentId,
          payload: { write }
        }, async () => {
          return await withToolTracing(toolName, toolVersion, reqId, async () => {
            const fsAdapter = new FileSystemAdapter();
            const fmParser = new FrontmatterParser();
            const bundlePath = this.docService.bundleRootPath;
            const report = await migrateBundle(fsAdapter, fmParser, bundlePath, { write, backup: write });
            return report;
          });
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
    this.server.tool(
      'rebuild_indexes',
      profileServerCapabilities.find(c => c.name === 'rebuild_indexes')?.description || '',
      { _agentId: z.string().optional() },
      async ({ _agentId }) => {
      const reqId = crypto.randomUUID();
      const toolName = 'rebuild_indexes';
      const toolVersion = '1.0.0';
      mcpToolCallsCounter.add(1);

      try {
        const { data, durationMs } = await this.gateway.execute({
          requestId: reqId,
          toolName,
          sideEffect: 'write',
          agentId: _agentId,
          payload: {}
        }, async () => {
          return await withToolTracing(toolName, toolVersion, reqId, async () => {
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
