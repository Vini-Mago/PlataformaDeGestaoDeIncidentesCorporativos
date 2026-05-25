import { z } from "zod";
import {
  CHANGE_CREATED_EVENT,
  PROBLEM_CREATED_EVENT,
  PROBLEM_INCIDENT_LINKED_EVENT,
  PROBLEM_INCIDENT_UNLINKED_EVENT,
} from "../rabbitmq.constants";

export const problemChangeEventTypeSchema = z.enum([
  PROBLEM_CREATED_EVENT,
  PROBLEM_INCIDENT_LINKED_EVENT,
  PROBLEM_INCIDENT_UNLINKED_EVENT,
  CHANGE_CREATED_EVENT,
]);

export const problemCreatedPayloadSchema = z
  .object({
    problemId: z.string().uuid(),
    title: z.string().min(1),
    status: z.string().min(1),
    createdById: z.string().uuid(),
    occurredAt: z.string().datetime(),
  })
  .passthrough();

export const problemIncidentLinkPayloadSchema = z
  .object({
    problemId: z.string().uuid(),
    incidentId: z.string().uuid(),
    occurredAt: z.string().datetime(),
  })
  .passthrough();

export const changeCreatedPayloadSchema = z
  .object({
    changeId: z.string().uuid(),
    title: z.string().min(1),
    status: z.string().min(1),
    risk: z.string().min(1),
    changeType: z.string().min(1),
    createdById: z.string().uuid(),
    occurredAt: z.string().datetime(),
  })
  .passthrough();

export const problemChangeEventEnvelopeSchema = z
  .object({
    type: problemChangeEventTypeSchema,
    payload: z.record(z.unknown()),
  })
  .superRefine((value, ctx) => {
    const schema =
      value.type === PROBLEM_CREATED_EVENT
        ? problemCreatedPayloadSchema
        : value.type === CHANGE_CREATED_EVENT
          ? changeCreatedPayloadSchema
          : problemIncidentLinkPayloadSchema;
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
