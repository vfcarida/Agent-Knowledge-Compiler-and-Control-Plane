import fs from "node:fs";
import yaml from "yaml";
import { z } from "zod";
import { AkcpConfigSchema, CompileConfigSchema, ControlPlaneConfigSchema, type AkcpConfig } from "./akcp-config-schema.js";

export class ConfigLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigLoadError";
  }
}

export function loadAkcpConfig(filePath: string): AkcpConfig {
  if (!fs.existsSync(filePath)) {
    throw new ConfigLoadError(`Configuration file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsedYaml: any;
  try {
    parsedYaml = yaml.parse(fileContent);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    throw new ConfigLoadError(
      `Failed to parse YAML file at ${filePath}:\n${error.message}`,
    );
  }

  try {
    const config = AkcpConfigSchema.parse(parsedYaml);
    
    // Normalize root-level definitions to compile/controlPlane
    if (!config.compile && (config.sources || config.targets)) {
      config.compile = {
        sources: config.sources || [],
        targets: config.targets || [],
        budgets: config.contextBudget
      };
    }
    if (!config.controlPlane && (config.policies || config.mcp || config.evals)) {
      config.controlPlane = {
        policies: config.policies,
        mcp: config.mcp,
        evalGates: config.evals?.datasets ? [{ name: "default", strict: true }] : undefined
      };
    }
    
    if (config.compile) CompileConfigSchema.parse(config.compile);
    if (config.controlPlane) ControlPlaneConfigSchema.parse(config.controlPlane);
    
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.errors
        .map((err) => `- ${err.path.join(".")}: ${err.message}`)
        .join("\n");
      throw new ConfigLoadError(
        `Configuration validation failed in ${filePath}:\n${issues}`,
      );
    }
    throw new ConfigLoadError(`Unknown validation error in ${filePath}`);
  }
}
