import { ConformanceRunner } from "./packages/conformance/src/runner.js";
import path from "path";

async function main() {
  const runner = new ConformanceRunner(path.resolve("examples/domains/it-operations"));
  const report = await runner.run();
  console.log(JSON.stringify(report, null, 2));
}

main().catch(console.error);
