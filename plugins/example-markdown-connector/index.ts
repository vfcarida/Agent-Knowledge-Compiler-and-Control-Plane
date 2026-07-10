/**
 * Example Markdown Connector
 * Demonstrates a minimal build-time plugin for AKCP.
 */

export interface MarkdownSourceConfig {
  directory: string;
}

export class ExampleMarkdownConnector {
  private config: MarkdownSourceConfig;

  constructor(config: MarkdownSourceConfig) {
    this.config = config;
  }

  async fetchDocuments(): Promise<{ id: string; content: string }[]> {
    // In a real plugin, we would use the fs:read permission here to read the directory.
    // For this example, we mock the result.
    console.log(`[Plugin] Fetching markdown from ${this.config.directory}...`);
    return [
      { id: 'doc1', content: '# Hello World\nThis is a mock document.' },
      { id: 'doc2', content: '# Second Doc\nAnother mock document.' }
    ];
  }
}
