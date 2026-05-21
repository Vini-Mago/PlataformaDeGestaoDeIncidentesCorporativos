export class InvalidWebhookSignatureError extends Error {
  constructor(message = "Invalid webhook signature") {
    super(message);
    this.name = "InvalidWebhookSignatureError";
  }
}

export class UnauthorizedIntegrationError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedIntegrationError";
  }
}

export class IntegrationDlqNotFoundError extends Error {
  constructor(id: string) {
    super(`Integration DLQ item not found: ${id}`);
    this.name = "IntegrationDlqNotFoundError";
  }
}

export class IntegrationDlqAlreadyReprocessedError extends Error {
  constructor(id: string) {
    super(`Integration DLQ item already reprocessed: ${id}`);
    this.name = "IntegrationDlqAlreadyReprocessedError";
  }
}
