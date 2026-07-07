import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { IOKFRepository, IIndexService, ILogService } from '../domain/interfaces.js';
import type { OKFDocument, LogEntry } from '../domain/types.js';
import { OKFDocumentService } from '../services/okf-document-service.js';

describe('OKFDocumentService', () => {
  let mockRepository: {
    [K in keyof IOKFRepository]: ReturnType<typeof vi.fn>;
  };
  let mockIndexService: {
    [K in keyof IIndexService]: ReturnType<typeof vi.fn>;
  };
  let mockLogService: {
    [K in keyof ILogService]: ReturnType<typeof vi.fn>;
  };
  let service: OKFDocumentService;
  const bundleRoot = '/bundle';

  const makeDocument = (overrides: Partial<OKFDocument> = {}): OKFDocument => ({
    frontmatter: { type: 'Skill', title: 'TypeScript', description: 'Typed JS' },
    body: 'TypeScript proficiency content.',
    filePath: '/bundle/skills/typescript.md',
    conceptId: 'skills/typescript',
    ...overrides,
  });

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByType: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    mockIndexService = {
      generate: vi.fn().mockResolvedValue('# Index\n| Title | Type |\n'),
    };

    mockLogService = {
      append: vi.fn().mockResolvedValue(undefined),
      getEntries: vi.fn().mockResolvedValue([]),
    };

    service = new OKFDocumentService(
      mockRepository,
      mockIndexService,
      mockLogService,
      bundleRoot,
    );
  });

  it('should create document, update index, and log creation', async () => {
    const doc = makeDocument();

    await service.createDocument(doc);

    // Document should be saved
    expect(mockRepository.save).toHaveBeenCalledWith(doc);

    // Index should be regenerated
    expect(mockIndexService.generate).toHaveBeenCalled();

    // Creation should be logged
    expect(mockLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringContaining('created'),
        conceptId: 'skills/typescript',
      }),
    );
  });

  it('should update document and log the change', async () => {
    const doc = makeDocument({
      frontmatter: { type: 'Skill', title: 'TypeScript', description: 'Updated description' },
    });
    mockRepository.findById.mockResolvedValue(makeDocument());

    await service.updateDocument(doc);

    // Document should be saved with updated content (ignoring dynamic timestamp)
    expect(mockRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        conceptId: doc.conceptId,
        body: doc.body,
        frontmatter: expect.objectContaining({
          type: doc.frontmatter.type,
          title: doc.frontmatter.title,
          description: doc.frontmatter.description,
        }),
      }),
    );

    // Change should be logged
    expect(mockLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringContaining('updated'),
        conceptId: 'skills/typescript',
      }),
    );
  });

  it('should delete document, update index, and log deletion', async () => {
    const doc = makeDocument();
    mockRepository.findById.mockResolvedValue(doc);

    await service.deleteDocument('skills/typescript');

    // Document should be deleted from repository
    expect(mockRepository.delete).toHaveBeenCalledWith('skills/typescript');

    // Index should be regenerated
    expect(mockIndexService.generate).toHaveBeenCalled();

    // Deletion should be logged
    expect(mockLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringContaining('deleted'),
        conceptId: 'skills/typescript',
      }),
    );
  });

  it('should aggregate career context by type', async () => {
    const skillDoc = makeDocument();
    const experienceDoc = makeDocument({
      frontmatter: { type: 'Experience', title: 'Acme Corp', company: 'Acme Corp' },
      conceptId: 'experiences/senior-dev-acme',
      filePath: '/bundle/experiences/senior-dev-acme.md',
    });

    mockRepository.findByType
      .mockImplementation(async (type: string) => {
        switch (type) {
          case 'Skill': return [skillDoc];
          case 'Experience': return [experienceDoc];
          default: return [];
        }
      });

    const context = await service.getCareerContext();

    expect(context.skills).toHaveLength(1);
    expect(context.skills[0].conceptId).toBe('skills/typescript');
    expect(context.experiences).toHaveLength(1);
    expect(context.experiences[0].conceptId).toBe('experiences/senior-dev-acme');
    expect(context.education).toHaveLength(0);
    expect(context.certificates).toHaveLength(0);
    expect(context.projects).toHaveLength(0);
    expect(context.preferences).toHaveLength(0);
    expect(context.applications).toHaveLength(0);
  });

  it('should delegate getDocument to repository', async () => {
    const doc = makeDocument();
    mockRepository.findById.mockResolvedValue(doc);

    const result = await service.getDocument('skills/typescript');

    expect(mockRepository.findById).toHaveBeenCalledWith('skills/typescript');
    expect(result).toEqual(doc);
  });
});
