import { describe, it, expect, vi, beforeEach } from "vitest";

import type { IFileSystemAdapter } from "../domain/interfaces.js";
import type { LogEntry } from "../domain/types.js";
import { LogService } from "../services/log-service.js";

describe("LogService", () => {
  let mockFs: {
    [K in keyof IFileSystemAdapter]: ReturnType<typeof vi.fn>;
  };
  let service: LogService;
  const logFilePath = "/bundle/log.md";

  const makeEntry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
    timestamp: "2026-07-01T10:00:00Z",
    action: "created",
    conceptId: "skills/typescript",
    details: "Added TypeScript skill",
    ...overrides,
  });

  beforeEach(() => {
    mockFs = {
      readFile: vi.fn(),
      writeFile: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn().mockResolvedValue(true),
      mkdir: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      listFiles: vi.fn().mockResolvedValue([]),
    };

    service = new LogService(mockFs, logFilePath);
  });

  it("should create log.md if it does not exist", async () => {
    mockFs.exists.mockResolvedValue(false);
    mockFs.readFile.mockRejectedValue(new Error("File not found"));

    await service.append(makeEntry());

    expect(mockFs.writeFile).toHaveBeenCalledWith(
      logFilePath,
      expect.stringContaining("skills/typescript"),
    );
  });

  it("should append entry to existing log", async () => {
    const existingContent = [
      "---",
      "type: Log",
      "---",
      "",
      "| Timestamp | Action | Concept ID | Details |",
      "| --- | --- | --- | --- |",
      "| 2026-06-30T09:00:00Z | created | skills/react | Added React skill |",
    ].join("\n");

    mockFs.exists.mockResolvedValue(true);
    mockFs.readFile.mockResolvedValue(existingContent);

    await service.append(makeEntry());

    expect(mockFs.writeFile).toHaveBeenCalled();
    const writtenContent = mockFs.writeFile.mock.calls[0][1] as string;
    expect(writtenContent).toContain("skills/typescript");
    expect(writtenContent).toContain("skills/react");
  });

  it("should prepend new entries (newest first)", async () => {
    const existingContent = [
      "---",
      "type: Log",
      "---",
      "",
      "| Timestamp | Action | Concept ID | Details |",
      "| --- | --- | --- | --- |",
      "| 2026-06-30T09:00:00Z | created | skills/react | Added React skill |",
    ].join("\n");

    mockFs.exists.mockResolvedValue(true);
    mockFs.readFile.mockResolvedValue(existingContent);

    const newEntry = makeEntry({ timestamp: "2026-07-01T12:00:00Z" });
    await service.append(newEntry);

    const writtenContent = mockFs.writeFile.mock.calls[0][1] as string;
    const tsIndex = writtenContent.indexOf("2026-07-01T12:00:00Z");
    const oldIndex = writtenContent.indexOf("2026-06-30T09:00:00Z");
    expect(tsIndex).toBeLessThan(oldIndex);
  });

  it("should format timestamps in ISO 8601", async () => {
    mockFs.exists.mockResolvedValue(false);
    mockFs.readFile.mockRejectedValue(new Error("File not found"));

    const entry = makeEntry({ timestamp: "2026-07-01T10:30:00Z" });
    await service.append(entry);

    const writtenContent = mockFs.writeFile.mock.calls[0][1] as string;
    expect(writtenContent).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
    expect(writtenContent).toContain("2026-07-01T10:30:00Z");
  });

  it("should parse entries from existing log.md", async () => {
    const logContent = [
      "---",
      "type: Log",
      "---",
      "",
      "| Timestamp | Action | Concept ID | Details |",
      "| --- | --- | --- | --- |",
      "| 2026-07-01T10:00:00Z | created | skills/typescript | Added TypeScript skill |",
      "| 2026-06-30T09:00:00Z | created | skills/react | Added React skill |",
    ].join("\n");

    mockFs.exists.mockResolvedValue(true);
    mockFs.readFile.mockResolvedValue(logContent);

    const entries = await service.getEntries();

    expect(entries).toHaveLength(2);
    expect(entries[0].conceptId).toBe("skills/typescript");
    expect(entries[0].action).toBe("created");
    expect(entries[1].conceptId).toBe("skills/react");
  });

  it("should return empty array for empty log", async () => {
    mockFs.exists.mockResolvedValue(false);
    mockFs.readFile.mockRejectedValue(new Error("File not found"));

    const entries = await service.getEntries();

    expect(entries).toEqual([]);
  });
});
