import { describe, it, expect } from "vitest";
import { PluginRegistry } from "../../plugins/registry.js";
import * as path from "path";

describe("PluginRegistry", () => {
  it("discovers the example plugin", () => {
    const pluginsDir = path.resolve(__dirname, "../__fixtures__/plugins");
    const discovered = PluginRegistry.discoverLocalPlugins(pluginsDir);

    expect(discovered.length).toBeGreaterThan(0);
    const example = discovered.find((p) =>
      p.dirPath.includes("example-markdown-connector"),
    );
    expect(example).toBeDefined();

    if (example) {
      expect(example.error).toBeUndefined();
      expect(example.manifest.name).toBe("example-markdown-connector");
    }
  });

  it("returns empty array for non-existent directory", () => {
    const discovered = PluginRegistry.discoverLocalPlugins(
      "/non/existent/plugins/dir",
    );
    expect(discovered.length).toBe(0);
  });
});
