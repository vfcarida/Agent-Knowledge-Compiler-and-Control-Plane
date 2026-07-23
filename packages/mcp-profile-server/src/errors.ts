/**
 * @module errors
 * @description Custom error classes for the AKCP MCP Server.
 *
 * All errors return structured, descriptive messages that help the LLM client
 * understand why a tool call failed and self-correct if possible.
 */

/**
 * Base class for all MCP server related errors.
 */
export class AKCPMCPError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AKCPMCPError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Thrown when an MCP tool execution fails.
 */
export class MCPToolExecutionError extends AKCPMCPError {
  constructor(
    toolName: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(
      `MCP Tool [${toolName}] failed: ${message}`,
      "MCP_TOOL_EXECUTION_ERROR",
      { toolName, ...details },
    );
    this.name = "MCPToolExecutionError";
  }
}

/**
 * Thrown when trying to orchestrate an application on an unsupported platform.
 */
export class PlatformNotSupportedError extends AKCPMCPError {
  constructor(url: string) {
    super(
      `The job application URL "${url}" is on a platform that is not supported yet. ` +
        "Currently supported platforms: LinkedIn, Gupy, Indeed.",
      "PLATFORM_NOT_SUPPORTED",
      { url },
    );
    this.name = "PlatformNotSupportedError";
  }
}

/**
 * Thrown during browser automation when page actions or page object elements fail.
 */
export class AutomationError extends AKCPMCPError {
  constructor(
    platform: string,
    step: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(
      `Browser automation failed on [${platform}] during step [${step}]: ${message}`,
      "AUTOMATION_ERROR",
      { platform, step, ...details },
    );
    this.name = "AutomationError";
  }
}
