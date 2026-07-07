/**
 * @module services/ollama-service
 * @description Local Ollama LLM integration service for OCF.
 */

/**
 * Service to connect to a local Ollama instance for offline inference.
 */
export class OllamaService {
  private readonly baseUrl: string;
  private readonly modelName: string;

  constructor() {
    this.baseUrl = process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434';
    this.modelName = process.env['OLLAMA_MODEL'] || 'gemma4:e4b';
  }

  /**
   * Generates completion using local Ollama model.
   *
   * @param prompt - Prompt for the LLM
   * @param systemPrompt - Optional system prompt
   */
  async generateCompletion(prompt: string, systemPrompt?: string): Promise<string> {
    // Normalize URL: remove trailing /v1 or slashes to target /api/generate
    const cleanBaseUrl = this.baseUrl.replace(/\/v1\/?$/, '').replace(/\/$/, '');
    const url = `${cleanBaseUrl}/api/generate`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelName,
          prompt,
          system: systemPrompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed with status: ${response.status}`);
      }

      const data = (await response.json()) as { response: string };
      return data.response;
    } catch (error) {
      console.error('[OllamaService] Error calling Ollama:', error);
      throw new Error(
        `Failed to generate local completion: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
