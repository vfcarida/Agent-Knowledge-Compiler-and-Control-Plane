import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { CompileTarget, TargetConfig, TargetOutput } from './types.js';
import type { AgentKnowledgeIR } from '../ir/types.js';

export class OpenWikiDocsTarget implements CompileTarget {
  public readonly targetType = 'openwiki-docs';

  async compile(ir: AgentKnowledgeIR, config: TargetConfig): Promise<TargetOutput> {
    const outDir = path.resolve(process.cwd(), config.out);
    
    await fs.mkdir(outDir, { recursive: true });
    
    let totalBytes = 0;
    const hash = createHash('sha256');

    // Generate an index.md
    let indexContent = `# Context Knowledge\n\nGenerated automatically from AKCP Compiler.\n\n`;
    
    for (const concept of ir.concepts) {
      const fileName = `${concept.conceptId}.md`;
      const filePath = path.join(outDir, fileName);
      
      const content = `# ${concept.conceptId}\n\n${concept.body}`;
      
      await fs.writeFile(filePath, content, 'utf-8');
      
      hash.update(content);
      totalBytes += Buffer.byteLength(content, 'utf8');
      
      indexContent += `- [${concept.conceptId}](./${fileName})\n`;
    }

    const indexPath = path.join(outDir, 'index.md');
    await fs.writeFile(indexPath, indexContent, 'utf-8');
    
    hash.update(indexContent);
    totalBytes += Buffer.byteLength(indexContent, 'utf8');

    return {
      targetType: this.targetType,
      outputPath: outDir,
      hash: hash.digest('hex'),
      bytesWritten: totalBytes
    };
  }
}
