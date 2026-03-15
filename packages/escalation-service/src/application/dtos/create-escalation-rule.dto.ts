import { z } from "zod";
import { VALID_TICKET_TYPES, VALID_CONDITION_TYPES, VALID_ACTIONS } from "../../domain/entities/escalation-rule.entity";

export const createEscalationRuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  ticketType: z.enum(VALID_TICKET_TYPES as unknown as [string, ...string[]]),
  conditionType: z.enum(VALID_CONDITION_TYPES as unknown as [string, ...string[]]),
  conditionValue: z.string().min(1, "Condition value is required"),
  actions: z.array(z.enum(VALID_ACTIONS as unknown as [string, ...string[]])).min(1, "At least one action is required"),
  priority: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type CreateEscalationRuleDto = z.infer<typeof createEscalationRuleSchema>;
