import { describe, expect, it } from "vitest";
import {
  CHANGE_CREATED_EVENT,
  INCIDENT_CREATED_EVENT,
  INTEGRATION_INCIDENT_INGEST_EVENT,
  PROBLEM_CREATED_EVENT,
  REQUEST_CREATED_EVENT,
  SLA_RISK_EVENT,
  USER_CREATED_EVENT,
  incidentDomainEventEnvelopeSchema,
  integrationIncidentIngestEnvelopeSchema,
  problemChangeEventEnvelopeSchema,
  requestDomainEventEnvelopeSchema,
  slaDomainEventEnvelopeSchema,
  userDomainEventEnvelopeSchema,
} from "..";

const now = new Date().toISOString();

describe("domain event contracts", () => {
  it("accepts valid user envelope", () => {
    const parsed = userDomainEventEnvelopeSchema.safeParse({
      type: USER_CREATED_EVENT,
      payload: {
        userId: "11111111-1111-4111-8111-111111111111",
        email: "user@example.com",
        name: "Jane Doe",
        occurredAt: now,
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid request envelope", () => {
    const parsed = requestDomainEventEnvelopeSchema.safeParse({
      type: REQUEST_CREATED_EVENT,
      payload: {
        serviceRequestId: "22222222-2222-4222-8222-222222222222",
        requesterId: "11111111-1111-4111-8111-111111111111",
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts valid incident envelope", () => {
    const parsed = incidentDomainEventEnvelopeSchema.safeParse({
      type: INCIDENT_CREATED_EVENT,
      payload: {
        incidentId: "33333333-3333-4333-8333-333333333333",
        criticality: "High",
        requesterId: "11111111-1111-4111-8111-111111111111",
        occurredAt: now,
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts valid integration ingest envelope", () => {
    const parsed = integrationIncidentIngestEnvelopeSchema.safeParse({
      type: INTEGRATION_INCIDENT_INGEST_EVENT,
      payload: {
        externalId: "alert-1",
        externalSource: "monitoring",
        title: "CPU high",
        description: "CPU above threshold",
        criticality: "High",
        requesterId: "11111111-1111-4111-8111-111111111111",
        occurredAt: now,
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts valid sla envelope", () => {
    const parsed = slaDomainEventEnvelopeSchema.safeParse({
      type: SLA_RISK_EVENT,
      payload: {
        ticketId: "33333333-3333-4333-8333-333333333333",
        ticketType: "incident",
        percentUsed: 85,
        deadlineType: "resolution",
        occurredAt: now,
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts valid problem/change envelope", () => {
    const parsedProblem = problemChangeEventEnvelopeSchema.safeParse({
      type: PROBLEM_CREATED_EVENT,
      payload: {
        problemId: "44444444-4444-4444-8444-444444444444",
        title: "Problem title",
        status: "Open",
        createdById: "11111111-1111-4111-8111-111111111111",
        occurredAt: now,
      },
    });
    const parsedChange = problemChangeEventEnvelopeSchema.safeParse({
      type: CHANGE_CREATED_EVENT,
      payload: {
        changeId: "55555555-5555-4555-8555-555555555555",
        title: "Change title",
        status: "Draft",
        risk: "High",
        changeType: "Normal",
        createdById: "11111111-1111-4111-8111-111111111111",
        occurredAt: now,
      },
    });
    expect(parsedProblem.success).toBe(true);
    expect(parsedChange.success).toBe(true);
  });
});
