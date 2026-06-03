import { strict as assert } from "node:assert";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  INCIDENT_ASSIGNED_EVENT,
  INCIDENT_CREATED_EVENT,
  INCIDENT_STATUS_CHANGED_EVENT,
  INTEGRATION_INCIDENT_INGEST_EVENT,
  PROBLEM_CREATED_EVENT,
  PROBLEM_INCIDENT_LINKED_EVENT,
  PROBLEM_INCIDENT_UNLINKED_EVENT,
  CHANGE_CREATED_EVENT,
  SLA_RISK_EVENT,
  SLA_BREACH_EVENT,
  USER_CREATED_EVENT,
  USER_UPDATED_EVENT,
  REQUEST_DOMAIN_EVENT_NAMES,
  incidentDomainEventEnvelopeSchema,
  integrationIncidentIngestEnvelopeSchema,
  problemChangeEventEnvelopeSchema,
  requestDomainEventEnvelopeSchema,
  slaDomainEventEnvelopeSchema,
  userDomainEventEnvelopeSchema,
  REPORTING_EXPORTED_EVENT,
  reportingExportedEnvelopeSchema,
  INTEGRATION_OUTBOUND_DISPATCH_EVENT,
  integrationOutboundDispatchEnvelopeSchema,
  NOTIFICATION_EMAIL_SENT_EVENT,
  notificationEmailSentEnvelopeSchema,
} = require("../../packages/shared/src");

const VALID_PAYLOAD = {
  serviceRequestId: "22222222-2222-4222-8222-222222222222",
  requesterId: "11111111-1111-4111-8111-111111111111",
  occurredAt: new Date().toISOString(),
  status: "Submitted",
};

function main(): void {
  for (const eventType of REQUEST_DOMAIN_EVENT_NAMES as readonly string[]) {
    const parsed = requestDomainEventEnvelopeSchema.safeParse({
      type: eventType,
      payload: VALID_PAYLOAD,
    });
    assert(parsed.success, `Expected valid contract for event type ${eventType}`);
  }

  const missingOccurredAt = requestDomainEventEnvelopeSchema.safeParse({
    type: REQUEST_DOMAIN_EVENT_NAMES[0],
    payload: {
      serviceRequestId: VALID_PAYLOAD.serviceRequestId,
      requesterId: VALID_PAYLOAD.requesterId,
    },
  });
  assert(!missingOccurredAt.success, "Expected invalid payload when occurredAt is missing");

  const unknownEventType = requestDomainEventEnvelopeSchema.safeParse({
    type: "request.unknown",
    payload: VALID_PAYLOAD,
  });
  assert(!unknownEventType.success, "Expected invalid envelope for unknown event type");

  const incidentCreatedParsed = incidentDomainEventEnvelopeSchema.safeParse({
    type: INCIDENT_CREATED_EVENT,
    payload: {
      incidentId: "33333333-3333-4333-8333-333333333333",
      criticality: "High",
      requesterId: VALID_PAYLOAD.requesterId,
      occurredAt: new Date().toISOString(),
    },
  });
  assert(incidentCreatedParsed.success, "Expected valid incident.created contract");

  const incidentStatusParsed = incidentDomainEventEnvelopeSchema.safeParse({
    type: INCIDENT_STATUS_CHANGED_EVENT,
    payload: {
      incidentId: "33333333-3333-4333-8333-333333333333",
      toStatus: "Resolved",
      occurredAt: new Date().toISOString(),
    },
  });
  assert(incidentStatusParsed.success, "Expected valid incident.status_changed contract");

  const incidentAssignedParsed = incidentDomainEventEnvelopeSchema.safeParse({
    type: INCIDENT_ASSIGNED_EVENT,
    payload: {
      incidentId: "33333333-3333-4333-8333-333333333333",
      occurredAt: new Date().toISOString(),
      assignedTeamId: null,
      assignedToId: null,
    },
  });
  assert(incidentAssignedParsed.success, "Expected valid incident.assigned contract");

  const incidentMissingOccurredAt = incidentDomainEventEnvelopeSchema.safeParse({
    type: INCIDENT_STATUS_CHANGED_EVENT,
    payload: {
      incidentId: "33333333-3333-4333-8333-333333333333",
      toStatus: "Resolved",
    },
  });
  assert(!incidentMissingOccurredAt.success, "Expected invalid incident payload without occurredAt");

  const integrationIngestParsed = integrationIncidentIngestEnvelopeSchema.safeParse({
    type: INTEGRATION_INCIDENT_INGEST_EVENT,
    payload: {
      externalId: "alert-1",
      externalSource: "monitoring",
      title: "CPU high",
      description: "CPU above threshold",
      criticality: "High",
      requesterId: VALID_PAYLOAD.requesterId,
      occurredAt: new Date().toISOString(),
    },
  });
  assert(integrationIngestParsed.success, "Expected valid integration ingest contract");

  const integrationInvalidRequester = integrationIncidentIngestEnvelopeSchema.safeParse({
    type: INTEGRATION_INCIDENT_INGEST_EVENT,
    payload: {
      externalId: "alert-1",
      externalSource: "monitoring",
      title: "CPU high",
      description: "CPU above threshold",
      criticality: "High",
      requesterId: "not-a-uuid",
    },
  });
  assert(!integrationInvalidRequester.success, "Expected invalid integration ingest requesterId");

  const slaRiskParsed = slaDomainEventEnvelopeSchema.safeParse({
    type: SLA_RISK_EVENT,
    payload: {
      ticketId: "33333333-3333-4333-8333-333333333333",
      ticketType: "incident",
      percentUsed: 85,
      deadlineType: "resolution",
      occurredAt: new Date().toISOString(),
    },
  });
  assert(slaRiskParsed.success, "Expected valid sla.risk contract");

  const slaBreachParsed = slaDomainEventEnvelopeSchema.safeParse({
    type: SLA_BREACH_EVENT,
    payload: {
      ticketId: "33333333-3333-4333-8333-333333333333",
      ticketType: "incident",
      breachType: "resolution",
      occurredAt: new Date().toISOString(),
    },
  });
  assert(slaBreachParsed.success, "Expected valid sla.breach contract");

  const slaMissingOccurredAt = slaDomainEventEnvelopeSchema.safeParse({
    type: SLA_BREACH_EVENT,
    payload: {
      ticketId: "33333333-3333-4333-8333-333333333333",
      ticketType: "incident",
      breachType: "resolution",
    },
  });
  assert(!slaMissingOccurredAt.success, "Expected invalid sla payload without occurredAt");

  const problemCreatedParsed = problemChangeEventEnvelopeSchema.safeParse({
    type: PROBLEM_CREATED_EVENT,
    payload: {
      problemId: "44444444-4444-4444-8444-444444444444",
      title: "Problem title",
      status: "Open",
      createdById: VALID_PAYLOAD.requesterId,
      occurredAt: new Date().toISOString(),
    },
  });
  assert(problemCreatedParsed.success, "Expected valid problem.created contract");

  const problemLinkedParsed = problemChangeEventEnvelopeSchema.safeParse({
    type: PROBLEM_INCIDENT_LINKED_EVENT,
    payload: {
      problemId: "44444444-4444-4444-8444-444444444444",
      incidentId: "33333333-3333-4333-8333-333333333333",
      occurredAt: new Date().toISOString(),
    },
  });
  assert(problemLinkedParsed.success, "Expected valid problem.incident_linked contract");

  const problemUnlinkedParsed = problemChangeEventEnvelopeSchema.safeParse({
    type: PROBLEM_INCIDENT_UNLINKED_EVENT,
    payload: {
      problemId: "44444444-4444-4444-8444-444444444444",
      incidentId: "33333333-3333-4333-8333-333333333333",
      occurredAt: new Date().toISOString(),
    },
  });
  assert(problemUnlinkedParsed.success, "Expected valid problem.incident_unlinked contract");

  const changeCreatedParsed = problemChangeEventEnvelopeSchema.safeParse({
    type: CHANGE_CREATED_EVENT,
    payload: {
      changeId: "55555555-5555-4555-8555-555555555555",
      title: "Change title",
      status: "Draft",
      risk: "High",
      changeType: "Normal",
      createdById: VALID_PAYLOAD.requesterId,
      occurredAt: new Date().toISOString(),
    },
  });
  assert(changeCreatedParsed.success, "Expected valid change.created contract");

  const userCreatedParsed = userDomainEventEnvelopeSchema.safeParse({
    type: USER_CREATED_EVENT,
    payload: {
      userId: VALID_PAYLOAD.requesterId,
      email: "user@example.com",
      name: "Jane Doe",
      occurredAt: new Date().toISOString(),
    },
  });
  assert(userCreatedParsed.success, "Expected valid user.created contract");

  const userUpdatedParsed = userDomainEventEnvelopeSchema.safeParse({
    type: USER_UPDATED_EVENT,
    payload: {
      userId: VALID_PAYLOAD.requesterId,
      email: "user.updated@example.com",
      name: "Jane Doe Updated",
      occurredAt: new Date().toISOString(),
    },
  });
  assert(userUpdatedParsed.success, "Expected valid user.updated contract");

  const reportingExportedParsed = reportingExportedEnvelopeSchema.safeParse({
    type: REPORTING_EXPORTED_EVENT,
    payload: {
      jobId: "66666666-6666-4666-8666-666666666666",
      reportType: "kpi_dashboard",
      requestedById: VALID_PAYLOAD.requesterId,
      fileUrl: "http://example.com/report.csv",
      occurredAt: new Date().toISOString(),
    },
  });
  assert(reportingExportedParsed.success, `Expected valid reporting.exported contract: ${reportingExportedParsed.error?.message}`);

  const integrationOutboundParsed = integrationOutboundDispatchEnvelopeSchema.safeParse({
    type: INTEGRATION_OUTBOUND_DISPATCH_EVENT,
    payload: {
      deliveryId: "77777777-7777-4777-8777-777777777777",
      endpoint: "https://webhook.site/abc",
      method: "POST",
      externalId: "ext-123",
      occurredAt: new Date().toISOString(),
    },
  });
  assert(integrationOutboundParsed.success, `Expected valid integration.outbound_dispatch contract: ${integrationOutboundParsed.error?.message}`);

  const notificationEmailParsed = notificationEmailSentEnvelopeSchema.safeParse({
    type: NOTIFICATION_EMAIL_SENT_EVENT,
    payload: {
      notificationId: "88888888-8888-4888-8888-888888888888",
      recipient: "user@example.com",
      subject: "Test email",
      occurredAt: new Date().toISOString(),
    },
  });
  assert(notificationEmailParsed.success, `Expected valid notification.email_sent contract: ${notificationEmailParsed.error?.message}`);

  console.log("RabbitMQ event contract checks passed.");
}

main();
