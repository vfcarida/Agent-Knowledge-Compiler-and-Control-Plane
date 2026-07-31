import { describe, it, expect } from "vitest";
import { success, failure, collect } from "../../domain/result.js";
import type { Result } from "../../domain/result.js";

describe("Result", () => {
  it("success() produces a Success with ok: true and the given value", () => {
    const result = success(42);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(42);
  });

  it("failure() produces a Failure with ok: false and the given error", () => {
    const err = new Error("boom");
    const result = failure(err);

    expect(result.ok).toBe(false);
    expect(result.error).toBe(err);
  });

  it("narrows via the ok discriminant", () => {
    const result: Result<number, string> = success(1);

    if (result.ok) {
      expect(result.value).toBe(1);
    } else {
      throw new Error("expected success");
    }
  });

  describe("collect()", () => {
    it("returns a success wrapping all values when every result succeeds", () => {
      const results: Result<number, string>[] = [
        success(1),
        success(2),
        success(3),
      ];

      const collected = collect(results);

      expect(collected.ok).toBe(true);
      if (collected.ok) {
        expect(collected.value).toEqual([1, 2, 3]);
      }
    });

    it("returns a failure wrapping all errors when every result fails", () => {
      const results: Result<number, string>[] = [failure("e1"), failure("e2")];

      const collected = collect(results);

      expect(collected.ok).toBe(false);
      if (!collected.ok) {
        expect(collected.error).toEqual(["e1", "e2"]);
      }
    });

    it("returns only the failures (discarding successes) when results are mixed", () => {
      const results: Result<number, string>[] = [
        success(1),
        failure("e1"),
        success(2),
        failure("e2"),
      ];

      const collected = collect(results);

      expect(collected.ok).toBe(false);
      if (!collected.ok) {
        expect(collected.error).toEqual(["e1", "e2"]);
      }
    });

    it("returns an empty success for an empty input array", () => {
      const collected = collect<number, string>([]);

      expect(collected.ok).toBe(true);
      if (collected.ok) {
        expect(collected.value).toEqual([]);
      }
    });
  });
});
