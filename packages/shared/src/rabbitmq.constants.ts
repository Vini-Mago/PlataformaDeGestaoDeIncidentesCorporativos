/**
 * Constantes para RabbitMQ: exchanges, filas e routing keys compartilhados.
 * Centralize aqui para manter contrato entre publicadores e consumidores.
 */
export const EXCHANGE_USER_EVENTS = "user.events";
/** Routing key for user.created (topic exchange: event name with dot → underscore). */
export const ROUTING_KEY_USER_CREATED = "user_created";
export const QUEUE_USER_CREATED_REQUEST = "request.user_created";
/** Fila para mensagens UserCreated que excederam MAX_RETRIES (dead-letter / inspeção). */
export const QUEUE_USER_CREATED_REQUEST_FAILED = "request.user_created.failed";
