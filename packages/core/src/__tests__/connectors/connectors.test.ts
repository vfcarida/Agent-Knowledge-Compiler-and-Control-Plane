import { describe, it, expect } from "vitest";
import { FileSystemAdapter } from "../../infrastructure/file-system-adapter.js";
import { OKFDirectoryConnector } from "../../connectors/okf-directory.js";
import { MarkdownDirectoryConnector } from "../../connectors/markdown-directory.js";
import { OpenWikiConnector } from "../../connectors/openwiki.js";
import { OpenApiConnector } from "../../connectors/openapi.js";
import { normalizeRawItem } from "../../normalizers/normalize.js";
import path from "path";
import fs from "fs";
import os from "os";

describe("Source Connectors", () => {
  const fsAdapter = new FileSystemAdapter();
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "connectors-"));
  });

  it("OKFDirectoryConnector should ingest .md files", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "test.md"),
      "---\ntype: Concept\n---\nBody content",
    );
    const connector = new OKFDirectoryConnector(fsAdapter);

    const items = await connector.ingest({
      type: "okf-directory",
      path: tmpDir,
    });
    expect(items).toHaveLength(1);
    expect(items[0].metadata.relativePath).toBe("test.md");

    const normalized = normalizeRawItem(items[0]);
    expect(normalized.type).toBe("Concept");
    expect(normalized.body).toBe("Body content");
  });

  it("MarkdownDirectoryConnector should ingest generic markdown", async () => {
    fs.writeFileSync(path.join(tmpDir, "readme.md"), "# Hello World");
    const connector = new MarkdownDirectoryConnector(fsAdapter);

    const items = await connector.ingest({
      type: "markdown-directory",
      path: tmpDir,
    });
    expect(items).toHaveLength(1);

    const normalized = normalizeRawItem(items[0]);
    expect(normalized.type).toBe("Document"); // fallback
    expect(normalized.conceptId).toBe("readme");
  });

  it("OpenWikiConnector should tag index files", async () => {
    fs.writeFileSync(path.join(tmpDir, "index.md"), "# Wiki Index");
    const connector = new OpenWikiConnector(fsAdapter);

    const items = await connector.ingest({ type: "openwiki", path: tmpDir });
    expect(items).toHaveLength(1);
    expect(items[0].metadata.isIndex).toBe(true);
  });

  it("OpenApiConnector should extract endpoints", async () => {
    const apiFile = path.join(tmpDir, "api.json");
    fs.writeFileSync(
      apiFile,
      JSON.stringify({
        paths: {
          "/users": {
            get: { summary: "List users", operationId: "listUsers" },
            post: { summary: "Create user" },
          },
        },
      }),
    );

    const connector = new OpenApiConnector(fsAdapter);
    const items = await connector.ingest({ type: "openapi", path: apiFile });

    expect(items).toHaveLength(2);

    const listUsersItem = items.find(
      (i) => i.metadata.conceptId === "listUsers",
    );
    expect(listUsersItem).toBeDefined();

    const normalized = normalizeRawItem(listUsersItem!);
    expect(normalized.type).toBe("Endpoint");
    expect(normalized.conceptId).toBe("listUsers");
  });
});
