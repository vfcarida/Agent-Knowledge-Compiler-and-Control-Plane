import type { IOKFRepository } from "../domain/interfaces.js";
import type { OKFDocument, OKFFrontmatter } from "../domain/types.js";
import type { AgentKnowledgeIR } from "../ir/types.js";

/**
 * Decorator for IOKFRepository that uses an in-memory Agent Knowledge IR
 * to serve read operations in O(1) time. Write operations are delegated
 * to the base repository and the cache is updated synchronously.
 */
export class OKFCachedRepository implements IOKFRepository {
  private baseRepository: IOKFRepository;
  private cache: Map<string, OKFDocument>;

  constructor(baseRepository: IOKFRepository, ir: AgentKnowledgeIR) {
    this.baseRepository = baseRepository;
    this.cache = new Map<string, OKFDocument>();
    this.initializeCache(ir);
  }

  private initializeCache(ir: AgentKnowledgeIR) {
    for (const concept of ir.concepts) {
      this.cache.set(concept.conceptId, {
        conceptId: concept.conceptId,
        frontmatter: concept.frontmatter as OKFFrontmatter,
        body: concept.body,
        filePath: concept.source.filePath,
      });
    }
  }

  async findById(conceptId: string): Promise<OKFDocument | null> {
    return this.cache.get(conceptId) || null;
  }

  async findByType(type: string): Promise<OKFDocument[]> {
    const results: OKFDocument[] = [];
    for (const doc of this.cache.values()) {
      if (doc.frontmatter.type === type) {
        results.push(doc);
      }
    }
    return results;
  }

  async findAll(): Promise<OKFDocument[]> {
    return Array.from(this.cache.values());
  }

  async save(document: OKFDocument): Promise<void> {
    // 1. Write to base repository (e.g. disk)
    await this.baseRepository.save(document);
    // 2. Update cache
    this.cache.set(document.conceptId, document);
  }

  async delete(conceptId: string): Promise<void> {
    // 1. Delete from base repository
    await this.baseRepository.delete(conceptId);
    // 2. Remove from cache
    this.cache.delete(conceptId);
  }
}
