import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  MockLLMProvider,
  OpenAIProvider,
  OllamaProvider,
  createLLMProvider,
  EvalsHarness,
} from "../index.js";

describe("Evals LLM Providers", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("MockLLMProvider", () => {
    it("returns deterministic mock response", async () => {
      const provider = new MockLLMProvider();
      const res = await provider.chat("sys prompt", "user query");
      expect(res.text).toContain("MOCK_RESPONSE");
      expect(res.tokens).toBe(150);
    });
  });

  describe("OpenAIProvider", () => {
    it("defaults model to gpt-4o-mini", () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_MODEL;
      const provider = new OpenAIProvider();
      expect((provider as any).model).toBe("gpt-4o-mini");
    });

    it("falls back to MockLLMProvider when OPENAI_API_KEY is not set", async () => {
      delete process.env.OPENAI_API_KEY;
      const provider = new OpenAIProvider();
      const res = await provider.chat("sys", "user");
      expect(res.text).toContain("MOCK_RESPONSE");
    });

    it("calls OpenAI chat completions API when configured", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Real AI Response" } }],
          usage: { total_tokens: 42 },
        }),
      });
      globalThis.fetch = mockFetch;

      const provider = new OpenAIProvider({
        apiKey: "sk-test-key",
        model: "gpt-4o",
      });

      const res = await provider.chat("sys", "user");
      expect(res.text).toBe("Real AI Response");
      expect(res.tokens).toBe(42);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer sk-test-key",
          }),
        }),
      );
    });
  });

  describe("OllamaProvider", () => {
    it("defaults to localhost:11434 and llama3.2", () => {
      delete process.env.OLLAMA_BASE_URL;
      delete process.env.OLLAMA_MODEL;
      const provider = new OllamaProvider();
      expect((provider as any).baseUrl).toBe("http://localhost:11434");
      expect((provider as any).model).toBe("llama3.2");
    });

    it("calls Ollama generate API successfully", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: "Ollama generated text",
          eval_count: 20,
          prompt_eval_count: 10,
        }),
      });
      globalThis.fetch = mockFetch;

      const provider = new OllamaProvider({
        baseUrl: "http://my-ollama:11434",
        model: "mistral",
      });

      const res = await provider.chat("sys", "user");
      expect(res.text).toBe("Ollama generated text");
      expect(res.tokens).toBe(30);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://my-ollama:11434/api/generate",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"model":"mistral"'),
        }),
      );
    });

    it("falls back to MockLLMProvider on network failure", async () => {
      globalThis.fetch = vi
        .fn()
        .mockRejectedValue(new Error("Connection refused"));
      const provider = new OllamaProvider();
      const res = await provider.chat("sys", "user");
      expect(res.text).toContain("MOCK_RESPONSE");
    });
  });

  describe("createLLMProvider & EvalsHarness", () => {
    it("selects OllamaProvider when OLLAMA_MODEL is configured", () => {
      process.env.OLLAMA_MODEL = "deepseek-r1";
      const provider = createLLMProvider();
      expect(provider).toBeInstanceOf(OllamaProvider);
    });

    it("selects OpenAIProvider when OPENAI_API_KEY is configured", () => {
      delete process.env.OLLAMA_MODEL;
      delete process.env.OLLAMA_BASE_URL;
      process.env.OPENAI_API_KEY = "sk-live";
      const provider = createLLMProvider();
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it("defaults to MockLLMProvider when no credentials are present", () => {
      delete process.env.OLLAMA_MODEL;
      delete process.env.OLLAMA_BASE_URL;
      delete process.env.OPENAI_API_KEY;
      const provider = createLLMProvider();
      expect(provider).toBeInstanceOf(MockLLMProvider);
    });

    it("initializes EvalsHarness with selected provider", () => {
      const harness = new EvalsHarness();
      expect(harness.provider).toBeDefined();
    });
  });
});
