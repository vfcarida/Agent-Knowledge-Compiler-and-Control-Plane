export interface OkfCompletionItem {
  label: string;
  detail: string;
  insertText: string;
}

const FRONTMATTER_KEYS: OkfCompletionItem[] = [
  {
    label: "type",
    detail: "OKF Knowledge Unit Type",
    insertText: "type: ",
  },
  {
    label: "title",
    detail: "Human-readable title of the knowledge unit",
    insertText: "title: ",
  },
  {
    label: "summary",
    detail: "Concise summary for context budgeting",
    insertText: "summary: ",
  },
  {
    label: "tags",
    detail: "List of semantic tags",
    insertText: "tags: []",
  },
  {
    label: "confidence",
    detail: "Epistemic confidence score (0.0 to 1.0)",
    insertText: "confidence: 1.0",
  },
  {
    label: "freshnessTtlDays",
    detail: "Freshness time-to-live in days",
    insertText: "freshnessTtlDays: 90",
  },
  {
    label: "visibility",
    detail: "Visibility scope (public, internal, restricted)",
    insertText: "visibility: internal",
  },
];

const OKF_TYPES: OkfCompletionItem[] = [
  { label: "skill", detail: "OKF Skill Document", insertText: "skill" },
  {
    label: "experience",
    detail: "OKF Experience Document",
    insertText: "experience",
  },
  {
    label: "preference",
    detail: "OKF Preference Document",
    insertText: "preference",
  },
  { label: "runbook", detail: "IT Operations Runbook", insertText: "runbook" },
  {
    label: "policy",
    detail: "Governance Policy Document",
    insertText: "policy",
  },
  { label: "faq", detail: "Customer Support FAQ", insertText: "faq" },
  { label: "macro", detail: "Customer Support Macro", insertText: "macro" },
  { label: "concept", detail: "Generic OKF Concept", insertText: "concept" },
];

export function getOkfFrontmatterCompletions(
  linePrefix: string,
): OkfCompletionItem[] {
  const trimmed = linePrefix.trimStart();
  if (/^type\s*:\s*/.test(trimmed)) {
    return OKF_TYPES;
  }
  return FRONTMATTER_KEYS;
}
