import type { Request, Response, NextFunction } from "express";
import { verifyWebhookSignature } from "../../../infrastructure/verify-webhook-signature";
import { InvalidWebhookSignatureError, UnauthorizedIntegrationError } from "../../../application/errors";

export interface WebhookAuthConfig {
  apiKey: string;
  webhookSecret?: string;
}

export function createWebhookAuthMiddleware(config: WebhookAuthConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.header("x-api-key") ?? req.header("X-API-Key");
    if (!apiKey || apiKey !== config.apiKey) {
      next(new UnauthorizedIntegrationError("Invalid or missing API key"));
      return;
    }

    if (config.webhookSecret) {
      const rawBody =
        typeof (req as Request & { rawBody?: string }).rawBody === "string"
          ? (req as Request & { rawBody: string }).rawBody
          : JSON.stringify(req.body ?? {});
      const signature = req.header("x-signature") ?? req.header("X-Signature");
      if (!verifyWebhookSignature(rawBody, signature, config.webhookSecret)) {
        next(new InvalidWebhookSignatureError());
        return;
      }
    }

    next();
  };
}
