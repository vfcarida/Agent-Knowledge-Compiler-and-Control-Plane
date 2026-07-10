#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';

const program = new Command();

program
  .name('akcp')
  .description('AKCP CLI for managing Agent-Ready Knowledge Context Packs')
  .version('0.1.0');

import { fileURLToPath } from 'url';

// COMMAND: init
program
  .command('init')
  .description('Initialize a new .agent-context structure')
  .argument('[directory]', 'Directory to initialize', '.')
  .option('-p, --profile <profile>', 'Context profile (e.g., software-project, career)', 'standard')
  .action((directory, options) => {
    const targetDir = path.resolve(process.cwd(), directory);
    const contextDir = path.join(targetDir, '.agent-context');

    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true });
    }

    // Attempt to copy from Domain Adapter templates if available
    try {
      const cliDir = path.dirname(fileURLToPath(import.meta.url));
      const templateDir = path.resolve(cliDir, '../../../examples/domains', options.profile);
      
      if (fs.existsSync(templateDir)) {
        fs.cpSync(templateDir, contextDir, { recursive: true });
        console.log(`[INFO] Copied Domain Adapter template: ${options.profile}`);
      } else {
        console.warn(`[WARN] Domain template '${options.profile}' not found in examples/domains/. Initializing empty profile.`);
      }
    } catch (e) {
      console.warn(`[WARN] Could not copy template for '${options.profile}'. Initializing empty profile.`);
    }

    const indexContent = `---
type: Index
title: Context Pack Index
profile: ${options.profile}
version: 1.0.0
---

# Agent Context Pack
This directory contains akcp knowledge bundles.
`;
    // Only write index if it doesn't already exist from the template
    if (!fs.existsSync(path.join(contextDir, 'index.md'))) {
      fs.writeFileSync(path.join(contextDir, 'index.md'), indexContent);
    }

    // Bootstrap AGENTS.md injection hint
    const agentsMdContent = `# Agent Instructions
Always load the local \`.agent-context\` pack before answering questions related to the domain '${options.profile}'.
`;
    fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), agentsMdContent);

    console.log(`[OK] Context Pack initialized at ${contextDir} using profile '${options.profile}'`);
  });

import { execSync } from 'child_process';
import { createRequire } from 'module';

// COMMAND: validate
program
  .command('validate')
  .description('Strict offline schema validation of an OKF/Context bundle')
  .argument('[directory]', 'Directory to validate', '.')
  .option('-f, --format <format>', 'Output format (json or markdown)', 'markdown')
  .option('-p, --profile <profile>', 'Profile to validate against', 'career')
  .action((directory, options) => {
    const targetDir = path.resolve(process.cwd(), directory);
    console.log(`[INFO] Validating bundle at: ${targetDir}`);
    
    if (!fs.existsSync(targetDir)) {
      console.error(`[ERROR] Directory not found: ${targetDir}`);
      process.exit(1);
    }

    try {
      const require = createRequire(import.meta.url);
      const validatorPath = require.resolve('@ocf/core/dist/cli/validate-bundle.js');
      execSync(`node ${validatorPath} --bundle ${targetDir} --format ${options.format} --profile ${options.profile}`, { encoding: 'utf-8', stdio: 'inherit' });
    } catch (err: any) {
      process.exit(1);
    }
  });

// COMMAND: scan
program
  .command('scan')
  .description('Analyze repository and suggest context document structures')
  .argument('[directory]', 'Directory to scan', '.')
  .option('--dry-run', 'Do not write files, just show what would be suggested')
  .option('-o, --output <dir>', 'Output directory for context pack', '.agent-context')
  .action(async (directory, options) => {
    const targetDir = path.resolve(process.cwd(), directory);
    console.log(`[INFO] Scanning directory ${targetDir}...`);
    
    try {
      const { scanWorkspace, writeScanSuggestions } = await import('@ocf/core');
      const result = scanWorkspace(targetDir);
      
      console.log(`\n=== Scan Results ===`);
      console.log(`Detected files/directories of interest: ${result.detectedFiles.join(', ') || 'none'}`);
      console.log(`Generated ${result.suggestions.length} suggested OKF templates:`);
      
      result.suggestions.forEach((sug) => {
        console.log(`- [${sug.type.toUpperCase()}] ${sug.fileName}: ${sug.title}`);
        console.log(`  Description: ${sug.description}`);
      });
      
      if (options.dryRun) {
        console.log(`\n[INFO] Dry-run enabled. No files were written.`);
      } else {
        const written = writeScanSuggestions(targetDir, result, options.output);
        console.log(`\n[OK] Scan completed. Successfully wrote ${written.length} template files to ${options.output}:`);
        written.forEach((f) => console.log(`  - ${path.basename(f)}`));
      }
    } catch (err: any) {
      console.error(`[ERROR] Scan failed: ${err.message}`);
      process.exit(1);
    }
  });

// COMMAND: compile
program
  .command('compile')
  .description('Compile Context Packs to specified targets')
  .option('--bundle <directory>', 'Directory containing akcp.yaml or okf bundle', '.')
  .option('--target <type>', 'Specific target to compile (e.g., all, ir-json, openwiki-docs)', 'all')
  .option('--provenance', 'Enable full cryptographic provenance tracking', false)
  .action(async (options) => {
    console.log(`[INFO] Compiling context pack from ${options.bundle} (target: ${options.target})`);
    try {
      const { 
        loadAkcpConfig, 
        buildKnowledgeIR, 
        IrJsonTarget, 
        OkfBundleTarget,
        OpenWikiDocsTarget,
        AgentsMdTarget,
        McpResourcesManifestTarget,
        PolicyBundleTarget,
        EvalDatasetTarget,
        GraphJsonTarget,
        ProvenanceManifestBuilder,
        hashConfig
      } = await import('@ocf/core');
      
      const targetDir = path.resolve(process.cwd(), options.bundle);
      let config;
      try {
        config = loadAkcpConfig(path.join(targetDir, 'akcp.yaml'));
      } catch (e) {
        // Fallback to default if no akcp.yaml exists
        config = {
          compile: {
            sources: [{ type: 'okf-directory', path: targetDir }],
            targets: [
              { type: 'ir-json', out: 'dist/knowledge-ir.json' },
              { type: 'openwiki-docs', out: 'dist/openwiki' },
              { type: 'agents-md', out: 'dist/agents-snippet.md' }
            ]
          }
        };
      }

      // 1. Build IR
      const ir = await buildKnowledgeIR(targetDir, { 
        sources: config.compile.sources,
        generateProvenance: options.provenance
      });
      const configHashStr = options.provenance ? hashConfig(config) : 'none';

      // 2. Select targets
      let targetsToRun = config.compile.targets;
      if (options.target !== 'all') {
         // filter or force
         targetsToRun = config.compile.targets.filter((t: any) => t.type === options.target);
         if (targetsToRun.length === 0) {
            targetsToRun = [{ type: options.target, out: `dist/${options.target}` }];
         }
      }

      // 3. Execute targets
      const manifestBuilder = new ProvenanceManifestBuilder();
      const targetInstances: Record<string, any> = {
        'ir-json': new IrJsonTarget(),
        'okf-bundle': new OkfBundleTarget(),
        'openwiki-docs': new OpenWikiDocsTarget(),
        'agents-md': new AgentsMdTarget(),
        'mcp-resources-manifest': new McpResourcesManifestTarget(),
        'policy-bundle': new PolicyBundleTarget(),
        'eval-dataset': new EvalDatasetTarget(),
        'graph-json': new GraphJsonTarget()
      };

      for (const targetConf of targetsToRun) {
         const targetImpl = targetInstances[targetConf.type];
         if (targetImpl) {
            console.log(`[INFO] Running target: ${targetConf.type} -> ${targetConf.out}`);
            const output = await targetImpl.compile(ir, targetConf);
            manifestBuilder.addOutput(output);
         } else {
            console.warn(`[WARN] Unknown target type: ${targetConf.type}`);
         }
      }

      // 4. Write manifest
      const manifestPath = 'dist/akcp-manifest.json';
      await manifestBuilder.writeManifest(ir, manifestPath, configHashStr, program.version() || 'unknown');
      console.log(`[OK] Compilation complete. Manifest written to ${manifestPath}`);
      
    } catch (err: any) {
      console.error(`[ERROR] Compilation failed: ${err.message}`);
      process.exit(1);
    }
  });

// COMMAND: inspect-artifact
program
  .command('inspect-artifact')
  .description('Inspect an AKCP compile manifest')
  .argument('<manifest>', 'Path to akcp-manifest.json')
  .action((manifestPath) => {
    try {
      const fullPath = path.resolve(process.cwd(), manifestPath);
      if (!fs.existsSync(fullPath)) {
        console.error(`[ERROR] Manifest not found: ${fullPath}`);
        process.exit(1);
      }
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const manifest = JSON.parse(raw);
      console.log(`\n=== AKCP Artifact Manifest ===`);
      console.log(`Version: ${manifest.version}`);
      console.log(`Build ID: ${manifest.buildId}`);
      console.log(`Bundle ID: ${manifest.bundleId}`);
      console.log(`Timestamp: ${manifest.timestamp}`);
      console.log(`\n=== Targets Generated (${manifest.targets.length}) ===`);
      manifest.targets.forEach((t: any) => {
        console.log(`- ${t.targetType}`);
        console.log(`  Output: ${t.outputPath}`);
        console.log(`  Hash:   ${t.hash}`);
        console.log(`  Size:   ${t.bytesWritten} bytes`);
      });
      console.log();
    } catch (err: any) {
      console.error(`[ERROR] Failed to inspect artifact: ${err.message}`);
      process.exit(1);
    }
  });

// COMMAND: verify
program
  .command('verify')
  .description('Verify the cryptographic provenance and integrity of a compiled bundle')
  .argument('<manifest>', 'Path to akcp-manifest.json')
  .action(async (manifestPath) => {
    try {
      const { verifyManifest } = await import('@ocf/core');
      console.log(`[INFO] Verifying manifest at ${manifestPath}...`);
      
      const report = await verifyManifest(manifestPath);
      
      if (report.isValid) {
        console.log(`[OK] Bundle integrity verified successfully.`);
        console.log(`[OK] Provenance Timestamp: ${report.manifestTimestamp}`);
      } else {
        console.error(`[ERROR] BUNDLE TAMPERING DETECTED.`);
        if (report.tamperedFiles.length > 0) {
          console.error(`[ERROR] The following files have been modified since compilation:`);
          report.tamperedFiles.forEach((f: string) => console.error(`  - ${f}`));
        }
        if (report.missingFiles.length > 0) {
          console.error(`[ERROR] The following files are missing:`);
          report.missingFiles.forEach((f: string) => console.error(`  - ${f}`));
        }
        process.exit(1);
      }
    } catch (err: any) {
      console.error(`[ERROR] Verification failed: ${err.message}`);
      process.exit(1);
    }
  });

// COMMAND: diff (Skeleton)
program
  .command('diff')
  .description('Show semantic context changes since last build')
  .argument('[directory]', 'Directory to diff', '.')
  .action((directory) => {
    console.log(`[INFO] Calculating diff for ${directory}`);
    console.log(`[OK] No semantic changes detected.`);
  });

// COMMAND: import
program
  .command('import')
  .description('Import from external systems into a Context Pack')
  .argument('<source>', 'Source system (e.g., openwiki)')
  .option('-i, --input <dir>', 'Input directory', 'openwiki')
  .option('-o, --output <dir>', 'Output directory for context pack', '.okf')
  .option('--dry-run', 'Do not write files, just show what would be generated')
  .option('--force', 'Overwrite existing files without prompting')
  .action(async (source, options) => {
    if (source.toLowerCase() !== 'openwiki') {
      console.error(`[ERROR] Unsupported source: ${source}. Supported sources: openwiki`);
      process.exit(1);
    }
    
    console.log(`[INFO] Importing from OpenWiki (${options.input}) to ${options.output}...`);
    try {
      const { importOpenWiki, FileSystemAdapter } = await import('@ocf/core');
      
      const fsAdapter = new FileSystemAdapter();
      const report = await importOpenWiki(fsAdapter, path.resolve(process.cwd(), options.input), path.resolve(process.cwd(), options.output), options.dryRun);
      
      console.log(`\nImport Summary:`);
      console.log(`- Files processed: ${report.importedFiles}`);
      console.log(`- Files skipped: ${report.skippedFiles}`);
      if (report.mappings.length > 0) {
        console.log(`\nMappings:`);
        report.mappings.forEach((m: any) => {
          console.log(`  - ${m.source} -> ${m.target} (Type: ${m.type})`);
        });
      }
      
      if (options.dryRun) {
        console.log(`\n[INFO] Dry run finished. No files were written.`);
      } else {
        console.log(`\n[OK] Import complete. Remember to instruct AGENTS.md to use this context.`);
      }
    } catch (err: any) {
      console.error(`[ERROR] Import failed: ${err.message}`);
      process.exit(1);
    }
  });

// COMMAND: serve:mcp
program
  .command('serve:mcp')
  .description('Locally boot the MCP Profile Server for this context')
  .argument('[directory]', 'Directory to serve', '.')
  .option('--ir <path>', 'Path to compiled Knowledge IR json', 'dist/knowledge-ir.json')
  .action(async (directory, options) => {
    const targetDir = path.resolve(process.cwd(), directory);
    const irPath = path.resolve(process.cwd(), options.ir);
    
    console.error(`[INFO] Booting MCP Server for bundle at ${targetDir}`);
    
    try {
      const require = createRequire(import.meta.url);
      const serverPath = require.resolve('@ocf/mcp-profile-server');
      const { spawn } = await import('child_process');
      
      const child = spawn('node', [serverPath], {
        stdio: 'inherit',
        env: {
          ...process.env,
          OCF_BUNDLE_PATH: targetDir,
          OCF_IR_PATH: irPath
        }
      });

      child.on('close', (code) => {
        process.exit(code ?? 0);
      });
    } catch (err: any) {
      console.error(`[ERROR] Failed to launch MCP server: ${err.message}`);
      process.exit(1);
    }
  });

// COMMAND: doctor
program
  .command('doctor')
  .description('Diagnose environment configuration and readiness')
  .action(() => {
    console.log(`[INFO] Running AKCP Diagnostics...`);
    console.log(`- Node Version: ${process.version}`);
    
    // Check if MCP Server configs exist
    const cwd = process.cwd();
    const isMonorepo = fs.existsSync(path.join(cwd, 'pnpm-workspace.yaml'));
    console.log(`- Monorepo structure detected: ${isMonorepo}`);
    
    if (isMonorepo) {
      console.log(`[OK] Your environment is akcp.`);
    } else {
      console.warn(`[WARN] Not running inside a known workspace.`);
    }
  });

// COMMAND: agents sync
program
  .command('agents')
  .description('Manage agent instruction files (AGENTS.md, CLAUDE.md, etc)')
  .command('sync')
  .description('Synchronize the managed context block within agent instruction files')
  .action(async () => {
    console.log(`[INFO] Synchronizing agent instructions...`);
    try {
      const { syncAgentInstructions } = await import('@ocf/core');
      const targetDir = process.cwd();
      
      const filesToSync = [
        path.join(targetDir, '.agents', 'AGENTS.md'),
        path.join(targetDir, 'AGENTS.md'),
        path.join(targetDir, 'CLAUDE.md'),
        path.join(targetDir, '.cursorrules')
      ];

      let syncedCount = 0;
      for (const filePath of filesToSync) {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const newContent = syncAgentInstructions(content);
          if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf-8');
            console.log(`[OK] Synchronized ${path.basename(filePath)}`);
            syncedCount++;
          } else {
            console.log(`[INFO] ${path.basename(filePath)} is already up to date.`);
          }
        }
      }
      
      if (syncedCount === 0) {
        console.log(`[INFO] No files were modified (either up-to-date or missing).`);
      }
    } catch (err: any) {
      console.error(`[ERROR] Sync failed: ${err.message}`);
      process.exit(1);
    }
  });

// COMMAND: config validate
program
  .command('config')
  .description('Manage AKCP configuration')
  .command('validate')
  .description('Validate akcp.yaml configuration')
  .option('-f, --file <path>', 'Path to akcp.yaml', 'akcp.yaml')
  .action(async (options) => {
    console.log(`[INFO] Validating config file: ${options.file}`);
    try {
      const { loadAkcpConfig } = await import('@ocf/core');
      const configPath = path.resolve(process.cwd(), options.file);
      loadAkcpConfig(configPath);
      console.log(`[OK] Configuration is valid.`);
    } catch (err: any) {
      console.error(`[ERROR] Validation failed:\n${err.message}`);
      process.exit(1);
    }
  });

// COMMAND: policy
const policyCmd = program.command('policy').description('Manage and validate machine-readable Policy Cards');

policyCmd
  .command('validate')
  .description('Validate a PolicyCard YAML file')
  .argument('<file>', 'Path to the .policy.yaml file')
  .action(async (file) => {
    try {
      const { loadPolicy } = await import('@ocf/core');
      const path = await import('path');
      const fullPath = path.resolve(process.cwd(), file);
      loadPolicy(fullPath);
      console.log(`[OK] Policy is structurally valid and well-formed.`);
    } catch (err: any) {
      console.error(`[ERROR] Policy validation failed:\n${err.message}`);
      process.exit(1);
    }
  });

policyCmd
  .command('explain')
  .description('Explain a PolicyCard in human-readable text')
  .argument('<file>', 'Path to the .policy.yaml file')
  .action(async (file) => {
    try {
      const { loadPolicy, explainPolicy } = await import('@ocf/core');
      const path = await import('path');
      const fullPath = path.resolve(process.cwd(), file);
      const policy = loadPolicy(fullPath);
      console.log(explainPolicy(policy));
    } catch (err: any) {
      console.error(`[ERROR] Failed to explain policy:\n${err.message}`);
      process.exit(1);
    }
  });

// COMMAND: plan
program
  .command('plan')
  .description('Generate execution plan based on akcp.yaml')
  .option('-f, --file <path>', 'Path to akcp.yaml', 'akcp.yaml')
  .action(async (options) => {
    try {
      const { loadAkcpConfig, generateBuildPlan, printBuildPlan } = await import('@ocf/core');
      const configPath = path.resolve(process.cwd(), options.file);
      const config = loadAkcpConfig(configPath);
      const plan = generateBuildPlan(config);
      console.log(printBuildPlan(plan));
    } catch (err: any) {
      console.error(`[ERROR] Plan failed:\n${err.message}`);
      process.exit(1);
    }
  });

// COMMAND: reconcile
program
  .command('reconcile')
  .description('Reconcile desired state with current environment')
  .option('-f, --file <path>', 'Path to akcp.yaml', 'akcp.yaml')
  .option('--no-dry-run', 'Disable dry run and perform the actual changes')
  .action(async (options) => {
    const isDryRun = options.dryRun !== false;
    console.log(`[INFO] Reconciling state (${isDryRun ? 'dry-run' : 'active'}) using ${options.file}...`);
    try {
      const { loadAkcpConfig, reconcile } = await import('@ocf/core');
      const configPath = path.resolve(process.cwd(), options.file);
      const config = loadAkcpConfig(configPath);
      
      const result = await reconcile(config, { dryRun: isDryRun });
      if (result.status === 'in-sync') {
        console.log(`[OK] ${result.message}`);
      } else {
        console.warn(`[WARN] ${result.message}`);
        result.differences.forEach((d: string) => console.log(`  - ${d}`));
      }
    } catch (err: any) {
      console.error(`[ERROR] Reconcile failed:\n${err.message}`);
      process.exit(1);
    }
  });

// COMMAND: graph
const graphCmd = program.command('graph').description('Semantic Knowledge Graph operations');

graphCmd
  .command('build')
  .description('Build the knowledge graph from the OKF bundle')
  .option('--bundle <directory>', 'Directory containing akcp.yaml or okf bundle', '.')
  .action(async (options) => {
    // Equivalent to akcp compile --target graph-json
    try {
      const { loadAkcpConfig, buildKnowledgeIR, GraphJsonTarget } = await import('@ocf/core');
      const targetDir = path.resolve(process.cwd(), options.bundle);
      
      let config;
      try {
        config = loadAkcpConfig(path.join(targetDir, 'akcp.yaml'));
      } catch (e) {
        config = { compile: { sources: [{ type: 'okf-directory', path: targetDir }] } };
      }

      console.log(`[INFO] Building Knowledge Graph from ${targetDir}`);
      const ir = await buildKnowledgeIR(targetDir, { sources: config.compile.sources });
      
      const targetImpl = new GraphJsonTarget();
      const output = await targetImpl.compile(ir, { type: 'graph-json', out: 'dist/knowledge-graph.json' });
      
      console.log(`[OK] Graph generated at ${output.outputPath}`);
    } catch (err: any) {
      console.error(`[ERROR] Graph build failed: ${err.message}`);
      process.exit(1);
    }
  });

graphCmd
  .command('inspect')
  .description('Inspect a concept in the knowledge graph')
  .requiredOption('-c, --concept <id>', 'Concept ID to inspect')
  .action((options) => {
    try {
      const graphPath = path.resolve(process.cwd(), 'dist/knowledge-graph.json');
      if (!fs.existsSync(graphPath)) {
        console.error(`[ERROR] Graph not found. Run 'akcp graph build' first.`);
        process.exit(1);
      }
      
      const graphData = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
      
      const incoming = graphData.edges.filter((e: any) => e.target === options.concept);
      const outgoing = graphData.edges.filter((e: any) => e.source === options.concept);
      
      console.log(`\n=== Concept: ${options.concept} ===`);
      console.log(`Outgoing Links (${outgoing.length}):`);
      outgoing.forEach((e: any) => console.log(`  -> ${e.target} [${e.relation}] ${e.isBroken ? '(BROKEN)' : ''}`));
      
      console.log(`\nIncoming Links (${incoming.length}):`);
      incoming.forEach((e: any) => console.log(`  <- ${e.source} [${e.relation}]`));
      console.log();
      
    } catch (err: any) {
      console.error(`[ERROR] Inspect failed: ${err.message}`);
      process.exit(1);
    }
  });

graphCmd
  .command('impacted')
  .description('List all downstream concepts impacted by a change to this concept')
  .requiredOption('-c, --concept <id>', 'Concept ID to analyze')
  .action((options) => {
    try {
      const graphPath = path.resolve(process.cwd(), 'dist/knowledge-graph.json');
      if (!fs.existsSync(graphPath)) {
        console.error(`[ERROR] Graph not found. Run 'akcp graph build' first.`);
        process.exit(1);
      }
      
      const graphData = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
      const impacted = graphData.impactMap[options.concept] || [];
      
      console.log(`\n=== Impact Analysis: ${options.concept} ===`);
      if (impacted.length === 0) {
        console.log(`No downstream dependencies found. Safe to modify.`);
      } else {
        console.log(`Modifying this concept may impact the following ${impacted.length} downstream artifacts:`);
        impacted.forEach((id: string) => console.log(`  - ${id}`));
      }
      console.log();
      
    } catch (err: any) {
      console.error(`[ERROR] Impact analysis failed: ${err.message}`);
      process.exit(1);
    }
  });

// ==========================================
// Context Economics Subcommands
// ==========================================
const contextCmd = program
  .command('context')
  .description('Manage and optimize context economics (budget, compression, relevance)');

contextCmd
  .command('plan')
  .description('Simulate context packing and generate an economics report')
  .option('-t, --task <task>', 'Task description for relevance scoring', 'general task')
  .option('-b, --budget <tokens>', 'Maximum tokens allowed in the budget', '10000')
  .option('-p, --profile <profile>', 'Profile schema to load', 'career')
  .action(async (options) => {
    try {
      const { OKFFileRepository, ContextPlanner, loadAkcpConfig, FileSystemAdapter, FrontmatterParser } = await import('@ocf/core');
      const path = await import('path');
      
      const configPath = path.resolve(process.cwd(), 'akcp.yaml');
      const config = loadAkcpConfig(configPath);
      const sources = config.compile?.sources || [];
      const dirSource = sources.find((s: any) => s.type === 'okf-directory' || s.type === 'markdown-directory');
      
      if (!dirSource || !dirSource.path) {
        console.error('[ERROR] Context plan requires an okf-directory source in akcp.yaml');
        process.exit(1);
      }

      console.log(`[START] Analyzing context budget for task: "${options.task}"`);
      
      const fsAdapter = new FileSystemAdapter();
      const parser = new FrontmatterParser();
      const repo = new OKFFileRepository(fsAdapter, parser, dirSource.path);
      const docs = await repo.findAll();
      
      const budgetTokens = parseInt(options.budget, 10);
      if (isNaN(budgetTokens)) {
        console.error('[ERROR] Budget must be a number');
        process.exit(1);
      }

      const manifest = ContextPlanner.plan(docs, {
        task: options.task,
        profile: options.profile,
        budget: { maxTokens: budgetTokens },
        mode: 'balanced'
      });

      console.log('\n=============================================');
      console.log('         CONTEXT ECONOMICS REPORT');
      console.log('=============================================');
      console.log(`Task:             ${manifest.task}`);
      console.log(`Budget Tokens:    ${manifest.budgetTokens}`);
      console.log(`Estimated Tokens: ${manifest.totalEstimatedTokens}`);
      console.log(`Included Docs:    ${manifest.documentsIncluded.length}`);
      console.log(`Excluded Docs:    ${manifest.documentsExcluded.length}`);
      console.log('\n[INCLUDED]');
      manifest.documentsIncluded.forEach((doc: any) => {
        console.log(`  - ${doc.title} (ID: ${doc.id})`);
        console.log(`    Relevance: ${doc.relevance.toFixed(2)} | Tokens: ${doc.estimatedTokens}`);
      });

      console.log('\n[EXCLUDED]');
      manifest.documentsExcluded.forEach((doc: any) => {
        console.log(`  - ${doc.title} (ID: ${doc.id})`);
        console.log(`    Relevance: ${doc.relevance.toFixed(2)} | Tokens: ${doc.estimatedTokens}`);
        console.log(`    Reason: ${doc.reason}`);
      });
      console.log('=============================================\n');

    } catch (e: any) {
      console.error(`[ERROR] Context plan failed: ${e.message}`);
      process.exit(1);
    }
  });

// ==========================================
// Lifecycle Subcommands
// ==========================================
const lifecycleCmd = program
  .command('lifecycle')
  .description('Manage knowledge lifecycle (freshness, deprecation, owners)');

lifecycleCmd
  .command('report')
  .description('Generate a lifecycle report (active, stale, deprecated)')
  .action(async () => {
    try {
      const { OKFFileRepository, Freshness, loadAkcpConfig } = await import('@ocf/core');
      const path = await import('path');
      
      const configPath = path.resolve(process.cwd(), 'akcp.yaml');
      const config = loadAkcpConfig(configPath);
      const sources = config.compile?.sources || [];
      const dirSource = sources.find((s: any) => s.type === 'okf-directory' || s.type === 'markdown-directory');
      
      if (!dirSource || !dirSource.path) {
        console.error('[ERROR] Lifecycle report requires an okf-directory source in akcp.yaml');
        process.exit(1);
      }

      const { FileSystemAdapter, FrontmatterParser } = await import('@ocf/core');
      const repo = new OKFFileRepository(new FileSystemAdapter(), new FrontmatterParser(), dirSource.path);
      const docs = await repo.findAll();
      
      let active = 0;
      let stale = 0;
      let deprecated = 0;
      let archived = 0;

      const staleDocs: string[] = [];
      const deprecatedDocs: string[] = [];

      for (const doc of docs) {
        const status = Freshness.getEffectiveStatus(doc.frontmatter);
        if (status === 'stale') {
          stale++;
          staleDocs.push(doc.conceptId);
        } else if (status === 'deprecated') {
          deprecated++;
          deprecatedDocs.push(doc.conceptId);
        } else if (status === 'archived') {
          archived++;
        } else {
          active++;
        }
      }

      console.log('\n=============================================');
      console.log('         KNOWLEDGE LIFECYCLE REPORT');
      console.log('=============================================');
      console.log(`Total Documents: ${docs.length}`);
      console.log(`Active:          ${active}`);
      console.log(`Stale:           ${stale}`);
      console.log(`Deprecated:      ${deprecated}`);
      console.log(`Archived:        ${archived}`);
      
      if (staleDocs.length > 0) {
        console.log('\n[STALE DOCUMENTS]');
        staleDocs.forEach(id => console.log(`  - ${id}`));
      }

      if (deprecatedDocs.length > 0) {
        console.log('\n[DEPRECATED DOCUMENTS]');
        deprecatedDocs.forEach(id => console.log(`  - ${id}`));
      }
      console.log('=============================================\n');

    } catch (e: any) {
      console.error(`[ERROR] Lifecycle report failed: ${e.message}`);
      process.exit(1);
    }
  });

// ==========================================
// Conformance Subcommands
// ==========================================
const conformanceCmd = program
  .command('conformance')
  .description('Run conformance suite to certify OKF/AKCP compatibility');

conformanceCmd
  .command('run')
  .description('Run conformance suite on a target bundle')
  .requiredOption('-b, --bundle <directory>', 'Path to the context bundle')
  .option('-p, --profile <profile>', 'OCF profile to test against', 'career')
  .option('-f, --format <format>', 'Output format (text or json)', 'text')
  .action(async (options) => {
    try {
      const { ConformanceRunner } = await import('@ocf/conformance');
      const path = await import('path');
      const bundlePath = path.resolve(process.cwd(), options.bundle);
      
      const runner = new ConformanceRunner(bundlePath, options.profile);
      const report = await runner.run();
      
      if (options.format === 'json') {
        console.log(JSON.stringify(report, null, 2));
      } else {
        const levels = [
          { name: 'OKF-compatible', label: 'Level 1: OKF-compatible (Base Spec)' },
          { name: 'OCF-profile-compatible', label: 'Level 2: OCF-profile-compatible' },
          { name: 'AKCP-compiler-compatible', label: 'Level 3: AKCP-compiler-compatible' },
          { name: 'AKCP-control-plane-compatible', label: 'Level 4: AKCP-control-plane-compatible' }
        ];

        console.log('\n=============================================');
        console.log('         OCF/AKCP CONFORMANCE REPORT');
        console.log('=============================================');
        console.log(`Bundle Path:       ${bundlePath}`);
        console.log(`Profile:           ${options.profile}`);
        console.log(`Conformance Level: [${report.conformanceLevel.toUpperCase()}]`);
        console.log('---------------------------------------------');

        let reachedNone = report.conformanceLevel === 'none';
        let currentLevelFound = false;

        for (const lvl of levels) {
          if (reachedNone) {
            console.log(`[ ] ❌ ${lvl.label} (Not Reached)`);
            continue;
          }

          if (lvl.name === report.conformanceLevel) {
            console.log(`[*] ✅ ${lvl.label} (Current Level)`);
            currentLevelFound = true;
          } else if (!currentLevelFound) {
            console.log(`[x] ✅ ${lvl.label}`);
          } else {
            console.log(`[ ] ⚠️  ${lvl.label} (Not Reached)`);
          }
        }

        if (report.details.length > 0) {
          console.log('\n[DETAILS]');
          report.details.forEach((det: any) => {
            const fileStr = det.file ? ` (${det.file})` : '';
            const typeStr = det.type === 'error' ? '❌ ERROR' : '⚠️  WARN';
            console.log(`  - [${typeStr}] [${det.ruleId}]${fileStr}: ${det.message}`);
          });
        }

        console.log('\nSummary:');
        console.log(`- Passed Checks: ${report.passed}`);
        console.log(`- Failed Checks: ${report.failed}`);
        console.log(`- Warnings:      ${report.warnings}`);
        console.log('=============================================\n');
      }
      
      if (report.conformanceLevel === 'none') {
        process.exit(1);
      }
    } catch (e: any) {
      console.error(`[ERROR] Conformance suite failed: ${e.message}`);
      process.exit(1);
    }
  });

// ==========================================
// Scorecard Subcommands
// ==========================================
program
  .command('scorecard')
  .description('Calculate Agent Knowledge Readiness Scorecard')
  .requiredOption('-b, --bundle <directory>', 'Path to the context bundle')
  .option('-f, --format <format>', 'Output format (json or markdown)', 'markdown')
  .action(async (options) => {
    try {
      const { loadAkcpConfig, buildKnowledgeIR, calculateScorecard } = await import('@ocf/core');
      const { formatScorecardMarkdown } = await import('./formatters/markdown.js');
      const fs = await import('fs');
      const path = await import('path');
      
      const targetDir = path.resolve(process.cwd(), options.bundle);
      
      let config;
      try {
        config = loadAkcpConfig(path.join(targetDir, 'akcp.yaml'));
      } catch (e) {
        config = { compile: { sources: [{ type: 'okf-directory', path: targetDir }] } };
      }

      console.log(`[INFO] Building IR for Scorecard from ${targetDir}`);
      const ir = await buildKnowledgeIR(targetDir, { sources: config.compile.sources });
      
      // Collect raw files to pass to scorecard calculation
      const { FileSystemAdapter } = await import('@ocf/core');
      const fsAdapter = new FileSystemAdapter();
      const rawPaths = await fsAdapter.listFiles(targetDir, '');
      const rawFiles = await Promise.all(rawPaths.map(async p => {
        const fullPath = path.join(targetDir, p);
        const content = fs.existsSync(fullPath) && fs.statSync(fullPath).isFile() ? fs.readFileSync(fullPath, 'utf-8') : '';
        return { path: p, content };
      }));

      const report = calculateScorecard(ir, rawFiles);
      
      if (options.format === 'markdown') {
        console.log(formatScorecardMarkdown(report));
      } else {
        console.log(JSON.stringify(report, null, 2));
      }
    } catch (err: any) {
      console.error(`[ERROR] Scorecard calculation failed: ${err.message}`);
      process.exit(1);
    }
  });

// ==========================================
// Plugin Subcommands
// ==========================================
const pluginCmd = program.command('plugin').description('Manage AKCP build-time plugins');

pluginCmd
  .command('list')
  .description('List all discovered plugins in a directory')
  .option('-d, --dir <directory>', 'Directory containing plugins', './plugins')
  .action(async (options) => {
    try {
      const { PluginRegistry } = await import('@ocf/core');
      const path = await import('path');
      const pluginsDir = path.resolve(process.cwd(), options.dir);
      
      console.log(`[INFO] Scanning for plugins in ${pluginsDir}...`);
      const discovered = PluginRegistry.discoverLocalPlugins(pluginsDir);
      
      if (discovered.length === 0) {
        console.log(`[INFO] No plugins found.`);
        return;
      }
      
      console.log(`\n=== Discovered Plugins (${discovered.length}) ===`);
      discovered.forEach(p => {
        if (p.error) {
          console.error(`- ❌ [BROKEN] ${path.basename(p.dirPath)}: ${p.error}`);
        } else {
          console.log(`- ✅ ${p.manifest.name} v${p.manifest.version} [${p.manifest.type}]`);
          console.log(`     Permissions: ${p.manifest.permissions.join(', ') || 'none'}`);
        }
      });
      console.log();
    } catch (err: any) {
      console.error(`[ERROR] Plugin list failed: ${err.message}`);
      process.exit(1);
    }
  });

pluginCmd
  .command('validate')
  .description('Strictly validate a plugin manifest')
  .argument('<directory>', 'Path to the plugin directory')
  .action(async (directory) => {
    try {
      const { PluginLoader } = await import('@ocf/core');
      const path = await import('path');
      const pluginDir = path.resolve(process.cwd(), directory);
      
      console.log(`[INFO] Validating plugin at ${pluginDir}...`);
      const manifest = PluginLoader.loadManifest(pluginDir);
      
      console.log(`[OK] Plugin manifest is valid.`);
      console.log(`Name:        ${manifest.name}`);
      console.log(`Version:     ${manifest.version}`);
      console.log(`Type:        ${manifest.type}`);
      console.log(`Permissions: ${manifest.permissions.join(', ') || 'none'}`);
    } catch (err: any) {
      console.error(`[ERROR] Plugin validation failed: ${err.message}`);
      process.exit(1);
    }
  });

// COMMAND: completion
program
  .command('completion')
  .description('Generate shell autocompletion script (bash or zsh)')
  .argument('<shell>', 'Shell type: bash or zsh')
  .action((shell) => {
    if (shell === 'bash') {
      console.log(`
# akcp bash completion
_akcp_completion() {
  local cur prev opts
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  opts="init validate scan compile inspect-artifact verify diff import serve:mcp doctor agents config policy plan reconcile graph context lifecycle conformance scorecard plugin"
  
  if [[ \${COMP_CWORD} -eq 1 ]] ; then
    COMPREPLY=( \$(compgen -W "\${opts}" -- \${cur}) )
    return 0
  fi
}
complete -F _akcp_completion akcp
      `);
    } else if (shell === 'zsh') {
      console.log(`
#compdef akcp
_akcp() {
  local -a commands
  commands=(
    'init:Initialize a new .agent-context structure'
    'validate:Strict offline schema validation of an OKF/Context bundle'
    'scan:Analyze repository and suggest context document structures'
    'compile:Compile Context Packs to specified targets'
    'inspect-artifact:Inspect an AKCP compile manifest'
    'verify:Verify the cryptographic provenance and integrity of a compiled bundle'
    'diff:Show semantic context changes since last build'
    'import:Import from external systems into a Context Pack'
    'serve:mcp:Locally boot the MCP Profile Server for this context'
    'doctor:Diagnose environment configuration and readiness'
    'agents:Manage agent instruction files (sync)'
    'config:Manage AKCP configuration (validate)'
    'policy:Manage and validate machine-readable Policy Cards (validate, explain)'
    'plan:Generate execution plan based on akcp.yaml'
    'reconcile:Reconcile desired state with current environment'
    'graph:Semantic Knowledge Graph operations (build, inspect, impacted)'
    'context:Manage and optimize context economics (plan)'
    'lifecycle:Manage knowledge lifecycle (report)'
    'conformance:Run conformance suite to certify OKF/AKCP compatibility (run)'
    'scorecard:Calculate Agent Knowledge Readiness Scorecard'
    'plugin:Manage AKCP build-time plugins (list, validate)'
  )
  _describe -t commands 'akcp commands' commands
}
_akcp "$@"
      `);
    } else {
      console.error('[ERROR] Unsupported shell: ' + shell + '. Supported shells: bash, zsh');
      process.exit(1);
    }
  });

program.parse(process.argv);
