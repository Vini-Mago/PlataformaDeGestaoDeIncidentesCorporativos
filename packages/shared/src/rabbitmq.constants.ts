/**
 * Shared RabbitMQ constants: exchanges, queues, routing keys.
 * Centralize here to keep contract between publishers and consumers.
 */
export const EXCHANGE_USER_EVENTS = "user.events";
/** Routing key for user.created (topic exchange: event name with dot → underscore). */
export const ROUTING_KEY_USER_CREATED = "user_created";
/** Routing key for user.updated (same payload shape as user.created; consumers upsert). */
export const ROUTING_KEY_USER_UPDATED = "user_updated";
export const QUEUE_USER_CREATED_REQUEST = "request.user_created";
export const QUEUE_USER_UPDATED_REQUEST = "request.user_updated";
/** Dead-letter queue for failed user events. */
export const QUEUE_USER_CREATED_REQUEST_FAILED = "request.user_created.failed";

/**
 * Request / service-catalog events (topic). Publicados pelo request-service (outbox + relay).
 * Consumidores: notification-service (`notification.request_events`); audit/reporting podem bindar o mesmo exchange.
 */
export const EXCHANGE_REQUEST_EVENTS = "request.events";
export const ROUTING_KEY_REQUEST_CREATED = "request_created";
export const ROUTING_KEY_REQUEST_SUBMITTED = "request_submitted";
export const ROUTING_KEY_REQUEST_IN_APPROVAL = "request_in_approval";
export const ROUTING_KEY_REQUEST_APPROVED = "request_approved";
export const ROUTING_KEY_REQUEST_REJECTED = "request_rejected";
export const ROUTING_KEY_REQUEST_STARTED = "request_started";
export const ROUTING_KEY_REQUEST_COMPLETED = "request_completed";
export const REQUEST_CREATED_EVENT = "request.created";
export const REQUEST_SUBMITTED_EVENT = "request.submitted";
export const REQUEST_IN_APPROVAL_EVENT = "request.in_approval";
export const REQUEST_APPROVED_EVENT = "request.approved";
export const REQUEST_REJECTED_EVENT = "request.rejected";
export const REQUEST_STARTED_EVENT = "request.started";
export const REQUEST_COMPLETED_EVENT = "request.completed";

/** Fila do notification-service para todos os routing keys de `request.events` (topic). */
export const QUEUE_REQUEST_EVENTS_NOTIFICATION = "notification.request_events";

/** Nomes lógicos dos eventos de requisição (payload publicado pelo request-service via outbox). */
export const REQUEST_DOMAIN_EVENT_NAMES = [
  REQUEST_CREATED_EVENT,
  REQUEST_SUBMITTED_EVENT,
  REQUEST_IN_APPROVAL_EVENT,
  REQUEST_APPROVED_EVENT,
  REQUEST_REJECTED_EVENT,
  REQUEST_STARTED_EVENT,
  REQUEST_COMPLETED_EVENT,
] as const;

/** Incident events (exchange + routing keys). Published by incident-service (Outbox Pattern). */
export const EXCHANGE_INCIDENT_EVENTS = "incident.events";
export const ROUTING_KEY_INCIDENT_CREATED = "incident_created";
export const ROUTING_KEY_INCIDENT_STATUS_CHANGED = "incident_status_changed";
export const ROUTING_KEY_INCIDENT_ASSIGNED = "incident_assigned";
export const INCIDENT_CREATED_EVENT = "incident.created";
export const INCIDENT_STATUS_CHANGED_EVENT = "incident.status_changed";
export const INCIDENT_ASSIGNED_EVENT = "incident.assigned";

/** Queues for incident events (consumed by escalation, notification, audit, reporting). */
export const QUEUE_INCIDENT_CREATED_NOTIFICATION = "notification.incident_created";
export const QUEUE_USER_CREATED_INCIDENT = "incident.user_created";

/** Problem-change service: user replication. */
export const QUEUE_USER_CREATED_PROBLEM_CHANGE = "problem_change.user_created";

/** Problem events (exchange + routing keys). Published by problem-change-service (Outbox Pattern). */
export const EXCHANGE_PROBLEM_EVENTS = "problem.events";
export const ROUTING_KEY_PROBLEM_CREATED = "problem_created";
export const PROBLEM_CREATED_EVENT = "problem.created";

/** Change events (exchange + routing keys). Published by problem-change-service (Outbox Pattern). */
export const EXCHANGE_CHANGE_EVENTS = "change.events";
export const ROUTING_KEY_CHANGE_CREATED = "change_created";
export const CHANGE_CREATED_EVENT = "change.created";

/** SLA events (exchange + routing keys). Published by sla-service (Outbox Pattern). */
export const EXCHANGE_SLA_EVENTS = "sla.events";
export const ROUTING_KEY_SLA_RISK = "sla_risk";
export const ROUTING_KEY_SLA_BREACH = "sla_breach";
export const SLA_RISK_EVENT = "sla.risk";
export const SLA_BREACH_EVENT = "sla.breach";

/** Queues for escalation-service (consumes incident and SLA events). */
export const QUEUE_INCIDENT_CREATED_ESCALATION = "escalation.incident_created";
export const QUEUE_INCIDENT_STATUS_CHANGED_ESCALATION = "escalation.incident_status_changed";
export const QUEUE_SLA_RISK_ESCALATION = "escalation.sla_risk";
export const QUEUE_SLA_BREACH_ESCALATION = "escalation.sla_breach";
