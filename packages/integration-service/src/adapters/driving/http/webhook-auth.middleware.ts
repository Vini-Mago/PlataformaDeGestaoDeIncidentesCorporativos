import type { Request, Response, NextFunction } from "express";
import { verifyWebhookSignature } from "../../../infrastructure/verify-webhook-signature";
import { InvalidWebhookSignatureError, UnauthorizedIntegrationError } from "../../../application/errors";

export interface WebhookAuthConfig {
  apiKey: string;
  webhookSecret?: string;
  allowedIps?: string[];
}

function normalizeIp(ip: string): string {
  return ip.replace(/^::ffff:/, "").trim();
}

function requestMatchesAllowedIp(req: Request, allowedIps: string[]): boolean {
  if (allowedIps.length === 0) return true;
  const forwardedFor = req.header("x-forwarded-for") ?? req.header("X-Forwarded-For");
  const candidates = [
    ...(forwardedFor ? forwardedFor.split(",") : []),
    req.ip,
    req.socket.remoteAddress,
  ]
    .filter((ip): ip is string => Boolean(ip))
    .map(normalizeIp);

  return candidates.some((ip) => allowedIps.includes(ip));
}

export function createWebhookAuthMiddleware(config: WebhookAuthConfig) {
  const allowedIps = (config.allowedIps ?? []).map(normalizeIp).filter(Boolean);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!requestMatchesAllowedIp(req, allowedIps)) {
      next(new UnauthorizedIntegrationError("Webhook source IP is not allowed"));
      return;
    }

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
