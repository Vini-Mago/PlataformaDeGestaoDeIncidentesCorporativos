import {
  IntegrationDlqAlreadyReprocessedError,
  IntegrationDlqNotFoundError,
  InvalidWebhookSignatureError,
  UnauthorizedIntegrationError,
} from "../../../application/errors";

export function mapApplicationErrorToHttp(error: unknown): { statusCode: number; message: string } {
  if (error instanceof UnauthorizedIntegrationError) {
    return { statusCode: 401, message: error.message };
  }
  if (error instanceof InvalidWebhookSignatureError) {
    return { statusCode: 401, message: error.message };
  }
  if (error instanceof IntegrationDlqNotFoundError) {
    return { statusCode: 404, message: error.message };
  }
  if (error instanceof IntegrationDlqAlreadyReprocessedError) {
    return { statusCode: 409, message: error.message };
  }
  if (error instanceof Error) {
    return { statusCode: 500, message: error.message };
  }
  return { statusCode: 500, message: "Internal server error" };
}
