import { createHash } from "node:crypto";
import type {
  ConnectorConfig,
  KnowledgeSourceConnector,
  RawKnowledgeItem,
} from "./types.js";

export class MockZendeskConnector implements KnowledgeSourceConnector {
  public readonly connectorType = "mock-zendesk";

  async ingest(config: ConnectorConfig): Promise<RawKnowledgeItem[]> {
    const ticketCount = config.ticketCount || 50;
    const seed = config.seed || "akcp";

    const items: RawKnowledgeItem[] = [];

    // Simple deterministic random
    let seedVal = 0;
    for (let i = 0; i < seed.length; i++) {
      seedVal += seed.charCodeAt(i);
    }

    const random = () => {
      const x = Math.sin(seedVal++) * 10000;
      return x - Math.floor(x);
    };

    const channels = ["email", "chat", "voice", "social"];
    const statuses = ["open", "pending", "solved", "escalated", "closed"];
    const priorities = ["low", "medium", "high", "critical"];

    for (let i = 1; i <= ticketCount; i++) {
      const ticketId = `tkt-mock-${i}`;
      const customerId = `profile-mock-${Math.floor(random() * 20) + 1}`; // 20 unique customers
      const channel = channels[Math.floor(random() * channels.length)];
      const status = statuses[Math.floor(random() * statuses.length)];
      const priority = priorities[Math.floor(random() * priorities.length)];

      const containsPii = random() > 0.5;
      const piiClasses = containsPii ? 'piiClasses: ["email", "phone"]' : "";

      const markdownContent = `---
type: SupportTicket
schemaVersion: "1.0"
ticketId: "${ticketId}"
channel: "${channel}"
status: "${status}"
priority: "${priority}"
customerRef: "${customerId}"
createdAt: "2026-07-${String(Math.floor(random() * 20) + 1).padStart(2, "0")}T10:00:00Z"
containsPii: ${containsPii}
${piiClasses}
---

# Ticket: ${ticketId} - Mock Auto Generated Ticket

**Description:**
This is an automatically generated mock ticket to simulate Zendesk API ingestion.

**Interaction History:**
- **System:** Ticket created via ${channel}.
- **Customer:** "I need help with my account, something is broken."
- **Agent:** "Could you please provide more details?"
`;

      const hash = createHash("sha256").update(markdownContent).digest("hex");
      items.push({
        sourceUri: `zendesk://${ticketId}`,
        contentHash: hash,
        metadata: {
          connector: "mock-zendesk",
        },
        rawContent: markdownContent,
      });
    }

    // Also generate the customer profiles so references match
    for (let i = 1; i <= 20; i++) {
      const customerId = `profile-mock-${i}`;
      const markdownContent = `---
type: CustomerProfile
schemaVersion: "1.0"
customerId: "${customerId}"
status: "active"
segment: "standard"
createdAt: "2025-01-01T00:00:00Z"
---

# Customer Profile: ${customerId}

**Details:**
This is a mock customer profile generated for testing.
`;
      const hash = createHash("sha256").update(markdownContent).digest("hex");
      items.push({
        sourceUri: `zendesk://${customerId}`,
        contentHash: hash,
        metadata: {
          connector: "mock-zendesk",
        },
        rawContent: markdownContent,
      });
    }

    return items;
  }
}
