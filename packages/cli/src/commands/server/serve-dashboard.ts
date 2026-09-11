import { Command } from "commander";
import type { CLIContext } from "../../types.js";

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
    .action(async (options) => {
      const path = await import("path");
      const fs = await import("fs");
      const { spawn } = await import("child_process");
      const { fileURLToPath } = await import("url");

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      console.log(
        `[INFO] Booting AKCP Dashboard on http://${options.host}:${options.port}...`,
      );

      const targetDir = path.resolve(process.cwd(), options.bundle);
      const irPath = options.ir
        ? path.resolve(process.cwd(), options.ir)
        : path.join(targetDir, "dist", "agent-knowledge-ir.json");

      // Find the dashboard server script path
      const candidatePaths = [
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

      const envVars: Record<string, string | undefined> = {
        ...process.env,
        PORT: String(options.port),
        HOST: options.host,
        AKCP_IR_PATH: irPath,
        AKCP_BUNDLE_PATH: targetDir,
        DASHBOARD_DEMO_MODE: options.demo ? "true" : "false",
      };

      const isWindows = process.platform === "win32";
      const tsxCmd = isWindows ? "npx.cmd" : "npx";
      const child = spawn(tsxCmd, ["tsx", serverScriptPath], {
        stdio: "inherit",
        env: envVars,
      });

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
