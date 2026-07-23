import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// We import directly from the source files using tsx
import { profileServerCapabilities } from "../packages/mcp-profile-server/src/capabilities.js";
import { automationServerCapabilities } from "../packages/mcp-automation-server/src/capabilities.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const capabilitiesDir = path.join(rootDir, "capabilities");

if (!fs.existsSync(capabilitiesDir)) {
  fs.mkdirSync(capabilitiesDir, { recursive: true });
}

fs.writeFileSync(
  path.join(capabilitiesDir, "profile-server.json"),
  JSON.stringify(profileServerCapabilities, null, 2),
);

fs.writeFileSync(
  path.join(capabilitiesDir, "automation-server.json"),
  JSON.stringify(automationServerCapabilities, null, 2),
);

console.log("[OK] Capability Registry generated successfully.");
