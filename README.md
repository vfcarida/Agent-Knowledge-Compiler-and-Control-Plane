# 🌌 Open Career Format Orchestrator (OCF)

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License Badge" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D%2020.0-emerald?style=for-the-badge" alt="Node.js Badge" />
  <img src="https://img.shields.io/badge/Spec-OKF%20v0.1-6366f1?style=for-the-badge" alt="OKF Spec Badge" />
  <img src="https://img.shields.io/badge/Protocol-MCP%20v1.0-06b6d4?style=for-the-badge" alt="MCP Protocol Badge" />
  <img src="https://img.shields.io/badge/Monorepo-pnpm-a855f7?style=for-the-badge" alt="Pnpm Monorepo Badge" />
  <img src="https://img.shields.io/badge/Tests-53%20Passed-22c55e?style=for-the-badge" alt="Tests Badge" />
</p>

<p align="center">
  <strong>Decoupling career metadata from centralized platforms using standard semantic schemas and model context protocols.</strong>
</p>

---

## 📌 Table of Contents

1. [Strategic Overview: From API-First to Agent-First](#1-strategic-overview-from-api-first-to-agent-first)
2. [Architectural Foundation: OKF and MCP](#2-architectural-foundation-okf-and-mcp)
3. [The Reference Implementation: Career Management](#3-the-reference-implementation-career-management)
4. [System Architecture](#4-system-architecture)
5. [Local-First Execution: Privacy & Zero-Cost Orchestration with Gemma](#5-local-first-execution-privacy--zero-cost-orchestration-with-gemma)
6. [Core Features](#6-core-features)
7. [OKF Career Types Rationale](#7-okf-career-types-rationale)
8. [Getting Started & Configuration](#8-getting-started--configuration)
9. [Claude Desktop Integration](#9-claude-desktop-integration)
10. [Playwright Session Strategy](#10-playwright-session-strategy)
11. [Contributing & Spec-Driven Development](#11-contributing--spec-driven-development)
12. [License](#12-license)

---

## 1. Strategic Overview: From API-First to Agent-First

For the past decade, the **"API-first"** strategy successfully drove cloud migration, microservices adoption, and application modernization. However, as software development transitions toward **Agentic AI**, traditional APIs reveal structural limitations. Standard APIs were designed for deterministic, human-authored integrations and often lack the dynamic, self-describing interfaces required for autonomous systems to discover and interact with tools at runtime.

Research from Gartner indicates that Agentic AI — goal-driven software entities capable of autonomous decision-making — will fundamentally alter enterprise software economics. Yet, the same research warns that a significant portion of early agentic projects risk failure due to a **"capability-deployment verification gap"**. These failures do not stem from the underlying AI models' reasoning capabilities, but from fragmented data silos, poor governance, and the inability of agents to securely access organizational knowledge.

To achieve sustainable AI automation across any industry, systems must be re-architected to provide clean, standardized knowledge and secure execution boundaries.

---

## 2. Architectural Foundation: OKF and MCP

To resolve data fragmentation and integration bottlenecks, OCF relies upon two emerging open standards:

*   **Open Knowledge Format (OKF)**: An open specification introduced to formalize organizational knowledge. OKF structures data as a directory of Markdown files equipped with strict YAML frontmatter. This vendor-neutral format allows both humans and AI agents to read, version-control, and validate knowledge natively, effectively bypassing the need for complex, proprietary databases or indexing services.
*   **Model Context Protocol (MCP)**: Recognized in the Thoughtworks Technology Radar, MCP establishes a universal communication standard between AI models and external data sources or tools. Instead of engineering custom API wrappers for every new AI model, MCP provides a unified interface where capabilities are dynamically exposed and securely executed.

---

## 3. The Reference Implementation: Career Management

To tangibilize this architecture, we implemented the **Open Career Format Orchestrator (OCF)**. The domain of professional career management was selected because it perfectly mirrors the enterprise data problem: user data is heavily fragmented across static PDFs, multiple Applicant Tracking Systems (ATS), and professional networks.

This project converts the traditional, static resume into a living, OKF-compliant knowledge graph. It utilizes MCP servers to read this standardized context and safely automate interactions with the external job market, matching skills and submitting applications with semantic accuracy.

While this implementation focuses on career management, it is designed as an open-source reference architecture. The principles demonstrated here — deterministic data validation, modular MCP connectivity, and privacy-first orchestration — can be extracted, adapted, and scaled to solve agentic workflow challenges in finance, healthcare, IT operations, or any other data-heavy industry.

---

## 4. System Architecture

The monorepo architecture cleanly separates the core semantic evaluation engine, the protocol transportation server, and the client visualization SPA:

```mermaid
graph TD
    User([User / Candidate]) <-->|Local Host Browser| UI[React Dashboard SPA @ocf/dashboard]
    UI <-->|HTML5 Directory Access| LocalDir[(Local Filesystem: .okf/)]
    
    HostClient([AI Agent / Claude Desktop]) <-->|MCP Transport: stdio| MCPServer[MCP Server @ocf/mcp-server]
    MCPServer <-->|Local Core API| Core[@ocf/core Engine]
    Core <-->|File CRUD / Parsers| LocalDir
    MCPServer <-->|Playwright POM Drivers| Browser[Headless Chromium Context]
    Browser <-->|Human-in-the-Loop Gate| ATS[External Platforms: LinkedIn/Gupy/Indeed]
```

*   **`@ocf/core`**: Domain logic, schema definitions, and markdown repository implementation.
*   **`@ocf/mcp-server`**: Bridges the engine to external LLM execution clients using stdio transport.
*   **`@ocf/dashboard`**: A browser-safe Single Page Application utilizing Tailwind CSS v4 and D3.js force layouts to visualize the local dataset in-memory.

---

## 5. Local-First Execution: Privacy & Zero-Cost Orchestration with Gemma

Career data inherently contains highly sensitive Personally Identifiable Information (PII) — including salary histories, home addresses, performance reviews, and confidential project details. Transmitting this data to proprietary cloud LLM providers introduces significant privacy risks and recurring token costs.

To solve this, the Open Career Format (OCF) Orchestrator is designed with a Local-First / Offline-First execution path. By leveraging the open-weights Google Gemma 4 model family running locally via Ollama, the orchestrator can analyze job postings, parse OKF bundles, and generate tailored cover letters entirely on-device.

### Strategic Advantages of the Gemma + Ollama Stack:
*   **Absolute Data Sovereignty**: Your `.okf/` knowledge bundle and generated resumes never leave your machine's local memory.
*   **Large Context Windows**: Gemma 4 supports up to a 128K context window natively, allowing the agent to ingest the entire `index.md` and extensive job descriptions without truncation or the need for complex vector databases.
*   **Zero Inference Costs**: Eliminate the financial overhead of high-volume token processing (preventing API bill shocks during mass job applications).
*   **Hardware Efficiency**: Using Per-Layer Embeddings (PLE), Gemma 4 edge variants (`gemma4:e4b`) run efficiently on standard developer laptops, while the `gemma4:12b` variant provides frontier-level reasoning for dedicated workstations.

### How to Run Locally

1. **Install Ollama**: Download and install the engine from [ollama.com](https://ollama.com).
2. **Pull the Gemma Model**: Open your terminal and pull the model that best fits your hardware constraints:
   ```bash
   # For standard laptops (Effective 4B parameters)
   ollama pull gemma4:e4b

   # For advanced workstations (12B parameters for deeper reasoning)
   ollama pull gemma4:12b
   ```
3. **Configure the Orchestrator**: Update your `.env` file to route the MCP client traffic to your local Ollama instance rather than a cloud provider:
   ```env
   LLM_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434/v1
   OLLAMA_MODEL=gemma4:e4b
   ```

Once configured, the orchestrator will handle job matching and MCP Tool execution completely offline, ensuring your professional knowledge graph remains strictly confidential.

---

## 6. Core Features

*   **Deterministic OKF Memory**: Strict Zod-backed validation of Markdown and YAML frontmatter, ensuring the AI agent operates on reliable, structure-compliant data.
*   **Decoupled MCP Integration**: Browser automation and file system access are isolated into specific MCP servers, improving security and fault tolerance.
*   **Progressive Disclosure**: Utilizes index files (`index.md`) to allow the AI to navigate the knowledge base hierarchically, optimizing context window usage and reducing token costs.
*   **Human-in-the-Loop Controls**: Critical actions (like final job application submission) are intercepted, requiring explicit user approval.
*   **D3.js Force connection Graph**: Client-side reactive graph matching candidate competencies with historical company roles.

---

## 7. OKF Career Types Rationale

Following the **Open Knowledge Format (OKF)** paradigm, professional metadata is structured as distinct collections. Each record has a required `type` field in its frontmatter, prompting clean semantic boundaries:

| Concept Type | Folder Path | Purpose | Key Metadata Fields |
| :--- | :--- | :--- | :--- |
| **`Skill`** | `skills/*.md` | Models technical and core competencies | `level`, `yearsOfExperience`, `category` |
| **`Experience`** | `experiences/*.md` | Models professional roles and job history | `company`, `role`, `startDate`, `endDate`, `current` |
| **`Education`** | `education/*.md` | Models academic credentials and studies | `institution`, `degree`, `field`, `location` |
| **`Preference`** | `preferences/*.md` | Models target search parameters and limits | `locations`, `remote`, `salaryRange`, `roles` |
| **`Application`** | `applications/*.md` | Tracks candidates' pipeline funnel | `platform`, `status`, `appliedAt`, `url` |
| **`Certificate`** | `certificates/*.md` | Tracks verified certifications | `issuer`, `dateObtained`, `credentialId`, `url` |
| **`Project`** | `projects/*.md` | Models portfolio items and contributions | `url`, `technologies`, `startDate` |

---

## 8. Getting Started & Configuration

### Prerequisites
*   **Node.js**: `>= 20.0`
*   **pnpm**: `>= 9.0` (Run `npx pnpm` if not globally installed)

### Installation
Clone the repository and install workspace dependencies:
```bash
git clone https://github.com/vfcarida/Open-Career-Format-Orchestrator.git
cd Open-Career-Format-Orchestrator
npx pnpm install --ignore-scripts
```

### Build Packages
Build all subprojects using TypeScript project references:
```bash
npx pnpm --filter @ocf/core build
npx pnpm --filter @ocf/mcp-server build
npx pnpm --filter @ocf/dashboard build
```

### Running the Services

1. **Start the MCP Server**:
   To boot the stdio server connecting to an AI client:
   ```bash
   # Set custom bundle root directory path (defaults to ./.okf)
   export OCF_BUNDLE_PATH="./sample-data/.okf"
   pnpm --filter @ocf/mcp-server dev
   ```

2. **Start the React Dashboard**:
   To open the visualization suite:
   ```bash
   pnpm --filter @ocf/dashboard dev
   ```
   Open the outputted address (usually `http://localhost:5173/`), click **Select .okf Directory**, and point the file dialog to `sample-data/.okf/` (or your own catalog folder).

3. **Run Unit Tests**:
   Run Vitest across the engine and server packages:
   ```bash
   npx pnpm test
   ```

---

## 9. Claude Desktop Integration

To register OCF as a server in **Claude Desktop**, add the following entry to your configuration file:

*   **macOS / Linux**: `~/Library/Application Support/Claude/claude_desktop_config.json`
*   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "open-career-format-orchestrator": {
      "command": "node",
      "args": [
        "C:\\absolute\\path\\to\\Open-Career-Format-Orchestrator\\packages\\mcp-server\\dist\\index.js"
      ],
      "env": {
        "OCF_BUNDLE_PATH": "C:\\absolute\\path\\to\\your\\career-bundle\\.okf"
      }
    }
  }
}
```
*(Adjust the absolute file paths to point to your actual directories)*

Once loaded, the AI agent gains access to 3 core semantic tools:
1.  `read_career_context`: Feeds skills, experiences, and applications into context.
2.  `tailor_resume`: Re-evaluates CV fields against a target vacancy description.
3.  `orchestrate_application`: Automates application submission on platforms.

---

## 10. Playwright Session Strategy

Modern job search sites (LinkedIn, Gupy, Indeed) apply aggressive anti-scraping and CAPTCHA limits during login sequences. To prevent candidate accounts from being flagged and ensure seamless form automation, OCF implements a **cookie-persistency and profile strategy**:

### 1. Persistent User Profile (`userDataDir`)
OCF does not store plain text passwords. Instead, it utilizes chromium's persistent context capability:
```typescript
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  args: ['--disable-blink-features=AutomationControlled'],
});
```
This launches a browser context holding local storage, cached profiles, and session cookies. The candidate logs in manually once, and subsequent orchestrator runs proceed authenticated.

### 2. Sandbox Injection
For headless servers running on remote CLI agents, cookies can be exported as a JSON array and injected directly at runtime before accessing platforms:
```typescript
await context.addCookies(sessionCookiesList);
```
This circumvents username/password inputs entirely, preserving absolute credential safety.

---

## 11. Contributing & Spec-Driven Development

We welcome contributions applying Spec-Driven Development (SDD) principles. Please review our `AGENTS.md` and `CONTRIBUTING.md` before submitting pull requests to ensure architectural alignment.

*   Every functional enhancement must start as a specification change.
*   Tests must be updated in sync with domain services modification.
*   Commits must use simple conventional names and must never credit AI/LLMs.

---

## 12. License

This project is licensed under the MIT License.
