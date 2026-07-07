# Open Career Format Orchestrator (OCF)

> **Executive Summary (Portuguese)**:  
> Este projeto transforma o histórico profissional estático em uma base de dados semântica interoperável utilizando duas tecnologias centrais: o **Open Knowledge Format (OKF)** e o **Model Context Protocol (MCP)**. Ele é composto por três componentes em um monorepo: o motor de arquivos nativos (`@ocf/core`), o servidor MCP de automação (`@ocf/mcp-server`) e o Dashboard visual interativo React com Tailwind CSS v4 (`@ocf/dashboard`).

---

## Architecture & Monorepo Structure

The project is structured as a **pnpm monorepo** with strict TypeScript project references and ES module resolution:

```
├── packages/
│   ├── core/           # Layer 1: Core domain models, repository, parser & services
│   ├── mcp-server/     # Layer 2: Model Context Protocol server exposing career tools
│   └── dashboard/      # Layer 3: React Dashboard + D3.js Knowledge Graph + Tailwind v4
├── sample-data/
│   └── .okf/           # Realistic career bundle dataset (Skills, Experiences, Logs...)
└── package.json        # Workspace configuration
```

- **`@ocf/core`**: Implements filesystem adapters, gray-matter YAML frontmatter parsers, auto-indexes generator, and transactional log services.
- **`@ocf/mcp-server`**: Implements standard Stdio MCP server exposing tools (`read_career_context`, `tailor_resume`, `orchestrate_application`) and Playwright-based platform drivers.
- **`@ocf/dashboard`**: A React single-page frontend parsing local folder directories in-memory to display Kanban boards and connection graphs.

---

## Getting Started

### Prerequisites

- Node.js >= 20.0
- pnpm >= 9.0 (run `npx pnpm` if not installed globally)

### Installation

Install workspace dependencies (build scripts are ignored for security):

```bash
npx pnpm install --ignore-scripts
```

### Running the Services

1. **Start the MCP Server**:
   To connect the MCP server to Claude Desktop or any other host, run the dev task:
   ```bash
   pnpm --filter @ocf/mcp-server dev
   ```
   *Note: Set the environment variable `OCF_BUNDLE_PATH` to target your custom `.okf` directory (defaults to `./.okf`).*

2. **Start the React Dashboard**:
   To open the visual dashboard client locally:
   ```bash
   pnpm --filter @ocf/dashboard dev
   ```
   Navigate to the outputted URL (e.g. `http://localhost:5173/`), click **Select .okf Directory**, and point it to the local folder (e.g. `sample-data/.okf/` or your own career bundle).

3. **Run Unit Tests**:
   Run Vitest across the core engine and server packages:
   ```bash
   pnpm test
   ```

---

## Deep Dive: OKF Career Types Rationale

The catalog is modeled around **7 core Career Types**, adhering to Google Cloud's **Open Knowledge Format (OKF) spec v0.1**. Every document represents a single professional concept placed in a corresponding folder:

1. **`Skill`** (e.g. `skills/typescript.md`): Models technical capabilities. Fields include `level` (Proficiency), `yearsOfExperience`, and `category`.
2. **`Experience`** (e.g. `experiences/senior-engineer.md`): Models professional history. Fields include `company`, `role`, `startDate`, `endDate`, and `current` (boolean).
3. **`Education`** (e.g. `education/university.md`): Models academic credentials. Fields include `institution`, `degree`, and `field` (field of study).
4. **`Preference`** (e.g. `preferences/job-search.md`): Models search parameters. Fields include `remote` (boolean), `locations` (array), and desired `salaryRange`.
5. **`Application`** (e.g. `applications/google.md`): Models job hunting funnel. Fields include `platform` (LinkedIn/Gupy/Indeed), `status` (Saved/Applied/Interview/Offer/Rejected), and `appliedAt` timestamp.
6. **`Certificate`** (e.g. `certificates/aws.md`): Models certifications. Fields include `issuer`, `dateObtained`, and `credentialId`.
7. **`Project`** (e.g. `projects/orchestrator.md`): Models portfolio items. Fields include `technologies` and `url`.

### Why this design?
- **LLM Decoupling**: By categorizing concepts into structured markdown files with YAML frontmatter headers, AI models can selectively query only relevant subsets (progressive disclosure), reducing token consumption.
- **Interoperability**: The YAML structure makes it clean for automatic scripts to parse (MCP server), while the Markdown body remains perfectly readable and editable by humans using any plain editor.

---

## Deep Dive: Playwright Credential & Session Management

Automating job applications on web platforms like **LinkedIn**, **Indeed**, and **Gupy** presents significant security and anti-bot obstacles (e.g., Cloudflare WAF, Captchas, MFA). To ensure high success rates and safeguard credentials, OCF implements the following strategies:

### 1. Persistent User Context (`userDataDir`)
Rather than typing email/password in clean browser tabs on every launch (which triggers suspicious activity alerts), the **Browser Orchestrator** is designed to use a persistent user directory:
```typescript
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  args: ['--disable-blink-features=AutomationControlled'],
});
```
This retains cookies, local storage, and session active states. The candidate logs in manually once, and all subsequent automated applications execute seamlessly within the pre-authenticated session.

### 2. Cookie Injection
For headless environments (like MCP servers running in CLI agents), the server can ingest an exported cookie JSON string from the user's local browser and inject it prior to navigation:
```typescript
await context.addCookies(sessionCookies);
```
This circumvents login pages entirely, avoiding password storage inside configuration directories and lowering anti-bot risks.
