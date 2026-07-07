/**
 * @module __tests__/server.test
 * @description Unit tests for the OCF MCP Server tools.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OKFDocumentType, ApplicationStatus } from '@ocf/core';
import { OCFMcpServer } from '../server.js';
import { BrowserOrchestrator } from '../automation/browser-orchestrator.js';
import { OllamaService } from '../services/ollama-service.js';

// Mock BrowserOrchestrator to avoid opening real chromium browsers during tests
vi.mock('../automation/browser-orchestrator.js', () => {
  return {
    BrowserOrchestrator: vi.fn().mockImplementation(() => ({
      orchestrate: vi.fn().mockResolvedValue({
        success: true,
        platform: 'LinkedIn',
        jobTitle: 'Staff Engineer',
        company: 'Acme Corp',
        submittedAt: '2026-07-01T12:00:00Z',
      }),
    })),
  };
});

describe('OCFMcpServer Tools', () => {
  let mockDocService: any;
  let ocfServer: OCFMcpServer;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDocService = {
      getCareerContext: vi.fn().mockResolvedValue({
        skills: [
          {
            frontmatter: { type: OKFDocumentType.Skill, title: 'TypeScript', description: 'Typed JS' },
            body: 'Strong experience with TS.',
            conceptId: 'skills/typescript',
            filePath: '/bundle/skills/typescript.md',
          },
        ],
        experiences: [
          {
            frontmatter: { type: OKFDocumentType.Experience, role: 'Senior Engineer', company: 'Tech Inc', startDate: '2020-01-01', current: true },
            body: 'Building cool things.',
            conceptId: 'experiences/senior-tech',
            filePath: '/bundle/experiences/senior-tech.md',
          },
        ],
        preferences: [],
        education: [],
        certificates: [],
        projects: [],
        applications: [],
      }),
      createDocument: vi.fn().mockResolvedValue(undefined),
    };

    ocfServer = new OCFMcpServer(mockDocService);
  });

  it('should list all registered tools', async () => {
    const serverInstance = ocfServer.getServerInstance();
    const registeredTools = (serverInstance as any)._registeredTools;
    expect(registeredTools).toBeDefined();
    expect(registeredTools['read_career_context']).toBeDefined();
    expect(registeredTools['tailor_resume']).toBeDefined();
    expect(registeredTools['orchestrate_application']).toBeDefined();
  });

  describe('read_career_context tool', () => {
    it('should format and return the candidate profile context', async () => {
      const serverInstance = ocfServer.getServerInstance();
      const readTool = (serverInstance as any)._registeredTools['read_career_context'];

      const response = await readTool.handler({});
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('Candidate Professional Profile');
      expect(response.content[0].text).toContain('TypeScript');
      expect(response.content[0].text).toContain('Tech Inc');
    });

    it('should respect includeTypes filter', async () => {
      const serverInstance = ocfServer.getServerInstance();
      const readTool = (serverInstance as any)._registeredTools['read_career_context'];

      // Filter only experiences
      const response = await readTool.handler({ includeTypes: [OKFDocumentType.Experience] });
      expect(response.content[0].text).toContain('Tech Inc');
      expect(response.content[0].text).not.toContain('TypeScript'); // Skill should be filtered out
    });
  });

  describe('tailor_resume tool', () => {
    it('should compile context together with job description', async () => {
      const serverInstance = ocfServer.getServerInstance();
      const tailorTool = (serverInstance as any)._registeredTools['tailor_resume'];

      const response = await tailorTool.handler({
        jobDescription: 'Looking for a TypeScript Staff developer.',
      });
      expect(response.content[0].text).toContain('ATS Resume Tailoring Instructions');
      expect(response.content[0].text).toContain('TypeScript');
      expect(response.content[0].text).toContain('Looking for a TypeScript Staff developer.');
    });

    it('should query Ollama when localGeneration is true', async () => {
      const serverInstance = ocfServer.getServerInstance();
      const tailorTool = (serverInstance as any)._registeredTools['tailor_resume'];

      const spyOllama = vi.spyOn(OllamaService.prototype, 'generateCompletion').mockResolvedValue('Mocked tailored resume content from Ollama');

      const response = await tailorTool.handler({
        jobDescription: 'Looking for a TypeScript Staff developer.',
        localGeneration: true,
      });

      expect(spyOllama).toHaveBeenCalled();
      expect(response.content[0].text).toBe('Mocked tailored resume content from Ollama');
      spyOllama.mockRestore();
    });
  });

  describe('orchestrate_application tool', () => {
    it('should orchestrate application, save document and return success text', async () => {
      const serverInstance = ocfServer.getServerInstance();
      const orchestrateTool = (serverInstance as any)._registeredTools['orchestrate_application'];

      // Wires up mock orchestrator response
      const mockOrchestrate = vi.spyOn(ocfServer['orchestrator'], 'orchestrate');

      const response = await orchestrateTool.handler({
        jobUrl: 'https://linkedin.com/jobs/view/12345',
      });

      expect(mockOrchestrate).toHaveBeenCalledWith(
        'https://linkedin.com/jobs/view/12345',
        expect.any(Object),
        { headless: true, dryRun: false },
      );

      // Verify Application document gets created in the OKF bundle
      expect(mockDocService.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          conceptId: expect.stringContaining('acme-corp'),
          frontmatter: expect.objectContaining({
            type: OKFDocumentType.Application,
            company: 'Acme Corp',
            position: 'Staff Engineer',
            status: ApplicationStatus.Applied,
          }),
        }),
      );

      expect(response.content[0].text).toContain('Successfully submitted application');
    });

    it('should save application as Saved status in dry run mode', async () => {
      const serverInstance = ocfServer.getServerInstance();
      const orchestrateTool = (serverInstance as any)._registeredTools['orchestrate_application'];

      await orchestrateTool.handler({
        jobUrl: 'https://linkedin.com/jobs/view/12345',
        dryRun: true,
      });

      expect(mockDocService.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          frontmatter: expect.objectContaining({
            status: ApplicationStatus.Saved,
          }),
        }),
      );
    });

    it('should return error response if automation fails', async () => {
      const serverInstance = ocfServer.getServerInstance();
      const orchestrateTool = (serverInstance as any)._registeredTools['orchestrate_application'];

      vi.spyOn(ocfServer['orchestrator'], 'orchestrate').mockResolvedValueOnce({
        success: false,
        platform: 'LinkedIn',
        jobTitle: 'Unknown Position',
        company: 'Unknown Company',
        submittedAt: '2026-07-01T12:00:00Z',
        errors: ['Bot detection triggered'],
      });

      const response = await orchestrateTool.handler({
        jobUrl: 'https://linkedin.com/jobs/view/12345',
      });

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Job application failed. Errors encountered');
      expect(response.content[0].text).toContain('Bot detection triggered');
    });
  });
});
