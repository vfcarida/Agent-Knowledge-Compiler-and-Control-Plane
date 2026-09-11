import { Command } from "commander";
import path from "node:path";
import fs from "node:fs";
import { spawn, exec } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { CLIContext } from "../../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getBrowserOpenCommand(
  url: string,
  platform = process.platform,
): string {
  switch (platform) {
    case "darwin":
      return `open "${url}"`;
    case "win32":
      return `start "" "${url}"`;
    default:
      return `xdg-open "${url}"`;
  }
}

export function openBrowser(url: string, platform = process.platform): void {
  if (process.env.CI === "true") {
    console.log("[INFO] CI environment detected. Skipping browser launch.");
    return;
  }
  const cmd = getBrowserOpenCommand(url, platform);
  exec(cmd, (err) => {
    if (err) {
      console.warn(
        `[WARN] Could not automatically open browser: ${err.message}`,
      );
    }
  });
}

export function registerServeDashboardCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  let serveCmd = program.commands.find((c) => c.name() === "serve");
  if (!serveCmd) {
    serveCmd = program
      .command("serve")
      .description("[Experimental] Locally serve AKCP capabilities");
  }

  serveCmd
    .command("dashboard")
    .description(
      "Launch the AKCP Control Plane Dashboard and BFF server locally",
    )
    .option(
      "-p, --port <number>",
      "Port to bind the dashboard server to",
      "3001",
    )
    .option("--host <host>", "Host address to bind", "localhost")
    .option("--ir <path>", "Path to compiled Agent Knowledge IR json")
    .option("--bundle <path>", "Path to bundle directory", ".")
    .option(
      "--demo",
      "Enable demo mode for instant access without JWT authentication",
      true,
    )
    .option("--no-demo", "Disable demo mode (requires DASHBOARD_JWT_SECRET)")
    .option(
      "-o, --open",
      "Automatically open the dashboard in the default browser",
      false,
    )
    .action(async (options) => {
      console.log(
        `[INFO] Booting AKCP Dashboard on http://${options.host}:${options.port}...`,
      );

      const targetDir = path.resolve(process.cwd(), options.bundle);
      const irPath = options.ir
        ? path.resolve(process.cwd(), options.ir)
        : path.join(targetDir, "dist", "agent-knowledge-ir.json");

      // Find the dashboard server script path (prefers precompiled JS, falls back to TS)
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
          "[ERROR] Could not locate @akcp/dashboard server script at any expected location.",
        );
        process.exit(1);
      }

      // Locate static SPA bundle if available
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
        AKCP_IR_PATH: irPath,
        AKCP_BUNDLE_PATH: targetDir,
        DASHBOARD_DEMO_MODE: options.demo ? "true" : "false",
        ...(staticDir ? { DASHBOARD_STATIC_PATH: staticDir } : {}),
      };

      const isCompiled = serverScriptPath.endsWith(".js");
      const isWindows = process.platform === "win32";

      let runnerCmd: string;
      let runnerArgs: string[];

      if (isCompiled) {
        runnerCmd = "node";
        runnerArgs = [serverScriptPath];
      } else {
        runnerCmd = isWindows ? "npx.cmd" : "npx";
        runnerArgs = ["tsx", serverScriptPath];
      }

      const child = spawn(runnerCmd, runnerArgs, {
        stdio: options.open ? ["inherit", "pipe", "pipe"] : "inherit",
        env: envVars,
      });

      if (options.open) {
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
