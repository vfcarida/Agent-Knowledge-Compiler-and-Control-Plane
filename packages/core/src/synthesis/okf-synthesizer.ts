import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";
import { RegexPiiDetector } from "../privacy/regex-pii-detector.js";
import { NerLiteDetector } from "../privacy/ner-lite-detector.js";

export type SynthesizedConceptType =
  | "Incident"
  | "Runbook"
  | "Policy"
  | "Service"
  | "Architecture"
  | "Skill"
  | "Concept";

export type SynthesizedSensitivity =
  "public" | "internal" | "confidential" | "restricted";

export interface SynthesizedDocument {
  relPath: string;
  conceptId: string;
  title: string;
  type: SynthesizedConceptType;
  sensitivity: SynthesizedSensitivity;
  sensitivityElevated: boolean;
  detectedPiiTypes: string[];
  ttlDays: number;
  freshnessClass: "volatile" | "dynamic" | "evergreen";
  autoLinkedConcepts: string[];
  frontmatter: Record<string, unknown>;
  body: string;
  serializedMarkdown: string;
}

export interface OkfSynthesisOptions {
  inputDir: string;
  outputDir?: string;
  autoLink?: boolean;
  dryRun?: boolean;
  defaultOwners?: string[];
}

export interface OkfSynthesisReport {
  ok: boolean;
  inputDir: string;
  outputDir: string;
  dryRun: boolean;
  autoLink: boolean;
  documentsProcessed: number;
  sensitivityElevations: number;
  semanticLinksInjected: number;
  documents: SynthesizedDocument[];
}

const SENSITIVITY_RANK: Record<SynthesizedSensitivity, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
};

const SECRET_PATTERNS: RegExp[] = [
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /ghp_[A-Za-z0-9]{36}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseRawMarkdown(raw: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const normalized = raw.replace(/\r\n/g, "\n");
  if (normalized.startsWith("---\n")) {
    const endIdx = normalized.indexOf("\n---\n", 4);
    if (endIdx !== -1) {
      const yamlBlock = normalized.slice(4, endIdx);
      const body = normalized.slice(endIdx + 5).trim();
      try {
        const loaded = yaml.load(yamlBlock);
        if (loaded && typeof loaded === "object" && !Array.isArray(loaded)) {
          return {
            frontmatter: loaded as Record<string, unknown>,
            body,
          };
        }
      } catch {
        // Fallback to raw body if frontmatter is malformed
      }
    }
  }
  return { frontmatter: {}, body: normalized.trim() };
}

function inferTitle(
  existingFm: Record<string, unknown>,
  body: string,
  relPath: string,
): string {
  if (typeof existingFm.title === "string" && existingFm.title.trim()) {
    return existingFm.title.trim();
  }
  const h1 = body.match(/^#\s+(.+)$/m);
  if (h1 && h1[1]) {
    return h1[1].trim();
  }
  const base = path.basename(relPath, path.extname(relPath));
  return base
    .split(/[-_]+/)
    .map((w) => (w.length > 0 ? (w[0] ?? "").toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function inferConceptType(
  existingFm: Record<string, unknown>,
  title: string,
  body: string,
  relPath: string,
): SynthesizedConceptType {
  if (typeof existingFm.type === "string" && existingFm.type.trim()) {
    const t = existingFm.type.trim();
    if (
      t === "Incident" ||
      t === "Runbook" ||
      t === "Policy" ||
      t === "Service" ||
      t === "Architecture" ||
      t === "Skill" ||
      t === "Concept"
    ) {
      return t;
    }
  }

  const headerSignals = `${relPath} ${title}`.toLowerCase();
  if (/\b(runbook|playbook|remediation|rollback)\b/.test(headerSignals)) {
    return "Runbook";
  }
  if (/\b(inc-\d+|postmortem|outage|incident)\b/.test(headerSignals)) {
    return "Incident";
  }

  const combined = `${relPath} ${title} ${body}`.toLowerCase();
  if (
    /\b(inc-\d+|postmortem|outage|incident|sev-?[123]|root cause)\b/.test(
      combined,
    )
  ) {
    return "Incident";
  }
  if (
    /\b(runbook|playbook|remediation|troubleshooting|rollback|mitigation steps|step 1)\b/.test(
      combined,
    )
  ) {
    return "Runbook";
  }
  if (
    /\b(policy|compliance|gdpr|hipaa|soc2|governance|forbidden|must not)\b/.test(
      combined,
    )
  ) {
    return "Policy";
  }
  if (
    /\b(service|microservice|sla|slo|availability|latency|endpoint)\b/.test(
      combined,
    )
  ) {
    return "Service";
  }
  if (
    /\b(architecture|rfc|topology|design document|system design)\b/.test(
      combined,
    )
  ) {
    return "Architecture";
  }
  if (/\b(skill|competency|proficiency|certification)\b/.test(combined)) {
    return "Skill";
  }
  return "Concept";
}

function inferLifecycleMetadata(type: SynthesizedConceptType): {
  ttlDays: number;
  freshnessClass: "volatile" | "dynamic" | "evergreen";
} {
  switch (type) {
    case "Incident":
      return { ttlDays: 30, freshnessClass: "volatile" };
    case "Runbook":
    case "Service":
      return { ttlDays: 90, freshnessClass: "dynamic" };
    default:
      return { ttlDays: 180, freshnessClass: "evergreen" };
  }
}

function inferSensitivityAndPii(
  existingFm: Record<string, unknown>,
  body: string,
): {
  sensitivity: SynthesizedSensitivity;
  elevated: boolean;
  detectedTypes: string[];
} {
  const regexDetector = new RegexPiiDetector();
  const nerDetector = new NerLiteDetector();
  const matches = [
    ...regexDetector.detect(body),
    ...nerDetector.detect(body).filter((m) => m.confidence === "high"),
  ];
  const detectedTypes = Array.from(new Set(matches.map((m) => m.type))).sort();

  const hasSecret = SECRET_PATTERNS.some((re) => re.test(body));
  if (hasSecret) {
    detectedTypes.push("SECRET_KEY");
  }

  let baseSensitivity: SynthesizedSensitivity = "internal";
  if (
    existingFm.sensitivity === "public" ||
    existingFm.sensitivity === "internal" ||
    existingFm.sensitivity === "confidential" ||
    existingFm.sensitivity === "restricted"
  ) {
    baseSensitivity = existingFm.sensitivity;
  }

  let requiredSensitivity: SynthesizedSensitivity = baseSensitivity;
  if (
    hasSecret ||
    detectedTypes.includes("SSN") ||
    detectedTypes.includes("CREDIT_CARD")
  ) {
    requiredSensitivity = "restricted";
  } else if (detectedTypes.length > 0) {
    requiredSensitivity = "confidential";
  }

  const finalSensitivity =
    SENSITIVITY_RANK[requiredSensitivity] > SENSITIVITY_RANK[baseSensitivity]
      ? requiredSensitivity
      : baseSensitivity;

  return {
    sensitivity: finalSensitivity,
    elevated:
      SENSITIVITY_RANK[finalSensitivity] > SENSITIVITY_RANK[baseSensitivity],
    detectedTypes,
  };
}

function extractTags(
  existingFm: Record<string, unknown>,
  type: SynthesizedConceptType,
  title: string,
): string[] {
  const existing = Array.isArray(existingFm.tags)
    ? (existingFm.tags as string[]).map((t) => String(t).toLowerCase())
    : [];
  const words = title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);
  return Array.from(
    new Set([type.toLowerCase(), ...existing, ...words.slice(0, 4)]),
  ).sort();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function listInputDocuments(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) return [];
  const files: string[] = [];

  function walk(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.isFile() &&
        (entry.name.endsWith(".md") || entry.name.endsWith(".txt"))
      ) {
        files.push(path.relative(rootDir, full).replace(/\\/g, "/"));
      }
    }
  }

  walk(rootDir);
  return files.sort();
}

/**
 * Autonomously synthesizes governed OKF frontmatter, sensitivity classifications,
 * lifecycle TTLs, and semantic WikiLinks/graph edges from unstructured or partial Markdown/text files.
 */
export async function synthesizeOkfBundle(
  options: OkfSynthesisOptions,
): Promise<OkfSynthesisReport> {
  const inputDir = path.resolve(options.inputDir);
  const outputDir = path.resolve(options.outputDir ?? options.inputDir);
  const autoLink = options.autoLink !== false;
  const dryRun = Boolean(options.dryRun);

  const relFiles = listInputDocuments(inputDir);
  const drafts: SynthesizedDocument[] = [];

  // Pass 1: Synthesize individual document metadata & sensitivity
  for (const relPath of relFiles) {
    const fullPath = path.join(inputDir, relPath);
    const raw = fs.readFileSync(fullPath, "utf-8");
    const { frontmatter: existingFm, body } = parseRawMarkdown(raw);

    const conceptId =
      typeof existingFm.id === "string" && existingFm.id.trim()
        ? existingFm.id.trim()
        : slugify(path.basename(relPath, path.extname(relPath)));

    const title = inferTitle(existingFm, body, relPath);
    const type = inferConceptType(existingFm, title, body, relPath);
    const { ttlDays, freshnessClass } = inferLifecycleMetadata(type);
    const { sensitivity, elevated, detectedTypes } = inferSensitivityAndPii(
      existingFm,
      body,
    );
    const tags = extractTags(existingFm, type, title);

    const synthesizedFm: Record<string, unknown> = {
      ...existingFm,
      id: conceptId,
      title,
      type,
      sensitivity,
      status:
        typeof existingFm.status === "string" ? existingFm.status : "active",
      ttlDays:
        typeof existingFm.ttlDays === "number" ? existingFm.ttlDays : ttlDays,
      freshnessClass:
        typeof existingFm.freshnessClass === "string"
          ? existingFm.freshnessClass
          : freshnessClass,
      tags,
    };

    if (options.defaultOwners && !synthesizedFm.owners) {
      synthesizedFm.owners = options.defaultOwners;
    }

    const outRelPath = relPath.endsWith(".txt")
      ? `${relPath.slice(0, -4)}.md`
      : relPath;

    drafts.push({
      relPath: outRelPath,
      conceptId,
      title,
      type,
      sensitivity,
      sensitivityElevated: elevated,
      detectedPiiTypes: detectedTypes,
      ttlDays: synthesizedFm.ttlDays as number,
      freshnessClass: synthesizedFm.freshnessClass as
        "volatile" | "dynamic" | "evergreen",
      autoLinkedConcepts: [],
      frontmatter: synthesizedFm,
      body,
      serializedMarkdown: "",
    });
  }

  let semanticLinksInjected = 0;

  // Pass 2: Semantic Auto-Linking across the synthesized bundle
  if (autoLink && drafts.length > 1) {
    for (const doc of drafts) {
      let updatedBody = doc.body;
      const linkedIds: string[] = [];

      for (const candidate of drafts) {
        if (candidate.conceptId === doc.conceptId) continue;

        // Skip if already linked via [[conceptId]]
        const existingWikiLinkRegex = new RegExp(
          `\\[\\[${escapeRegex(candidate.conceptId)}(?:\\|[^\\]]+)?\\]\\]`,
          "i",
        );
        if (existingWikiLinkRegex.test(updatedBody)) {
          linkedIds.push(candidate.conceptId);
          continue;
        }

        // Match either conceptId or title (>= 4 chars) outside existing [[...]]
        const termsToMatch = [candidate.conceptId];
        if (candidate.title.length >= 4) {
          termsToMatch.push(candidate.title);
        }

        let matched = false;
        for (const term of termsToMatch) {
          const pattern = new RegExp(
            `(?<!\\[\\[)\\b(${escapeRegex(term)})\\b(?!\\]\\])`,
            "i",
          );
          if (pattern.test(updatedBody)) {
            updatedBody = updatedBody.replace(pattern, (match) => {
              return match.toLowerCase() === candidate.conceptId.toLowerCase()
                ? `[[${candidate.conceptId}]]`
                : `[[${candidate.conceptId}|${match}]]`;
            });
            matched = true;
            break;
          }
        }

        if (matched) {
          linkedIds.push(candidate.conceptId);
          semanticLinksInjected++;
        }
      }

      if (linkedIds.length > 0) {
        doc.autoLinkedConcepts = Array.from(new Set(linkedIds)).sort();
        doc.body = updatedBody;

        // Populate typed relationships in frontmatter
        const dependsOn = new Set<string>(
          Array.isArray(doc.frontmatter.depends_on)
            ? (doc.frontmatter.depends_on as string[])
            : [],
        );
        const mitigates = new Set<string>(
          Array.isArray(doc.frontmatter.mitigates)
            ? (doc.frontmatter.mitigates as string[])
            : [],
        );
        const references = new Set<string>(
          Array.isArray(doc.frontmatter.references)
            ? (doc.frontmatter.references as string[])
            : [],
        );

        for (const targetId of doc.autoLinkedConcepts) {
          const targetDoc = drafts.find((d) => d.conceptId === targetId);
          if (!targetDoc) continue;
          if (doc.type === "Runbook" && targetDoc.type === "Incident") {
            mitigates.add(targetId);
          } else if (
            (doc.type === "Runbook" || doc.type === "Incident") &&
            targetDoc.type === "Service"
          ) {
            dependsOn.add(targetId);
          } else {
            references.add(targetId);
          }
        }

        if (dependsOn.size > 0) {
          doc.frontmatter.depends_on = Array.from(dependsOn).sort();
        }
        if (mitigates.size > 0) {
          doc.frontmatter.mitigates = Array.from(mitigates).sort();
        }
        if (references.size > 0) {
          doc.frontmatter.references = Array.from(references).sort();
        }
      }
    }
  }

  // Final pass: serialize & optionally write to disk
  for (const doc of drafts) {
    const yamlBlock = yaml
      .dump(doc.frontmatter, { sortKeys: true, lineWidth: 120 })
      .trim();
    doc.serializedMarkdown = `---\n${yamlBlock}\n---\n\n${doc.body.trim()}\n`;

    if (!dryRun) {
      const targetPath = path.join(outputDir, doc.relPath);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, doc.serializedMarkdown, "utf-8");
    }
  }

  return {
    ok: true,
    inputDir,
    outputDir,
    dryRun,
    autoLink,
    documentsProcessed: drafts.length,
    sensitivityElevations: drafts.filter((d) => d.sensitivityElevated).length,
    semanticLinksInjected,
    documents: drafts,
  };
}
