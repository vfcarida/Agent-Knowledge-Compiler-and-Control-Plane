import { defineConfig } from "vitepress";

export default defineConfig({
  title: "AKCP Documentation",
  description:
    "Agent Knowledge Compiler and Control Plane (AKCP) - Compile organizational knowledge into versioned, agent-consumable artifacts with runtime governance.",
  base: process.env.VITEPRESS_BASE || "/",
  ignoreDeadLinks: true,

  themeConfig: {
    siteTitle: "AKCP",
    nav: [
      { text: "Quickstart", link: "/getting-started/quickstart" },
      { text: "Concepts", link: "/concepts/compiler" },
      { text: "Architecture", link: "/architecture/" },
      { text: "Specs", link: "/specs/akcp-build-spec" },
      { text: "Security", link: "/security/threat-model" },
      { text: "Reference", link: "/reference/cli" },
    ],

    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Documentation Hub", link: "/" },
          { text: "Quickstart Guide", link: "/getting-started/quickstart" },
          { text: "Production Deployment", link: "/getting-started/deployment" },
          { text: "Development Setup", link: "/getting-started/development" },
          { text: "Examples Overview", link: "/getting-started/examples" },
          { text: "Troubleshooting", link: "/getting-started/troubleshooting" },
        ],
      },
      {
        text: "Core Concepts",
        items: [
          { text: "Compiler Pipeline", link: "/concepts/compiler" },
          { text: "Control Plane", link: "/concepts/control-plane" },
          { text: "Open Knowledge Format (OKF)", link: "/concepts/okf" },
          { text: "Agent Knowledge IR (AK-IR)", link: "/concepts/ak-ir" },
          { text: "OpenWiki Integration", link: "/concepts/openwiki" },
          { text: "Source Connectors", link: "/concepts/connectors" },
          { text: "Glossary", link: "/glossary" },
        ],
      },
      {
        text: "Architecture",
        items: [{ text: "Architecture Overview", link: "/architecture/" }],
      },
      {
        text: "Specifications",
        items: [
          { text: "Build Specification", link: "/specs/akcp-build-spec" },
          { text: "AKCP YAML Reference", link: "/specs/akcp-yaml" },
          { text: "MCP Tool Contracts", link: "/specs/mcp-tool-contracts" },
          { text: "Policy Cards", link: "/specs/policy-cards" },
          { text: "Context Budget", link: "/specs/context-budget" },
          { text: "Versioning Policy", link: "/specs/versioning" },
        ],
      },
      {
        text: "Security & Governance",
        items: [
          { text: "Threat Model", link: "/security/threat-model" },
          { text: "MCP Security Model", link: "/security/mcp-security" },
          {
            text: "Zero-Trust Gateway",
            link: "/security/mcp-zero-trust-gateway",
          },
          {
            text: "Capability Registry",
            link: "/security/capability-registry",
          },
          { text: "Human-in-the-Loop (HITL)", link: "/security/hitl" },
          { text: "Automation Safety", link: "/security/automation-safety" },
          { text: "Supply Chain & Provenance", link: "/security/supply-chain" },
          { text: "Autonomy Levels", link: "/governance/autonomy-levels" },
          {
            text: "NIST AI RMF Mapping",
            link: "/governance/nist-ai-rmf-mapping",
          },
          {
            text: "OWASP LLM Controls",
            link: "/governance/owasp-llm-controls",
          },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "CLI Commands", link: "/reference/cli" },
          { text: "Compile Targets", link: "/reference/compile-targets" },
          { text: "Project Status", link: "/status" },
        ],
      },
    ],

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/vfcarida/Agent-Knowledge-Compiler-and-Control-Plane",
      },
    ],

    search: {
      provider: "local",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2025-present Vinicius Carida & AKCP Contributors",
    },
  },
});
