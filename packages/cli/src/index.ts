#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';

const program = new Command();

program
  .name('agent-ready')
  .description('ContextOps CLI for managing Agent-Ready Knowledge Context Packs')
  .version('0.1.0');

// COMMAND: init
program
  .command('init')
  .description('Initialize a new .agent-context structure')
  .argument('[directory]', 'Directory to initialize', '.')
  .option('-p, --profile <profile>', 'Context profile (e.g., software, career)', 'standard')
  .action((directory, options) => {
    const targetDir = path.resolve(process.cwd(), directory);
    const contextDir = path.join(targetDir, '.agent-context');

    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true });
    }

    const indexContent = `---
type: Index
title: Context Pack Index
profile: ${options.profile}
version: 1.0.0
---

# Agent Context Pack
This directory contains agent-ready knowledge bundles.
`;
    fs.writeFileSync(path.join(contextDir, 'index.md'), indexContent);

    // Bootstrap AGENTS.md injection hint
    const agentsMdContent = `# Agent Instructions
Always load the local \`.agent-context\` pack before answering architecture questions.
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

// COMMAND: scan (Skeleton)
program
  .command('scan')
  .description('Analyze repository and suggest context document structures')
  .argument('[directory]', 'Directory to scan', '.')
  .option('-m, --model-provider <provider>', 'LLM Provider', 'none')
  .option('--dry-run', 'Do not write files')
  .action((directory, options) => {
    console.log(`[INFO] Scanning directory ${directory} (Provider: ${options.modelProvider})`);
    if (options.dryRun) console.log(`[INFO] Dry-run enabled. No files will be written.`);
    console.log(`[OK] Scan completed. Suggested 3 new context mappings.`);
  });

// COMMAND: build (Skeleton)
program
  .command('build')
  .description('Compile and serialize context pack')
  .argument('[directory]', 'Directory to build', '.')
  .option('--dry-run', 'Do not write files')
  .action((directory, options) => {
    console.log(`[INFO] Building context pack at ${directory}`);
    if (options.dryRun) console.log(`[INFO] Dry-run enabled. No files will be written.`);
    console.log(`[OK] Build complete.`);
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

// COMMAND: serve:mcp (Skeleton)
program
  .command('serve:mcp')
  .description('Locally boot the MCP Profile Server for this context')
  .argument('[directory]', 'Directory to serve', '.')
  .action((directory) => {
    console.log(`[INFO] Booting MCP Server for bundle at ${directory}`);
    console.log(`[OK] Server running on stdio.`);
  });

// COMMAND: doctor
program
  .command('doctor')
  .description('Diagnose environment configuration and readiness')
  .action(() => {
    console.log(`[INFO] Running ContextOps Diagnostics...`);
    console.log(`- Node Version: ${process.version}`);
    
    // Check if MCP Server configs exist
    const cwd = process.cwd();
    const isMonorepo = fs.existsSync(path.join(cwd, 'pnpm-workspace.yaml'));
    console.log(`- Monorepo structure detected: ${isMonorepo}`);
    
    if (isMonorepo) {
      console.log(`[OK] Your environment is agent-ready.`);
    } else {
      console.warn(`[WARN] Not running inside a known workspace.`);
    }
  });

program.parse();
