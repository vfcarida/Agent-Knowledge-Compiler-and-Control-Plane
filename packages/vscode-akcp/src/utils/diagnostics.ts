export interface OkfDiagnosticIssue {
  line: number;
  message: string;
  severity: "error" | "warning";
  code: string;
}

export function analyzeOkfFrontmatter(content: string): OkfDiagnosticIssue[] {
  const issues: OkfDiagnosticIssue[] = [];
  const lines = content.split(/\r?\n/);

  if (lines.length === 0 || lines[0]?.trim() !== "---") {
    issues.push({
      line: 0,
      message:
        "OKF document is missing opening YAML frontmatter delimiter '---'.",
      severity: "error",
      code: "OKF_MISSING_FRONTMATTER",
    });
    return issues;
  }

  let closingLine = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      closingLine = i;
      break;
    }
  }

  if (closingLine === -1) {
    issues.push({
      line: 0,
      message: "OKF YAML frontmatter is missing closing delimiter '---'.",
      severity: "error",
      code: "OKF_UNCLOSED_FRONTMATTER",
    });
    return issues;
  }

  let hasType = false;
  let hasTitleOrName = false;

  for (let i = 1; i < closingLine; i++) {
    const lineText = lines[i] || "";
    const match = lineText.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
    if (!match) continue;

    const key = match[1];
    const rawVal = (match[2] || "").trim();

    if (key === "type" && rawVal.length > 0) {
      hasType = true;
    }
    if ((key === "title" || key === "name") && rawVal.length > 0) {
      hasTitleOrName = true;
    }
    if (key === "confidence") {
      const num = Number(rawVal);
      if (Number.isNaN(num) || num < 0 || num > 1) {
        issues.push({
          line: i,
          message:
            "OKF frontmatter 'confidence' must be a number between 0.0 and 1.0.",
          severity: "error",
          code: "OKF_INVALID_CONFIDENCE",
        });
      }
    }
    if (key === "freshnessTtlDays") {
      const num = Number(rawVal);
      if (!Number.isInteger(num) || num <= 0) {
        issues.push({
          line: i,
          message:
            "OKF frontmatter 'freshnessTtlDays' must be a positive integer.",
          severity: "warning",
          code: "OKF_INVALID_TTL",
        });
      }
    }
  }

  if (!hasType) {
    issues.push({
      line: 0,
      message: "OKF frontmatter is missing required 'type' field.",
      severity: "error",
      code: "OKF_MISSING_TYPE",
    });
  }

  if (!hasTitleOrName) {
    issues.push({
      line: 0,
      message: "OKF frontmatter should declare a 'title' or 'name' field.",
      severity: "warning",
      code: "OKF_MISSING_TITLE",
    });
  }

  return issues;
}
