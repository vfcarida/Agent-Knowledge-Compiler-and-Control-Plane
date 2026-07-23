import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerServeMcpCommand(
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
    .command("mcp")
    .description(
      "[Experimental] Locally boot the MCP Profile Server for this context",
    )
    .option("-p, --profile <profile>", "Profile context to serve", "career")
    .option(
      "--ir <path>",
      "Path to compiled Knowledge IR json",
      "dist/agent-knowledge-ir.json",
    )
    .option(
      "--transport <type>",
      "Transport: stdio | streamable-http | sse (deprecated)",
      "stdio",
    )
    .option(
      "--insecure-no-auth",
      "Allow remote transport without authentication (dev only)",
    )
    .action(async (options) => {
      const path = await import("path");
      const { spawn } = await import("child_process");
      const { createRequire } = await import("module");

      const targetDir = process.cwd(); // Assume we are in the bundle directory
      const irPath = path.resolve(process.cwd(), options.ir);

      if (options.transport !== "stdio" && !options.insecureNoAuth) {
        if (!process.env["AKCP_JWT_SECRET"] && !process.env["AKCP_JWKS_URI"]) {
          console.error(
            "[ERROR] Remote transport requires auth config (AKCP_JWT_SECRET or AKCP_JWKS_URI).\\n" +
              "Use --insecure-no-auth for local development.",
          );
          process.exit(1);
        }
      }

      if (options.transport === "sse") {
        console.warn(
          "[WARNING] The 'sse' transport is deprecated. Please use 'streamable-http' instead.",
        );
      }

      console.error(
        `[INFO] Booting MCP Server (Profile: ${options.profile}) for bundle at ${targetDir}`,
      );

      try {
        const require = createRequire(import.meta.url);

        let serverPath = require.resolve("@akcp/mcp-profile-server");
        if (
          options.transport === "http-sse" ||
          options.transport === "sse" ||
          options.transport === "streamable-http"
        ) {
          // Both sse and streamable-http use the new unified http-server
          serverPath =
            require.resolve("@akcp/mcp-profile-server/dist/http-server.js");
        }

        const envVars: Record<string, string | undefined> = {
          ...process.env,
          AKCP_BUNDLE_PATH: targetDir,
          AKCP_IR_PATH: irPath,
          AKCP_TRANSPORT:
            options.transport === "http-sse" ? "sse" : options.transport,
        };

        if (options.insecureNoAuth) {
          envVars["AKCP_INSECURE_NO_AUTH"] = "true";
        }

        const child = spawn("node", [serverPath], {
          stdio: "inherit",
          env: envVars,
        });

        child.on("close", (code) => {
          process.exit(code ?? 0);
        });
      } catch (err: any) {
        console.error(`[ERROR] Failed to launch MCP server: ${err.message}`);
        process.exit(1);
      }
    });
}
