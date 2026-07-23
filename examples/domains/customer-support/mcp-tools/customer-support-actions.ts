import { z } from "zod";
import type {
  ActionDefinition,
  ActionContext,
  ActionResult,
} from "../../../../packages/mcp-automation-server/src/action-registry.js";

export const customerSupportActions: ActionDefinition[] = [
  {
    id: "customer-support.get_customer_history",
    description:
      "Retrieves the historical support tickets and profile data for a given customer. Reads PII (name, email) which must be redacted in audit logs.",
    domain: "customer-support",
    riskLevel: "medium",
    parameters: z.object({
      customerId: z.string(),
      includeArchived: z.boolean().optional(),
    }),
    handler: async (
      params: unknown,
      _context: ActionContext,
    ): Promise<ActionResult> => {
      const { customerId } = params as { customerId: string };

      // Simulate retrieving customer data with sensitive PII
      return {
        success: true,
        data: {
          customerId,
          name: "John Doe",
          email: "john.doe@example.com",
          ssn: "000-00-0000",
          creditCard: "4111-1111-1111-1111",
          history: [
            {
              ticketId: "T-100",
              status: "Closed",
              subject: "Refund for digital subscription",
            },
          ],
        },
      };
    },
  },
  {
    id: "customer-support.search_knowledge_base",
    description: "Searches the support knowledge base and policies.",
    domain: "customer-support",
    riskLevel: "low",
    parameters: z.object({
      query: z.string(),
      category: z.string().optional(),
    }),
    handler: async (
      params: unknown,
      _context: ActionContext,
    ): Promise<ActionResult> => {
      const { query } = params as { query: string };

      return {
        success: true,
        data: {
          query,
          results: [
            {
              id: "KB-001",
              title: "Refund Policy for Digital Subscriptions",
              snippet:
                "Digital subscriptions are eligible for a full refund within 14 days of purchase.",
            },
          ],
        },
      };
    },
  },
  {
    id: "customer-support.issue_refund",
    description:
      "Issues a refund to a customer. This is a high-risk action requiring HITL approval.",
    domain: "customer-support",
    riskLevel: "critical",
    parameters: z.object({
      ticketId: z.string(),
      amount: z.number().min(0.01),
      currency: z.enum(["USD", "EUR", "GBP"]),
      reason: z.string(),
      approvalTicketId: z.string(),
    }),
    handler: async (
      params: unknown,
      context: ActionContext,
    ): Promise<ActionResult> => {
      const { ticketId, amount, currency } = params as any;

      // We expect the approval token to have been validated by the generic execute_action
      // or we can just simulate success here
      return {
        success: true,
        data: {
          ticketId,
          refundStatus: "Processed",
          amountRefunded: amount,
          currency,
          transactionId: "TX-" + Math.floor(Math.random() * 1000000),
        },
      };
    },
  },
  {
    id: "customer-support.escalate_ticket",
    description:
      "Escalates a ticket to a higher support tier or specialized team.",
    domain: "customer-support",
    riskLevel: "medium",
    parameters: z.object({
      ticketId: z.string(),
      targetTier: z.enum(["Tier 2", "Tier 3", "Billing Specialist", "Legal"]),
      handoffNotes: z.string(),
    }),
    handler: async (
      params: unknown,
      _context: ActionContext,
    ): Promise<ActionResult> => {
      const { ticketId, targetTier } = params as any;
      return {
        success: true,
        data: {
          ticketId,
          escalatedTo: targetTier,
          status: "Escalated",
        },
      };
    },
  },
  {
    id: "customer-support.delete_account",
    description: "Permanently deletes a customer account.",
    domain: "customer-support",
    riskLevel: "critical",
    parameters: z.object({
      customerId: z.string(),
      reason: z.string(),
    }),
    handler: async (
      params: unknown,
      _context: ActionContext,
    ): Promise<ActionResult> => {
      const { customerId } = params as any;
      return {
        success: true,
        data: {
          customerId,
          status: "Deleted",
          timestamp: new Date().toISOString(),
        },
      };
    },
  },
];
