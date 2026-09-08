#!/usr/bin/env node

import { Command } from "commander";
import { createCLIContext } from "./context.js";
import { registerAllCommands } from "./commands/index.js";

export const program = new Command();

program
  .name("akcp")
  .description("Agent Knowledge Compiler and Control Plane CLI")
  .version("0.1.0")
  .showSuggestionAfterError();

const ctx = createCLIContext();
registerAllCommands(program, ctx);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

export { registerAllCommands } from "./commands/index.js";
export { createCLIContext } from "./context.js";
export type { CLIContext } from "./types.js";
