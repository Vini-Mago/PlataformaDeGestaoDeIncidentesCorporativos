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
