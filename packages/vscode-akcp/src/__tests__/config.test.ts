import { describe, it, expect } from "vitest";
import { parseExtensionConfig, buildValidateCommand } from "../utils/config.js";

describe("AKCP Extension Config Utilities", () => {
  it("should return default config when raw is empty", () => {
    const config = parseExtensionConfig({});
    expect(config.akcpExecutable).toBe("npx akcp");
    expect(config.defaultProfile).toBe("software");
  });

  it("should parse custom executable", () => {
    const config = parseExtensionConfig({ akcpExecutable: "akcp-cli" });
    expect(config.akcpExecutable).toBe("akcp-cli");
  });

  it("should build valid validate command", () => {
    const config = parseExtensionConfig({ akcpExecutable: "pnpm akcp" });
    const cmd = buildValidateCommand(config);
    expect(cmd).toBe("pnpm akcp validate");
  });
});
