import type { PipelineContext, PipelineStage } from "../pipeline.js";
import { PiiRedactor, PiiReport } from "../../privacy/index.js";
import path from "path";

export class PrivacyStage implements PipelineStage {
  name = "privacy";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.options.privacy) return context;

    const piiRedactor = new PiiRedactor();
    const piiReport = new PiiReport();
    const mode = context.options.privacy.defaultPiiMode || "redact";
    const redactOpts = {
      mode,
      allowedClasses: context.options.privacy.allowedPiiClasses,
      blockedClasses: context.options.privacy.blockedPiiClasses,
      tokenFormat: context.options.privacy.redactionTokenFormat,
      failOnUnredactedHighRiskPii: context.options.privacy.failOnUnredactedHighRiskPii,
    };

    for (const concept of context.concepts) {
      if (!concept.body) continue;
      
      const result = await piiRedactor.redact(concept.body, redactOpts);
      if (result.blocked) {
        throw new Error(`[PII_ERROR] Build failed: Unredacted high-risk PII in ${concept.source?.filePath}`);
      }
      concept.body = result.redactedText;

      for (const finding of result.findings) {
        piiReport.addFinding(concept.source?.filePath || "unknown", finding);
      }
    }

    const reportPath = path.resolve(process.cwd(), "dist/privacy/pii-report.json");
    piiReport.save(reportPath);

    return context;
  }
}
