import { z } from "zod";

export const CustomerSupportArticleSchema = z.object({
  type: z.literal("SupportArticle"),
  schemaVersion: z.string(),
  title: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  timestamp: z.string().optional(),
  articleId: z.string(),
  status: z.enum(["draft", "published", "deprecated"]).optional(),
  locale: z.string().optional(),
  audience: z.enum(["customer", "agent", "internal"]).optional(),
  productIds: z.array(z.string()).optional(),
  intentIds: z.array(z.string()).optional(),
  policyRefs: z.array(z.string()).optional(),
  sensitivity: z.enum(["public", "internal", "confidential"]).optional(),
  lastReviewedAt: z.string().optional(),
  owner: z.string().optional(),
});

export const CustomerSupportPolicySchema = z.object({
  type: z.literal("SupportPolicy"),
  schemaVersion: z.string(),
  title: z.string(),
  policyId: z.string(),
  category: z.enum([
    "refunds",
    "returns",
    "cancellation",
    "billing",
    "account",
    "privacy",
    "warranty",
    "shipping",
    "escalation",
  ]),
  appliesTo: z.array(z.string()).optional(),
  allowedActions: z.array(z.string()).optional(),
  forbiddenActions: z.array(z.string()).optional(),
  requiresApprovalFor: z.array(z.string()).optional(),
  maxRefundAmount: z.number().optional(),
  slaTier: z.string().optional(),
  jurisdiction: z.string().optional(),
  sensitivity: z.enum(["internal", "confidential"]).optional(),
  lastReviewedAt: z.string().optional(),
  owner: z.string().optional(),
});

export const CustomerSupportMacroSchema = z.object({
  type: z.literal("SupportMacro"),
  schemaVersion: z.string(),
  macroId: z.string(),
  title: z.string(),
  intentIds: z.array(z.string()).optional(),
  channel: z.enum(["email", "chat", "voice", "social", "any"]).optional(),
  tone: z.enum(["neutral", "empathetic", "concise", "formal"]).optional(),
  requiresPersonalization: z.boolean().optional(),
  requiresCitation: z.boolean().optional(),
  forbiddenWhen: z.array(z.string()).optional(),
  piiHandling: z
    .enum(["redact", "summarize", "allow-minimal", "deny"])
    .optional(),
});

export const CustomerSupportTicketSchema = z.object({
  type: z.literal("SupportTicket"),
  schemaVersion: z.string(),
  ticketId: z.string(),
  channel: z.enum(["email", "chat", "voice", "social"]),
  status: z.enum(["open", "pending", "solved", "escalated", "closed"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  customerRef: z.string(),
  productIds: z.array(z.string()).optional(),
  orderRefs: z.array(z.string()).optional(),
  intentIds: z.array(z.string()).optional(),
  policyRefs: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  resolvedAt: z.string().optional(),
  containsPii: z.boolean().optional(),
  piiClasses: z.array(z.string()).optional(),
  redactionStatus: z
    .enum(["not_scanned", "clean", "redacted", "blocked"])
    .optional(),
  resolutionSummary: z.string().optional(),
  rootCause: z.string().optional(),
});

export const CustomerProfileSchema = z.object({
  type: z.literal("CustomerProfile"),
  schemaVersion: z.string(),
  customerId: z.string(),
  customerSegment: z
    .enum(["trial", "standard", "premium", "enterprise"])
    .optional(),
  locale: z.string().optional(),
  region: z.string().optional(),
  accountAgeDays: z.number().optional(),
  entitlements: z.array(z.string()).optional(),
  riskFlags: z.array(z.string()).optional(),
  privacyLevel: z.enum(["low", "medium", "high"]).optional(),
  piiHandling: z.enum(["redact", "tokenized", "synthetic-only"]).optional(),
});

export const OrderRecordSchema = z.object({
  type: z.literal("OrderRecord"),
  schemaVersion: z.string(),
  orderId: z.string(),
  customerRef: z.string(),
  status: z.enum([
    "created",
    "paid",
    "shipped",
    "delivered",
    "returned",
    "cancelled",
    "refunded",
  ]),
  items: z.array(z.string()).optional(),
  totalAmount: z.number().optional(),
  currency: z.string().optional(),
  shippingStatus: z
    .enum(["pending", "in_transit", "delivered", "delayed", "lost"])
    .optional(),
  eligibleActions: z.array(z.string()).optional(),
  policyRefs: z.array(z.string()).optional(),
});

export const ProductRecordSchema = z.object({
  type: z.literal("ProductRecord"),
  schemaVersion: z.string(),
  productId: z.string(),
  title: z.string(),
  category: z.string().optional(),
  version: z.string().optional(),
  knownIssues: z.array(z.string()).optional(),
  warrantyPolicyRefs: z.array(z.string()).optional(),
  supportArticleRefs: z.array(z.string()).optional(),
});

export const SupportIntentSchema = z.object({
  type: z.literal("SupportIntent"),
  schemaVersion: z.string(),
  intentId: z.string(),
  title: z.string(),
  examples: z.array(z.string()).optional(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
  requiredContext: z.array(z.string()).optional(),
  allowedActions: z.array(z.string()).optional(),
  escalationTriggers: z.array(z.string()).optional(),
  recommendedMacros: z.array(z.string()).optional(),
});

export const SLAPolicySchema = z.object({
  type: z.literal("SLAPolicy"),
  schemaVersion: z.string(),
  slaId: z.string(),
  title: z.string(),
  segment: z.enum(["standard", "premium", "enterprise"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  firstResponseMinutes: z.number().optional(),
  resolutionHours: z.number().optional(),
  escalationAfterMinutes: z.number().optional(),
});

export const EscalationRuleSchema = z.object({
  type: z.literal("EscalationRule"),
  schemaVersion: z.string(),
  ruleId: z.string(),
  title: z.string(),
  trigger: z.string().optional(),
  riskLevel: z.enum(["medium", "high", "critical"]).optional(),
  routeTo: z
    .enum([
      "billing",
      "technical",
      "fraud",
      "privacy",
      "legal",
      "human_agent",
      "manager",
    ])
    .optional(),
  requiresHumanApproval: z.boolean().optional(),
});

export const SupportEvalScenarioSchema = z.object({
  type: z.literal("SupportEvalScenario"),
  schemaVersion: z.string(),
  scenarioId: z.string(),
  title: z.string(),
  inputConversationRef: z.string(),
  expectedIntentIds: z.array(z.string()).optional(),
  expectedPolicyRefs: z.array(z.string()).optional(),
  expectedAction: z
    .enum([
      "answer",
      "ask_clarifying_question",
      "escalate",
      "preview_action",
      "deny",
    ])
    .optional(),
  mustRedactPii: z.boolean().optional(),
  mustCiteSources: z.boolean().optional(),
  forbiddenBehaviors: z.array(z.string()).optional(),
});

export const CustomerSupportDomainSchema = z.union([
  CustomerSupportArticleSchema,
  CustomerSupportPolicySchema,
  CustomerSupportMacroSchema,
  CustomerSupportTicketSchema,
  CustomerProfileSchema,
  OrderRecordSchema,
  ProductRecordSchema,
  SupportIntentSchema,
  SLAPolicySchema,
  EscalationRuleSchema,
  SupportEvalScenarioSchema,
]);

export type CustomerSupportDomainData = z.infer<
  typeof CustomerSupportDomainSchema
>;
