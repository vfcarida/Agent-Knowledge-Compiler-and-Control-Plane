#!/usr/bin/env node
console.warn(
  `\x1b[33m[DEPRECATION WARNING] The 'ocf' command is deprecated. Please use the canonical 'akcp' command instead.\x1b[0m`,
);
import("./index.js");
