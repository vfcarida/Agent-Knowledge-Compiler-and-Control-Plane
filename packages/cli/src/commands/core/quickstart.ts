import { Command } from "commander";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { CLIContext } from "../../types.js";
import { openBrowser } from "../server/serve-dashboard.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function registerQuickstartCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  program
    .command("quickstart")
    .description(
      "Bootstrap an agent knowledge bundle, compile it, and launch the Control Plane dashboard",
    )
    .argument(
      "[directory]",
      "Target directory for the quickstart bundle",
      "./akcp-quickstart",
    )
    .option(
      "-t, --template <name>",
      "Template domain (e.g. it-operations, career, customer-support)",
      "it-operations",
    )
    .option(
      "-p, --port <number>",
      "Port to bind the dashboard server to",
      "3001",
    )
    .option("--host <host>", "Host address to bind", "localhost")
    .option(
      "-o, --open",
      "Automatically open the dashboard in the default browser",
      true,
    )
    .option("--no-open", "Do not automatically open the browser")
    .option(
      "--no-serve",
      "Only initialize and compile without starting the server",
    )
    .action(async (directory, options) => {
      const targetDir = path.resolve(process.cwd(), directory);
      const template = options.template || "it-operations";

      console.log("\n========================================================");
      console.log("  🚀 AKCP Quickstart: Zero-to-Control-Plane in Seconds");
      console.log("========================================================\n");

      // 1. Initialize template if directory does not have akcp.yaml
      const configPath = path.join(targetDir, "akcp.yaml");
      if (!fs.existsSync(configPath)) {
        console.log(`[1/3] Initializing bundle from template '${template}'...`);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        const cliDir = path.dirname(__filename);
        const candidates = [
          path.resolve(cliDir, "../../../templates", template),
          path.resolve(cliDir, "../templates", template),
          path.resolve(cliDir, "../../../../../examples/domains", template),
          path.resolve(cliDir, "../../../../examples/domains", template),
          path.resolve(cliDir, "../../../examples/domains", template),
          path.resolve(process.cwd(), "examples/domains", template),
        ];
        const templateDir = candidates.find((c) => fs.existsSync(c));

        if (templateDir) {
          fs.cpSync(templateDir, targetDir, { recursive: true });
          const cacheDir = path.join(targetDir, ".akcp", "cache");
          if (fs.existsSync(cacheDir)) {
            fs.rmSync(cacheDir, { recursive: true, force: true });
          }
          console.log(`      ✓ Bundle initialized at ${targetDir}`);
        } else {
          console.error(`[ERROR] Template '${template}' not found.`);
          process.exit(1);
        }
      } else {
        console.log(`[1/3] Using existing bundle found at ${targetDir}`);
      }

      // 2. Compile bundle
      console.log(
        "[2/3] Compiling knowledge artifacts to Agent Knowledge IR...",
      );
      const {
        loadAkcpConfig,
        compile: compileToIR,
        IrJsonTarget,
        AgentsMdTarget,
        McpResourcesManifestTarget,
        PolicyBundleTarget,
        DashboardMetadataTarget,
      } = await import("@akcp/core");

      let config: any;
      try {
        config = loadAkcpConfig(configPath);
      } catch (err: any) {
        console.error(`[ERROR] Failed to load configuration: ${err.message}`);
        process.exit(1);
      }

      const compileResult = await compileToIR(targetDir, {
        sources: config.compile?.sources,
        privacy: config.privacy,
      });
      if (!compileResult.ok) {
        console.error(`[ERROR] Compilation failed:`);
        for (const err of compileResult.error) {
          console.error(`  - ${err.message}`);
        }
        process.exit(1);
      }

      const { ir } = compileResult.value;
      const distDir = path.join(targetDir, "dist");
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }

      // Emit essential targets for Control Plane
      const targets = [
        {
          impl: new IrJsonTarget(),
          conf: {
            type: "context-pack",
            out: path.join(distDir, "agent-knowledge-ir.json"),
          },
        },
        {
          impl: new AgentsMdTarget(),
          conf: {
            type: "agent-instructions",
            out: path.join(targetDir, "AGENTS.md"),
          },
        },
        {
          impl: new McpResourcesManifestTarget(),
          conf: {
            type: "mcp-resources",
            out: path.join(distDir, "mcp-resources.json"),
          },
        },
        {
          impl: new PolicyBundleTarget(),
          conf: {
            type: "policy-bundle",
            out: path.join(distDir, "policy-bundle.json"),
          },
        },
        {
          impl: new DashboardMetadataTarget(),
          conf: {
            type: "dashboard-metadata",
            out: path.join(distDir, "akcp/dashboard-metadata.json"),
          },
        },
      ];

      for (const target of targets) {
        await target.impl.compile(ir, target.conf);
      }

      console.log(
        `      ✓ Compiled ${ir.concepts?.length || 0} concepts, ` +
          `${ir.capabilities?.length || 0} capabilities, ` +
          `${ir.policies?.length || 0} policies into ${distDir}`,
      );

      if (options.serve === false) {
        console.log(
          "\n[SUCCESS] Quickstart setup completed (--no-serve specified).\n",
        );
        return;
      }

      // 3. Launch Dashboard & BFF server
      console.log(
        `[3/3] Booting AKCP Control Plane Dashboard on http://${options.host}:${options.port}...`,
      );

      const candidatePaths = [
        path.resolve(process.cwd(), "packages/dashboard/dist/server/index.js"),
        path.resolve(__dirname, "../../../../dashboard/dist/server/index.js"),
        path.resolve(__dirname, "../../../dashboard/dist/server/index.js"),
        path.resolve(
          process.cwd(),
          "node_modules/@akcp/dashboard/dist/server/index.js",
        ),
        path.resolve(process.cwd(), "packages/dashboard/server/index.ts"),
        path.resolve(__dirname, "../../../../dashboard/server/index.ts"),
        path.resolve(__dirname, "../../../dashboard/server/index.ts"),
        path.resolve(
          process.cwd(),
          "node_modules/@akcp/dashboard/server/index.ts",
        ),
      ];

      let serverScriptPath: string | null = null;
      for (const candidate of candidatePaths) {
        if (fs.existsSync(candidate)) {
          serverScriptPath = candidate;
          break;
        }
      }

      if (!serverScriptPath) {
        console.error(
          "[ERROR] Could not locate @akcp/dashboard server script.",
        );
        process.exit(1);
      }

      // Locate static SPA bundle
      const candidateStaticPaths = [
        path.resolve(process.cwd(), "packages/dashboard/dist"),
        path.resolve(__dirname, "../../../../dashboard/dist"),
        path.resolve(__dirname, "../../../dashboard/dist"),
        path.resolve(process.cwd(), "node_modules/@akcp/dashboard/dist"),
      ];
      let staticDir: string | undefined;
      for (const cand of candidateStaticPaths) {
        if (fs.existsSync(path.join(cand, "index.html"))) {
          staticDir = cand;
          break;
        }
      }

      const envVars: Record<string, string | undefined> = {
        ...process.env,
        PORT: String(options.port),
        HOST: options.host,
        AKCP_IR_PATH: path.join(distDir, "agent-knowledge-ir.json"),
        AKCP_BUNDLE_PATH: targetDir,
        DASHBOARD_DEMO_MODE: "true",
        ...(staticDir ? { DASHBOARD_STATIC_PATH: staticDir } : {}),
      };

      const isCompiled = serverScriptPath.endsWith(".js");
      const isWindows = process.platform === "win32";
      const { spawn } = await import("node:child_process");

      let runnerCmd: string;
      let runnerArgs: string[];

      if (isCompiled) {
        runnerCmd = "node";
        runnerArgs = [serverScriptPath];
      } else {
        runnerCmd = isWindows ? "npx.cmd" : "npx";
        runnerArgs = ["tsx", serverScriptPath];
      }

      const shouldOpen = options.open !== false;
      const child = spawn(runnerCmd, runnerArgs, {
        stdio: shouldOpen ? ["inherit", "pipe", "pipe"] : "inherit",
        env: envVars,
      });

      if (shouldOpen) {
        let opened = false;
        const targetUrl = `http://${options.host}:${options.port}`;
        const triggerOpen = () => {
          if (!opened) {
            opened = true;
            console.log(`[INFO] Opening browser at ${targetUrl}...`);
            openBrowser(targetUrl);
          }
        };

        if (child.stdout) {
          child.stdout.on("data", (chunk: Buffer) => {
            const str = chunk.toString();
            process.stdout.write(str);
            if (str.includes("Express server running on port")) {
              triggerOpen();
            }
          });
        }
        if (child.stderr) {
          child.stderr.on("data", (chunk: Buffer) => {
            process.stderr.write(chunk.toString());
          });
        }

        const fallbackTimer = setTimeout(() => {
          triggerOpen();
        }, 3000);

        child.on("close", () => {
          clearTimeout(fallbackTimer);
        });
      }

      child.on("close", (code) => {
        process.exit(code ?? 0);
      });

      process.on("SIGINT", () => {
        child.kill("SIGINT");
        process.exit(0);
      });

      process.on("SIGTERM", () => {
        child.kill("SIGTERM");
        process.exit(0);
      });
    });
}
