import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loadAkcpConfig,
  ConfigLoadError,
} from "../../config/load-akcp-config.js";
import fs from "node:fs";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
    },
  };
});

describe("loadAkcpConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws ConfigLoadError if file does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(() => loadAkcpConfig("missing.yaml")).toThrow(ConfigLoadError);
    expect(() => loadAkcpConfig("missing.yaml")).toThrow(
      /Configuration file not found/,
    );
  });

  it("throws ConfigLoadError on malformed YAML", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("version: 1.0\nfoo: [unclosed");

    expect(() => loadAkcpConfig("invalid.yaml")).toThrow(ConfigLoadError);
    expect(() => loadAkcpConfig("invalid.yaml")).toThrow(
      /Failed to parse YAML file/,
    );
  });

  it("throws ConfigLoadError on schema validation failure", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      "version: 1.0\ncompile:\n  sources: []\n  targets: []",
    );

    expect(() => loadAkcpConfig("bad-schema.yaml")).toThrow(ConfigLoadError);
    expect(() => loadAkcpConfig("bad-schema.yaml")).toThrow(
      /Configuration validation failed/,
    );
  });

  it("loads and normalizes valid YAML configuration with legacy fields", () => {
    const yamlContent = `
version: "1.0"
sources:
  - path: "docs"
    type: "markdown-directory"
targets:
  - type: "context-pack"
    out: "dist"
policies:
  disableDangerousTools: true
`;
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

    const config = loadAkcpConfig("akcp.yaml");
    expect(config.version).toBe("1.0");
    expect(config.compile?.sources).toHaveLength(1);
    expect(config.compile?.targets).toHaveLength(1);
    expect(config.controlPlane?.policies).toBeDefined();
  });
});
