const fs = require('fs');
const file = 'packages/cli/src/index.ts';
let content = fs.readFileSync(file, 'utf8');

const importsToAdd = `
import {
  scanWorkspace,
  writeScanSuggestions,
  loadAkcpConfig,
  buildKnowledgeIR,
  IrJsonTarget,
  OpenWikiDocsTarget,
  AgentsMdTarget,
  McpResourcesManifestTarget,
  PolicyBundleTarget,
  EvalDatasetTarget,
  DashboardMetadataTarget,
  ProvenanceManifestBuilder,
  hashConfig,
  verifyManifest,
  importSource,
  syncAgentInstructions,
  loadPolicy,
  explainPolicy,
} from "@akcp/core";
import { ConformanceRunner } from "@akcp/conformance";
import crypto from "crypto";
import { spawn } from "child_process";
import { EvalsHarness } from "@akcp/evals";
import { runScenarios } from "@akcp/evals/dist/scenarios.js";
`;

content = content.replace(/import \{ createRequire \} from "module";\n/, 'import { createRequire } from "module";\n' + importsToAdd + '\n');

// Clean up all the dynamic imports
content = content.replace(/\s*const\s*\{\s*scanWorkspace,\s*writeScanSuggestions\s*\}\s*=\s*await\s*import\("@akcp\/core"\);/, '');
content = content.replace(/\s*const\s*\{[\s\S]*?\}\s*=\s*await\s*import\("@akcp\/core"\);/g, '');
content = content.replace(/\s*const\s*\{\s*ConformanceRunner\s*\}\s*=\s*await\s*import\("@akcp\/conformance"\);/, '');
content = content.replace(/\s*const\s*crypto\s*=\s*await\s*import\("crypto"\);/, '');
content = content.replace(/\s*const\s*\{\s*spawn\s*\}\s*=\s*await\s*import\("child_process"\);/, '');
content = content.replace(/\s*const\s*\{\s*EvalsHarness\s*\}\s*=\s*await\s*import\("@akcp\/evals"\);/, '');
content = content.replace(/\s*const\s*\{\s*runScenarios\s*\}\s*=\s*await\s*import\("@akcp\/evals\/dist\/scenarios\.js"\);/, '');
content = content.replace(/\s*const\s*path\s*=\s*await\s*import\("path"\);/g, '');
content = content.replace(/\s*const\s*fs\s*=\s*await\s*import\("fs"\);/g, '');

fs.writeFileSync(file, content);
console.log('CLI dynamic imports removed.');
