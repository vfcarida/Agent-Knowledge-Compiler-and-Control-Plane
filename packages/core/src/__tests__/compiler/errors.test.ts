import { describe, it, expect } from "vitest";
import type {
  CompilerError,
  CompilerWarning,
  ValidationError,
  PiiError,
  ConnectorError,
  SchemaError,
} from "../../compiler/errors.js";

describe("CompilerError / CompilerWarning shapes", () => {
  it("constructs a ValidationError with the 'validation' discriminant", () => {
    const err: ValidationError = {
      type: "validation",
      message: "bad config",
      source: "akcp.yaml",
    };
    const asUnion: CompilerError = err;

    expect(asUnion.type).toBe("validation");
    expect(err.message).toBe("bad config");
    expect(err.source).toBe("akcp.yaml");
    expect(err.details).toBeUndefined();
  });

  it("constructs a PiiError with the 'pii' discriminant and a required source", () => {
    const err: PiiError = {
      type: "pii",
      message: "found email",
      source: "doc.md",
      piiType: "email",
    };
    const asUnion: CompilerError = err;

    expect(asUnion.type).toBe("pii");
    expect(err.source).toBe("doc.md");
    expect(err.piiType).toBe("email");
  });

  it("constructs a ConnectorError with the 'connector' discriminant", () => {
    const err: ConnectorError = {
      type: "connector",
      message: "failed to fetch",
      connectorType: "openwiki",
    };
    const asUnion: CompilerError = err;

    expect(asUnion.type).toBe("connector");
    expect(err.connectorType).toBe("openwiki");
    expect(err.source).toBeUndefined();
  });

  it("constructs a SchemaError with the 'schema' discriminant", () => {
    const err: SchemaError = {
      type: "schema",
      message: "invalid IR",
      path: "concepts[0].body",
      details: { issues: [] },
    };
    const asUnion: CompilerError = err;

    expect(asUnion.type).toBe("schema");
    expect(err.path).toBe("concepts[0].body");
    expect(err.details).toEqual({ issues: [] });
  });

  it("constructs each CompilerWarning variant with the expected type literal", () => {
    const types: CompilerWarning["type"][] = [
      "stale_document",
      "unknown_source_type",
      "missing_link_target",
      "pii_redacted",
    ];

    for (const type of types) {
      const warning: CompilerWarning = {
        type,
        message: `warning of type ${type}`,
      };
      expect(warning.type).toBe(type);
      expect(warning.message).toContain(type);
    }
  });

  it("allows a CompilerWarning without the optional source field", () => {
    const warning: CompilerWarning = {
      type: "missing_link_target",
      message: "dangling link",
    };

    expect(warning.source).toBeUndefined();
  });
});
