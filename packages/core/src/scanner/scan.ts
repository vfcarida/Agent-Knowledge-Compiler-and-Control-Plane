import fs from "node:fs";
import path from "node:path";

export interface ScanResult {
  detectedFiles: string[];
  suggestions: Array<{
    fileName: string;
    type: string;
    title: string;
    description: string;
    suggestedBody: string;
  }>;
}

export function scanWorkspace(directory: string): ScanResult {
  const targetDir = path.resolve(directory);
  const detectedFiles: string[] = [];
  const suggestions: ScanResult["suggestions"] = [];

  const checkFile = (fileName: string) => {
    const fullPath = path.join(targetDir, fileName);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      detectedFiles.push(fileName);
      return true;
    }
    return false;
  };

  const checkDir = (dirName: string) => {
    const fullPath = path.join(targetDir, dirName);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      detectedFiles.push(dirName);
      return true;
    }
    return false;
  };

  // Heuristic detections
  const hasNode = checkFile("package.json");
  const hasPython =
    checkFile("requirements.txt") ||
    checkFile("pyproject.toml") ||
    checkFile("Pipfile");
  const hasRust = checkFile("Cargo.toml");
  const hasDocker =
    checkFile("Dockerfile") ||
    checkFile("docker-compose.yml") ||
    checkFile("docker-compose.yaml");
  const hasTS = checkFile("tsconfig.json");
  const hasGithubCI = checkDir(".github/workflows");

  // Suggesting onboarding/project overview
  suggestions.push({
    fileName: "overview.md",
    type: "document",
    title: "Project Overview & Architecture",
    description:
      "A brief conceptual overview of the project structure and tech stack.",
    suggestedBody: `---
type: document
id: project-overview
title: "Project Overview & Architecture"
version: 1.0.0
---

# Project Overview

This repository contains the source code for the project.

## Tech Stack
${hasNode ? "- Node.js (JavaScript/TypeScript)\n" : ""}${hasTS ? "- TypeScript\n" : ""}${hasPython ? "- Python\n" : ""}${hasRust ? "- Rust\n" : ""}${hasDocker ? "- Docker Containers\n" : ""}
## Core Components
- Component A: Description
- Component B: Description
`,
  });

  // Python specific suggestion
  if (hasPython) {
    suggestions.push({
      fileName: "python-setup.md",
      type: "playbook",
      title: "Python Development Environment Setup",
      description:
        "Runbook to install dependencies and boot the Python development environment.",
      suggestedBody: `---
type: playbook
id: python-setup
title: "Python Setup Playbook"
version: 1.0.0
---

# Python Setup Playbook

This runbook guides agents and developers to setup the Python environment.

## Steps

1. Create a virtual environment:
   \`\`\`bash
   python -m venv .venv
   source .venv/bin/activate
   \`\`\`
2. Install pip dependencies:
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`
`,
    });
  }

  // Node specific suggestion
  if (hasNode) {
    suggestions.push({
      fileName: "node-commands.md",
      type: "playbook",
      title: "NodeJS Project Development Commands",
      description:
        "Runbook containing all lifecycle commands for build, test, and dev execution.",
      suggestedBody: `---
type: playbook
id: node-commands
title: "NodeJS Project Lifecycle Commands"
version: 1.0.0
---

# NodeJS Project Lifecycle Commands

This playbook lists commands to build, test, and run the project.

## Development Tasks

- **Install dependencies:**
  \`\`\`bash
  npm install
  \`\`\`
- **Run in development mode:**
  \`\`\`bash
  npm run dev
  \`\`\`
- **Compile production build:**
  \`\`\`bash
  npm run build
  \`\`\`
- **Run test suites:**
  \`\`\`bash
  npm test
  \`\`\`
`,
    });
  }

  // Docker specific suggestion
  if (hasDocker) {
    suggestions.push({
      fileName: "docker-deployment.md",
      type: "playbook",
      title: "Docker Build and Container Deployment",
      description: "Playbook to build local images and run docker containers.",
      suggestedBody: `---
type: playbook
id: docker-deployment
title: "Docker Build & Deployment Playbook"
version: 1.0.0
---

# Docker Deployment Runbook

Guide to build and deploy containers.

## Build local image

\`\`\`bash
docker build -t app-image .
\`\`\`

## Run local container

\`\`\`bash
docker run -d -p 8080:8080 --name app-container app-image
\`\`\`
`,
    });
  }

  // GitHub Actions specific suggestion
  if (hasGithubCI) {
    suggestions.push({
      fileName: "ci-pipeline.md",
      type: "document",
      title: "CI/CD Pipeline Details",
      description:
        "Description of the GitHub Actions workflows and deployment environments.",
      suggestedBody: `---
type: document
id: ci-pipeline-docs
title: "CI/CD Pipeline & GitHub Actions"
version: 1.0.0
---

# CI/CD Pipeline Documentation

GitHub Actions workflows are located under \`.github/workflows/\`.

## Main Workflows
- **Continuous Integration (CI):** Runs linting, typechecking, and tests on pull requests.
- **Release pipeline:** Compiles binaries and deploys to staging/production on merge to main.
`,
    });
  }

  return {
    detectedFiles,
    suggestions,
  };
}

export function writeScanSuggestions(
  directory: string,
  result: ScanResult,
  outDirName = ".agent-context",
): string[] {
  const targetDir = path.resolve(directory);
  const outDir = path.join(targetDir, outDirName);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const writtenFiles: string[] = [];

  for (const sug of result.suggestions) {
    const filePath = path.join(outDir, sug.fileName);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, sug.suggestedBody, "utf-8");
      writtenFiles.push(filePath);
    }
  }

  return writtenFiles;
}
