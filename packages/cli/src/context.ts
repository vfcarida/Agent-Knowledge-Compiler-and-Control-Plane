import type { CLIContext } from "./types.js";

export function createCLIContext(): CLIContext {
  return {
    cwd: process.cwd(),
  };
}
