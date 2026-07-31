import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { PiiRedactor } from "../../privacy/pii-redactor.js";
import { RegexPiiDetector } from "../../privacy/regex-pii-detector.js";

// Deliberately narrower than fast-check's built-in fc.emailAddress(): guaranteed to match
// RegexPiiDetector's email pattern (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/),
// which doesn't cover the full RFC 5322 address grammar fast-check's generator can produce
// (quoted local parts, IP-literal domains, etc). Using the generic generator here would
// risk spurious property failures unrelated to the redaction logic under test.
const safeEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-zA-Z0-9]{1,10}$/),
    fc.stringMatching(/^[a-zA-Z0-9]{1,10}$/),
    fc.constantFrom("com", "org", "net", "io"),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/**
 * Property-based coverage for PiiRedactor's blockedClasses/allowedClasses
 * precedence (see the fix in redact() — a class present in BOTH lists must
 * still be redacted, not silently passed through) plus general redaction
 * invariants across many generated inputs, complementing the fixture-based
 * tests in pii-redactor.test.ts.
 *
 * redact() is async, so these use fc.asyncProperty (not fc.property, which
 * does not await an async predicate — it would resolve to a truthy Promise
 * and the property would spuriously "pass" without the assertions running).
 */

describe("PiiRedactor (property-based)", () => {
  it("never leaves a generated email address unredacted in redact/tokenize mode, regardless of allowedClasses", async () => {
    await fc.assert(
      fc.asyncProperty(
        safeEmailArb,
        fc.string({ maxLength: 20 }),
        fc.string({ maxLength: 20 }),
        fc.constantFrom<"redact" | "tokenize">("redact", "tokenize"),
        async (email, prefix, suffix, mode) => {
          const redactor = new PiiRedactor(new RegexPiiDetector());
          const text = `${prefix} ${email} ${suffix}`;
          const result = await redactor.redact(text, { mode });
          expect(result.redactedText).not.toContain(email);
        },
      ),
    );
  });

  it("blockedClasses always wins over allowedClasses when a class appears in both", async () => {
    await fc.assert(
      fc.asyncProperty(safeEmailArb, async (email) => {
        const redactor = new PiiRedactor(new RegexPiiDetector());
        const text = `Email on file: ${email}`;
        const result = await redactor.redact(text, {
          mode: "redact",
          allowedClasses: ["email"],
          blockedClasses: ["email"],
        });
        // Blocked must take precedence: the email must still be redacted,
        // never silently passed through because it was also "allowed".
        expect(result.redactedText).not.toContain(email);
      }),
    );
  });

  it("a class present only in allowedClasses (not blocked) is left untouched", async () => {
    await fc.assert(
      fc.asyncProperty(safeEmailArb, async (email) => {
        const redactor = new PiiRedactor(new RegexPiiDetector());
        const text = `Email on file: ${email}`;
        const result = await redactor.redact(text, {
          mode: "redact",
          allowedClasses: ["email"],
        });
        expect(result.redactedText).toContain(email);
      }),
    );
  });

  it("detect-only mode never modifies the input text", async () => {
    await fc.assert(
      fc.asyncProperty(safeEmailArb, async (email) => {
        const redactor = new PiiRedactor(new RegexPiiDetector());
        const text = `Reach out via ${email} please.`;
        const result = await redactor.redact(text, { mode: "detect-only" });
        expect(result.redactedText).toBe(text);
      }),
    );
  });
});
