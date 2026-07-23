import { z } from "zod";
import {
  AgentKnowledgeIRSchema,
  IRConceptSchema,
  IRLinkSchema,
  IRPoliciesSchema,
  IRScienceBudgetSchema,
  IRSourceSchema,
  CapabilitySchema,
} from "./schema.js";

export type IRScienceBudget = z.infer<typeof IRScienceBudgetSchema>;
export type IRSource = z.infer<typeof IRSourceSchema>;
export type IRConcept = z.infer<typeof IRConceptSchema>;
export type IRLink = z.infer<typeof IRLinkSchema>;
export type IRPolicies = z.infer<typeof IRPoliciesSchema>;
export type Capability = z.infer<typeof CapabilitySchema>;
export type AgentKnowledgeIR = z.infer<typeof AgentKnowledgeIRSchema>;
