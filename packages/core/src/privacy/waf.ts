/**
 * WAF (Web Application Firewall) for prompt injection detection.
 *
 * Strategy:
 * 1. If LAKERA_API_KEY is set, use Lakera AI API (production-grade ML detection)
 * 2. Otherwise, fall back to local regex heuristics (development/offline mode)
 *
 * Security & Defense-in-Depth Note:
 * The regex fallback is a defense-in-depth measure, NOT a substitute for a production
 * ML-based security gateway like Lakera. Regex heuristics are hardened against common
 * evasion tactics (Unicode normalization, zero-width characters, homoglyphs, character
 * repetition, base64 payload decoding, and multi-language variants) while maintaining
 * low false-positive rates on legitimate domain text.
 *
 * References:
 * - OWASP LLM01: Prompt Injection
 * - NIST AI RMF
 * - Liu et al. (2024) "Prompt Injection: A Critical Analysis"
 * - https://www.lakera.ai/
 */

export interface WAFResult {
  flagged: boolean;
  reason?: string;
  provider: "lakera" | "openai" | "regex-fallback";
  suspicious?: boolean;
}

export interface ISecurityGateway {
  checkPrompt(prompt: string): Promise<WAFResult>;
}

export interface LakeraGatewayOptions {
  /**
   * When true, a Lakera API failure (auth error, outage, schema change) BLOCKS
   * the request instead of silently downgrading to the weaker regex fallback.
   * Off by default to preserve prior behavior; deployments that treat Lakera
   * as their primary defense (rather than defense-in-depth) should enable it.
   */
  failClosedOnGatewayError?: boolean;
}

/**
 * Common Cyrillic and Greek homoglyphs mapped to ASCII equivalents.
 */
const HOMOGLYPH_MAP: Record<string, string> = {
  // Cyrillic lowercase
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "c",
  т: "t",
  у: "y",
  ф: "f",
  х: "x",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
  ё: "e",
  і: "i",
  ј: "j",
  ѕ: "s",
  ѵ: "v",
  ѳ: "f",
  ѣ: "e",
  // Cyrillic uppercase
  А: "A",
  В: "B",
  Е: "E",
  К: "K",
  М: "M",
  Н: "H",
  О: "O",
  Р: "P",
  С: "C",
  Т: "T",
  У: "Y",
  Х: "X",
  І: "I",
  Ј: "J",
  Ѕ: "S",
  // Greek lowercase
  α: "a",
  β: "b",
  γ: "g",
  δ: "d",
  ε: "e",
  ζ: "z",
  η: "h",
  θ: "th",
  ι: "i",
  κ: "k",
  λ: "l",
  μ: "m",
  ν: "n",
  ξ: "x",
  ο: "o",
  π: "p",
  ρ: "r",
  σ: "s",
  ς: "s",
  τ: "t",
  υ: "u",
  φ: "f",
  χ: "x",
  ψ: "ps",
  ω: "o",
  // Greek uppercase
  Α: "A",
  Β: "B",
  Γ: "G",
  Δ: "D",
  Ε: "E",
  Ζ: "Z",
  Η: "H",
  Θ: "TH",
  Ι: "I",
  Κ: "K",
  Λ: "L",
  Μ: "M",
  Ν: "N",
  Ξ: "X",
  Ο: "O",
  Π: "P",
  Ρ: "P",
  Σ: "S",
  Τ: "T",
  Υ: "Y",
  Φ: "F",
  Χ: "X",
  Ψ: "PS",
  Ω: "O",
  // Fullwidth / special Latin lookalikes
  ａ: "a",
  ｂ: "b",
  ｃ: "c",
  ｄ: "d",
  ｅ: "e",
  ｆ: "f",
  ｇ: "g",
  ｈ: "h",
  ｉ: "i",
  ｊ: "j",
  ｋ: "k",
  ｌ: "l",
  ｍ: "m",
  ｎ: "n",
  ｏ: "o",
  ｐ: "p",
  ｑ: "q",
  ｒ: "r",
  ｓ: "s",
  ｔ: "t",
  ｕ: "u",
  ｖ: "v",
  ｗ: "w",
  ｘ: "x",
  ｙ: "y",
  ｚ: "z",
  Ａ: "A",
  Ｂ: "B",
  Ｃ: "C",
  Ｄ: "D",
  Ｅ: "E",
  Ｆ: "F",
  Ｇ: "G",
  Ｈ: "H",
  Ｉ: "I",
  Ｊ: "J",
  Ｋ: "K",
  Ｌ: "L",
  Ｍ: "M",
  Ｎ: "N",
  Ｏ: "O",
  Ｐ: "P",
  Ｑ: "Q",
  Ｒ: "R",
  Ｓ: "S",
  Ｔ: "T",
  Ｕ: "U",
  Ｖ: "V",
  Ｗ: "W",
  Ｘ: "X",
  Ｙ: "Y",
  Ｚ: "Z",
};

/**
 * Regex matching invisible zero-width and directional control characters:
 * - U+200B (Zero-width space)
 * - U+200C (Zero-width non-joiner)
 * - U+200D (Zero-width joiner)
 * - U+FEFF (BOM / Zero-width no-break space)
 * - U+00AD (Soft hyphen)
 * - U+200E / U+200F (LRM / RLM)
 * - U+202A - U+202E (Bidi embedding / overrides)
 * - U+2060 - U+206F (Invisible formatting & tags)
 */
const ZERO_WIDTH_REGEX =
  /[\u200B-\u200D\uFEFF\u00AD\u200E\u200F\u202A-\u202E\u2060-\u206F]/g;

/**
 * Normalizes input text before applying WAF pattern matching:
 * 1. Unicode NFKC compatibility normalization
 * 2. Stripping zero-width and invisible control characters
 * 3. Cyrillic and Greek homoglyph substitution
 * 4. Interspersed character collapsing (e.g., "i.g.n.o.r.e" or "I-g-n-o-r-e")
 * 5. Leetspeak digit/symbol word normalization (e.g., "Ign0re" -> "Ignore")
 * 6. Collapsing whitespace
 */
export function normalizeText(input: string): string {
  if (!input) return "";

  // 1. Unicode NFKC normalization
  let text = input.normalize("NFKC");

  // 2. Strip zero-width and invisible control characters
  text = text.replace(ZERO_WIDTH_REGEX, "");

  // 3. Substitute known homoglyphs
  let normalized = "";
  for (const char of text) {
    normalized += HOMOGLYPH_MAP[char] ?? char;
  }
  text = normalized;

  // 4. Collapse single characters separated by dots, dashes, or underscores (e.g. "i.g.n.o.r.e" or "I-g-n-o-r-e")
  text = text.replace(/(?:[a-zA-Z][.\-_]){2,}[a-zA-Z]/gi, (match) => {
    return match.replace(/[.\-_]/g, "");
  });

  // 5. Deobfuscate leetspeak within words (e.g. "Ign0re pr3vious instruc7ions")
  text = text.replace(/\b[a-zA-Z0-9@$!]+\b/g, (word) => {
    // Preserve common tech terms containing numbers
    if (
      /^base(?:64|32|16)$/i.test(word) ||
      /^(?:utf|sha|md|win|x)\d+$/i.test(word)
    ) {
      return word;
    }

    if (/[a-zA-Z]/.test(word) && /[0-9@$!]/.test(word)) {
      return word
        .replace(/0/g, "o")
        .replace(/1/g, "i")
        .replace(/!/g, "i")
        .replace(/3/g, "e")
        .replace(/4/g, "a")
        .replace(/@/g, "a")
        .replace(/5/g, "s")
        .replace(/\$/g, "s")
        .replace(/7/g, "t")
        .replace(/8/g, "b");
    }
    return word;
  });

  // 6. Collapse multiple spaces
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Extracts and decodes potential base64-encoded strings within text.
 */
function extractBase64Payloads(text: string): string[] {
  const base64Regex = /\b[A-Za-z0-9+/]{12,}={0,2}\b/g;
  const matches = text.match(base64Regex) || [];
  const decodedPayloads: string[] = [];

  for (const match of matches) {
    try {
      const decoded = Buffer.from(match, "base64").toString("utf-8");
      // Check if the decoded buffer is printable ASCII/Latin text
      if (
        /^[\x20-\x7E\s\u00A0-\u024F]+$/.test(decoded) &&
        decoded.trim().length >= 6
      ) {
        decodedPayloads.push(normalizeText(decoded));
      }
    } catch {
      // Ignore decoding errors
    }
  }

  return decodedPayloads;
}

export class LakeraGateway implements ISecurityGateway {
  private apiKey: string | undefined;
  private failClosedOnGatewayError: boolean;

  constructor(options: LakeraGatewayOptions = {}) {
    this.apiKey = process.env.LAKERA_API_KEY;
    this.failClosedOnGatewayError = options.failClosedOnGatewayError ?? false;
  }

  async checkPrompt(prompt: string): Promise<WAFResult> {
    if (!this.apiKey) {
      console.warn(
        "[WAF] LAKERA_API_KEY not set. Falling back to local Regex heuristic.",
      );
      return this.regexFallback(prompt);
    }

    try {
      const response = await fetch(
        "https://api.lakera.ai/v1/prompt_injection",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input: prompt }),
        },
      );

      if (!response.ok) {
        throw new Error(`Lakera API error: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        flagged?: boolean;
        results?: Array<{ flagged?: boolean }>;
      };

      const isFlagged =
        data.flagged || (data.results && data.results[0]?.flagged);

      return {
        flagged: !!isFlagged,
        reason: isFlagged
          ? "Lakera AI detected potential prompt injection"
          : undefined,
        provider: "lakera",
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (this.failClosedOnGatewayError) {
        console.error(
          `[WAF] Lakera API call failed (${message}). Failing closed (blocking request) per failClosedOnGatewayError=true.`,
        );
        return {
          flagged: true,
          reason: `Security Gateway unavailable and failClosedOnGatewayError is enabled: ${message}`,
          provider: "lakera",
        };
      }
      console.error(
        `[WAF] Lakera API call failed (${message}). Falling back to local Regex.`,
      );
      return this.regexFallback(prompt);
    }
  }

  private regexFallback(prompt: string): WAFResult {
    const normalizedPrompt = normalizeText(prompt);

    const injectionPatterns: Array<{ pattern: RegExp; description: string }> = [
      // ─── 1. Direct Instruction Overrides (English) ──────────────────────────
      {
        pattern:
          /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|guidelines)/i,
        description: "instruction override",
      },
      {
        pattern:
          /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|context|rules)/i,
        description: "instruction disregard",
      },
      {
        pattern:
          /stop\s+everything[.,!]?\s*(?:reveal|show|output|print|ignore)/i,
        description: "emergency stop override",
      },
      {
        pattern: /print\s+(?:out\s+)?everything\s+above\s+this\s+line/i,
        description: "context extraction",
      },

      // ─── 2. Multi-Language Direct Overrides (PT / ES / FR / DE) ─────────────
      // Portuguese: "ignore as instruções anteriores", "desconsidere as regras prévias"
      {
        pattern:
          /(?:ignore|desconsidere|esqueca|esqueça)\s+(?:todas\s+)?(?:as\s+)?(?:instrucoes|instruções|regras|diretrizes|orientacoes|orientações)\s+(?:anteriores|previas|prévias|passadas|acima)/i,
        description: "instruction override",
      },
      // Spanish: "ignora las instrucciones anteriores", "olvida las reglas previas"
      {
        pattern:
          /(?:ignora|ignorar|desestima|olvida|olvidar)\s+(?:todas\s+)?(?:las\s+)?(?:instrucciones|reglas|directrices)\s+(?:anteriores|previas|de\s+arriba)/i,
        description: "instruction override",
      },
      // French: "ignorer toutes les instructions précédentes"
      {
        pattern:
          /(?:ignorer|ignore|oublier|oublie)\s+(?:toutes\s+)?(?:les\s+)?(?:instructions|regles|règles|directives)\s+(?:precedentes|précédentes|anterieures|antérieures|ci-dessus)/i,
        description: "instruction override",
      },
      // German: "ignoriere alle vorherigen anweisungen"
      {
        pattern:
          /(?:ignoriere|vergiss)\s+(?:alle\s+)?(?:vorherigen|bisherigen)\s+(?:anweisungen|regeln)/i,
        description: "instruction override",
      },

      // ─── 3. Role Hijacking & Jailbreak Attacks ──────────────────────────────
      {
        pattern: /you\s+are\s+now\s+(a|an|acting\s+as)\s+/i,
        description: "role hijacking",
      },
      {
        pattern: /\byou\s+are\s+dan\b|\bdan\s+mode\s+(?:enabled|activated)\b/i,
        description: "role hijacking",
      },
      {
        pattern:
          /pretend\s+(you\s+are|to\s+be)\s+(?:a\s+)?(?:rogue|unrestricted|evil|dan|sid|hacker|root|admin)\b/i,
        description: "role pretend",
      },
      {
        pattern:
          /act\s+as\s+(?:an?\s+)?(?:unrestricted|unfiltered|jailbroken|evil|rogue|dan|snoo|sid|hacker|root|admin|penetration\s+tester|ai\s+without\s+(?:rules|filters|guidelines))\b/i,
        description: "role reassignment",
      },
      {
        pattern:
          /act\s+as\s+if\s+(?:you\s+have\s+no|there\s+are\s+no|all\s+rules\s+are)\s+(?:rules|filters|limits|restrictions)/i,
        description: "rule suspension",
      },
      // Multi-language role hijacking
      {
        pattern:
          /(?:você\s+agora\s+é|voce\s+agora\s+e|aja\s+como|finja\s+ser)\s+(?:um\s+|uma\s+)?(?:assistente\s+sem\s+(?:regras|restrições|restricoes)|ia\s+sem\s+(?:regras|restrições|restricoes)|hacker|root|admin)\b/i,
        description: "role hijacking",
      },
      {
        pattern:
          /(?:ahora\s+eres|actúa\s+como|actua\s+como|finge\s+ser)\s+(?:un\s+|una\s+)?(?:asistente\s+sin\s+(?:reglas|restricciones)|ia\s+sin\s+(?:reglas|restricciones)|hacker|root|admin)\b/i,
        description: "role hijacking",
      },

      // ─── 4. System Prompt Extraction & Probing ──────────────────────────────
      {
        pattern:
          /(?:reveal|show|display|print|output)\s+(?:your\s+)?system\s+prompt/i,
        description: "system prompt extraction",
      },
      {
        pattern:
          /what\s+(?:are|is)\s+your\s+(?:system\s+)?(?:instructions|prompt|rules)/i,
        description: "instruction probing",
      },
      {
        pattern:
          /(?:revele|mostre|exiba|imprima)\s+(?:o\s+)?(?:seu\s+)?(?:prompt\s+do\s+sistema|instruções\s+do\s+sistema|instrucoes\s+do\s+sistema|regras\s+do\s+sistema)/i,
        description: "system prompt extraction",
      },
      {
        pattern:
          /(?:revela|muestra|imprime)\s+(?:el\s+)?(?:tu\s+)?(?:prompt\s+del\s+sistema|instrucciones\s+del\s+sistema)/i,
        description: "system prompt extraction",
      },

      // ─── 5. Fake Authority & Policy Tampering ───────────────────────────────
      {
        pattern:
          /(?:user|admin)\s+(?:'[^']+'\s+)?has\s+updated\s+your\s+policy/i,
        description: "fake policy update",
      },
      {
        pattern:
          /(?:system\s+administrator|lead\s+developer|root\s+user)\s+has\s+disabled\s+all\s+filters/i,
        description: "fake admin filter disable",
      },
      {
        pattern:
          /(?:authorize|authorized\s+by\s+root)\s+.*bypass\s+(?:the\s+)?security\s+checks/i,
        description: "fake security bypass authorization",
      },
      {
        pattern: /override\s+safety\b/i,
        description: "safety override keyword",
      },

      // ─── 6. SQL Injection (in tool arguments) ──────────────────────────────
      { pattern: /(?:;\s*)?drop\s+table\b/i, description: "SQL injection" },
      {
        pattern: /(?:;\s*)?(?:union\s+select|insert\s+into|delete\s+from)\b/i,
        description: "SQL injection",
      },
      {
        pattern: /'\s*(?:or|and)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i,
        description: "SQL injection",
      },

      // ─── 7. Delimiter & Code Block Injection ────────────────────────────────
      { pattern: /\[SYSTEM\]/i, description: "delimiter injection" },
      { pattern: /<<SYS>>/i, description: "delimiter injection" },
      { pattern: /```system/i, description: "code block injection" },

      // ─── 8. Obfuscation & Encoding Bypass ───────────────────────────────────
      {
        pattern: /base64\s*decode|eval\s*\(/i,
        description: "encoding bypass",
      },
    ];

    // Check normalized prompt against direct patterns
    for (const { pattern, description } of injectionPatterns) {
      if (pattern.test(normalizedPrompt)) {
        return {
          flagged: true,
          reason: `Regex heuristics matched: ${description} (${pattern.source})`,
          provider: "regex-fallback",
        };
      }
    }

    // Check extracted base64 decoded payloads
    const base64Payloads = extractBase64Payloads(prompt);
    for (const decoded of base64Payloads) {
      for (const { pattern, description } of injectionPatterns) {
        if (pattern.test(decoded)) {
          return {
            flagged: true,
            reason: `Base64 encoded injection detected: ${description} (${pattern.source})`,
            provider: "regex-fallback",
          };
        }
      }
    }

    return {
      flagged: false,
      provider: "regex-fallback",
    };
  }
}
