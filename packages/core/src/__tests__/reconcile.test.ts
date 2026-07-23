import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reconcile } from "../reconcile/reconcile.js";
import type { AkcpConfig } from "../config/akcp-config-schema.js";
import fs from "node:fs";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(),
      mkdirSync: vi.fn(),
    },
  };
});

describe("Reconcile", () => {
  let mockExistsSync: ReturnType<typeof vi.fn>;
  let mockMkdirSync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockExistsSync = vi.mocked(fs.existsSync);
    mockMkdirSync = vi.mocked(fs.mkdirSync);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockConfig: AkcpConfig = {
    version: "1.0",
    compile: {
      sources: [{ type: "markdown-directory", path: "./test-source" }],
      targets: [{ type: "ir-json", out: "./dist/ir.json" }],
    },
  };

  it("should return in-sync for dryRun when sources and targets exist", async () => {
    mockExistsSync.mockReturnValue(true);
    const result = await reconcile(mockConfig, { dryRun: true });
    expect(result.status).toBe("in-sync");
    expect(result.differences).toHaveLength(0);
  });

  it("should return out-of-sync for dryRun when a source is missing", async () => {
    mockExistsSync.mockImplementation((path) => {
      if (path.toString().includes("test-source")) return false;
      return true;
    });
    const result = await reconcile(mockConfig, { dryRun: true });
    expect(result.status).toBe("out-of-sync");
    expect(result.differences[0]).toContain("Source missing");
  });

  it("should return out-of-sync for dryRun when a target is missing", async () => {
    mockExistsSync.mockImplementation((path) => {
      if (path.toString().includes("ir.json")) return false;
      return true;
    });
    const result = await reconcile(mockConfig, { dryRun: true });
    expect(result.status).toBe("out-of-sync");
    expect(result.differences[0]).toContain("Target missing");
  });

  it("should create missing directories when dryRun is false", async () => {
    mockExistsSync.mockImplementation((path) => {
      if (path.toString().includes("test-source")) return false;
      return true;
    });
    mockMkdirSync.mockImplementation(() => {});

    // Note: this won't cover the full compilation branch unless we mock all the targets,
    // but this covers the basic source fixing branch.
    // We remove the missing target so it doesn't try to build the IR (which causes other issues if not mocked).
    const configOnlySources = {
      ...mockConfig,
      compile: { sources: mockConfig.compile?.sources, targets: [] },
    };
    const result = await reconcile(configOnlySources, { dryRun: false });
    expect(result.status).toBe("in-sync");
    expect(mockMkdirSync).toHaveBeenCalled();
  });
});
