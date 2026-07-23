import { describe, it, expect } from "vitest";
import {
  createSseTransport,
  createStreamableHttpTransport,
  createStdioTransport,
} from "../transport.js";

describe("Remote transport auth requirement", () => {
  it("throws if remote mode without auth config", () => {
    expect(() =>
      createSseTransport({ auth: undefined, insecureNoAuth: false }, "/test"),
    ).toThrow("requires authentication");

    expect(() =>
      createStreamableHttpTransport({ auth: undefined, insecureNoAuth: false }),
    ).toThrow("requires authentication");
  });

  it("allows remote with auth configured", () => {
    expect(() =>
      createSseTransport({ auth: { jwt: { secret: "test" } } }, "/test"),
    ).not.toThrow();

    expect(() =>
      createStreamableHttpTransport({ auth: { jwt: { secret: "test" } } }),
    ).not.toThrow();
  });

  it("allows remote without auth if --insecure-no-auth", () => {
    expect(() =>
      createSseTransport({ auth: undefined, insecureNoAuth: true }, "/test"),
    ).not.toThrow();

    expect(() =>
      createStreamableHttpTransport({ auth: undefined, insecureNoAuth: true }),
    ).not.toThrow();
  });

  it("stdio mode does not require auth", () => {
    expect(() => createStdioTransport({})).not.toThrow();
  });
});
