import { describe, it, expect, vi } from "vitest";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";
import {
  getBrowserOpenCommand,
  openBrowser,
} from "../commands/server/serve-dashboard.js";

const execAsync = promisify(exec);
const cliPath = path.resolve(__dirname, "../../dist/index.js");
const workspaceRoot = path.resolve(__dirname, "../../../..");

describe("CLI serve dashboard Command", () => {
  describe("CLI Help Output", () => {
    if (!fs.existsSync(cliPath)) {
      console.warn(
        "[WARN] CLI binary not found. Skipping serve dashboard tests.",
      );
      return;
    }

    const runCli = async (args: string) => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} ${args}`, {
        encoding: "utf-8",
        cwd: workspaceRoot,
      });
      return stdout + stderr;
    };

    it("should show serve dashboard help with expected options including --open", async () => {
      const output = await runCli("serve dashboard --help");
      expect(output).toContain("Launch the AKCP Control Plane Dashboard");
      expect(output).toContain("-p, --port <number>");
      expect(output).toContain("--host <host>");
      expect(output).toContain("--ir <path>");
      expect(output).toContain("--bundle <path>");
      expect(output).toContain("--demo");
      expect(output).toContain("--no-demo");
      expect(output).toContain("-o, --open");
      expect(output).toContain(
        "Automatically open the dashboard in the default browser",
      );
    });

    it("should be listed as a valid subcommand under akcp serve --help", async () => {
      const output = await runCli("serve --help");
      expect(output).toContain("dashboard");
      expect(output).toContain("Launch the AKCP Control Plane Dashboard");
    });
  });

  describe("Browser Launcher Helper", () => {
    it("should generate the correct platform command for opening URLs", () => {
      expect(getBrowserOpenCommand("http://localhost:3001", "darwin")).toBe(
        'open "http://localhost:3001"',
      );
      expect(getBrowserOpenCommand("http://localhost:3001", "win32")).toBe(
        'start "" "http://localhost:3001"',
      );
      expect(getBrowserOpenCommand("http://localhost:3001", "linux")).toBe(
        'xdg-open "http://localhost:3001"',
      );
    });

    it("should skip launching browser when CI=true", () => {
      const originalCi = process.env.CI;
      process.env.CI = "true";
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      try {
        openBrowser("http://localhost:3001");
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("CI environment detected"),
        );
      } finally {
        if (originalCi === undefined) {
          delete process.env.CI;
        } else {
          process.env.CI = originalCi;
        }
        consoleSpy.mockRestore();
      }
    });
  });

  describe("Dashboard Static Assets Resolution", () => {
    it("should locate built SPA client assets in packages/dashboard/dist", () => {
      const dashboardDist = path.resolve(
        workspaceRoot,
        "packages/dashboard/dist",
      );
      const indexPath = path.join(dashboardDist, "index.html");
      expect(fs.existsSync(indexPath)).toBe(true);

      const html = fs.readFileSync(indexPath, "utf-8");
      expect(html).toContain("<!doctype html>");
      expect(html).toContain("/assets/");
    });
  });
});
