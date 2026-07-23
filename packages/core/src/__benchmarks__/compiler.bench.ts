import { bench, describe } from "vitest";
import { buildKnowledgeIR } from "../ir/build-ir.js";
import path from "path";
import fs from "fs";
import os from "os";

// Generate synthetic bundle with N documents
function generateSyntheticBundle(size: number): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "akcp-bench-"));
  const skillsDir = path.join(tmpDir, "skills");
  fs.mkdirSync(skillsDir, { recursive: true });

  for (let i = 0; i < size; i++) {
    const content = `---
type: skill
name: skill-${i}
level: advanced
lastUsed: 2026-01-01
---

# Skill ${i}

This is a synthetic skill document for benchmarking purposes.
It contains some markdown content with **bold**, *italic*, and [links](./other.md).

## Details

- Category: benchmark
- Proficiency: ${Math.random() > 0.5 ? "expert" : "intermediate"}
- Years: ${Math.floor(Math.random() * 10)}

## Description

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
`;
    fs.writeFileSync(path.join(skillsDir, `skill-${i}.md`), content);
  }

  return tmpDir;
}

describe("Compiler Pipeline Benchmarks", () => {
  const bundle10 = generateSyntheticBundle(10);
  const bundle100 = generateSyntheticBundle(100);
  const bundle1000 = generateSyntheticBundle(1000);

  bench("compile 10 documents", async () => {
    await buildKnowledgeIR(bundle10);
  });

  bench("compile 100 documents", async () => {
    await buildKnowledgeIR(bundle100);
  });

  bench("compile 1000 documents", async () => {
    await buildKnowledgeIR(bundle1000);
  }, { iterations: 5 });

  bench("compile 100 documents with provenance", async () => {
    await buildKnowledgeIR(bundle100, { generateProvenance: true });
  });

  bench("compile 100 documents with privacy redaction", async () => {
    await buildKnowledgeIR(bundle100, {
      privacy: { defaultPiiMode: "redact" },
    });
  });
});
