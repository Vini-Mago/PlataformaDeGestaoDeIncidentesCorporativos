import { z } from "zod";
import {
  INCIDENT_ASSIGNED_EVENT,
  INCIDENT_CREATED_EVENT,
  INCIDENT_STATUS_CHANGED_EVENT,
} from "../rabbitmq.constants";

export const incidentDomainEventTypeSchema = z.enum([
  INCIDENT_CREATED_EVENT,
  INCIDENT_STATUS_CHANGED_EVENT,
  INCIDENT_ASSIGNED_EVENT,
]);

export const incidentCreatedPayloadSchema = z
  .object({
    incidentId: z.string().uuid(),
    criticality: z.string().min(1),
    requesterId: z.string().uuid(),
    occurredAt: z.string().datetime(),
    title: z.string().optional(),
    description: z.string().optional(),
    serviceAffected: z.string().nullable().optional(),
    status: z.string().optional(),
  })
  .passthrough();

export const incidentStatusChangedPayloadSchema = z
  .object({
    incidentId: z.string().uuid(),
    fromStatus: z.string().optional(),
    toStatus: z.string().min(1),
    changedById: z.string().uuid().nullable().optional(),
    occurredAt: z.string().datetime(),
  })
  .passthrough();

export const incidentAssignedPayloadSchema = z
  .object({
    incidentId: z.string().uuid(),
    occurredAt: z.string().datetime(),
    assignedTeamId: z.string().uuid().nullable().optional(),
    assignedToId: z.string().uuid().nullable().optional(),
  })
  .passthrough();

export const incidentDomainEventEnvelopeSchema = z
  .object({
    type: incidentDomainEventTypeSchema,
    payload: z.record(z.unknown()),
  })
  .superRefine((value, ctx) => {
    const schema =
      value.type === INCIDENT_CREATED_EVENT
        ? incidentCreatedPayloadSchema
        : value.type === INCIDENT_STATUS_CHANGED_EVENT
          ? incidentStatusChangedPayloadSchema
          : incidentAssignedPayloadSchema;
    const parsed = schema.safeParse(value.payload);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: issue.message,
          path: ["payload", ...(issue.path ?? [])],
        });
      }
    }
  });
