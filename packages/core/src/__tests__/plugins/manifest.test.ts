import { describe, it, expect } from "vitest";
import { PluginManifestSchema } from "../../plugins/manifest-schema.js";

describe("PluginManifestSchema", () => {
  it("validates a correct manifest", () => {
    const valid = {
      akcpPluginVersion: "1.0.0",
      name: "valid-plugin",
      version: "0.1.0",
      type: "source-connector",
      permissions: ["fs:read"],
    };

    expect(() => PluginManifestSchema.parse(valid)).not.toThrow();
  });

  it("rejects invalid names", () => {
    const invalidName = {
      akcpPluginVersion: "1.0.0",
      name: "Invalid Plugin",
      version: "0.1.0",
      type: "source-connector",
    };

    expect(() => PluginManifestSchema.parse(invalidName)).toThrow();
  });

  it("rejects invalid types", () => {
    const invalidType = {
      akcpPluginVersion: "1.0.0",
      name: "valid-plugin",
      version: "0.1.0",
      type: "unknown-type",
    };

    expect(() => PluginManifestSchema.parse(invalidType)).toThrow();
  });

  it("rejects invalid permissions", () => {
    const invalidPerm = {
      akcpPluginVersion: "1.0.0",
      name: "valid-plugin",
      version: "0.1.0",
      type: "source-connector",
      permissions: ["fs:delete-everything"],
    };

    expect(() => PluginManifestSchema.parse(invalidPerm)).toThrow();
  });
});
