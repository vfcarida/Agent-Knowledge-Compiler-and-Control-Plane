import fs from "node:fs";
import yaml from "yaml";
import { z } from "zod";
import { PolicyCardSchema } from "./schema.js";
import type { PolicyCard } from "./types.js";

export class PolicyLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PolicyLoadError";
  }
}

export function loadPolicy(filePath: string): PolicyCard {
  if (!fs.existsSync(filePath)) {
    throw new PolicyLoadError(`Policy file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsedYaml: any;
  try {
    parsedYaml = yaml.parse(fileContent);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    throw new PolicyLoadError(
      `Failed to parse YAML file at ${filePath}:\n${error.message}`,
    );
  }

  try {
    return PolicyCardSchema.parse(parsedYaml);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.errors
        .map((err) => `- ${err.path.join(".")}: ${err.message}`)
        .join("\n");
      throw new PolicyLoadError(
        `Policy validation failed in ${filePath}:\n${issues}`,
      );
    }
    throw new PolicyLoadError(`Unknown validation error in ${filePath}`);
  }
}
