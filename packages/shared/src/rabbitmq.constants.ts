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
