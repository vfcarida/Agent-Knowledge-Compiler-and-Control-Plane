import { describe, it, expect } from 'vitest';
import path from 'path';
import { buildKnowledgeIR } from '../../ir/build-ir.js';
import { AgentKnowledgeIRSchema } from '../../ir/schema.js';

describe('buildKnowledgeIR', () => {
  const sampleBundlePath = path.resolve(process.cwd(), '../../sample-data/.okf');

  it('should compile sample-data/.okf into valid IR', async () => {
    const ir = await buildKnowledgeIR(sampleBundlePath, { bundleId: 'test-bundle' });

    // Ensure it conforms to the schema
    const parsed = AgentKnowledgeIRSchema.parse(ir);

    expect(parsed.irVersion).toBe('1.0.0');
    expect(parsed.bundleId).toBe('test-bundle');
    expect(parsed.concepts.length).toBeGreaterThan(0);

    // Verify budget calculation
    const firstConcept = parsed.concepts[0];
    expect(firstConcept).toBeDefined();
    expect(firstConcept?.budget.byteSize).toBeGreaterThan(0);
    expect(firstConcept?.budget.estimatedTokens).toBeGreaterThan(0);

    // Verify source
    expect(firstConcept?.source.format).toBe('okf/markdown');
    
    // Verify unknown fields preserved in frontmatter
    expect(firstConcept?.frontmatter.type).toBeDefined();
  });
});
