import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import { logger } from "@pgic/shared";
import type { IPasswordRecoveryNotifier, PasswordRecoveryNotifyInput } from "../../../application/ports/password-recovery-notifier.port";
import type { ITokenService } from "../../../application/ports/token-service.port";

interface NotificationApiResponse {
  id?: string;
}

export class HttpPasswordRecoveryNotifierAdapter implements IPasswordRecoveryNotifier {
  constructor(
    private readonly notificationServiceBaseUrl: string,
    private readonly tokenService: ITokenService,
    private readonly serviceUserId = "system:identity-service"
  ) {}

  async notifyPasswordRecovery(input: PasswordRecoveryNotifyInput): Promise<void> {
    const subject = "Recuperacao de senha";
    const expiresIso = input.expiresAt.toISOString();
    const body = [
      `Ola${input.recipientName ? `, ${input.recipientName}` : ""}.`,
      "",
      "Recebemos um pedido para recuperar a sua senha.",
      "Use o token abaixo para redefinir:",
      input.resetToken,
      "",
      `Expira em: ${expiresIso}`,
      "Se nao solicitou, ignore este e-mail.",
    ].join("\n");

    const token = this.tokenService.sign({
      sub: this.serviceUserId,
      email: "identity-service@internal.local",
      role: "service",
      perms: ["notifications:manage:all"],
    });

    await this.postJson("/api/notifications", {
      type: "email",
      recipient: input.recipientEmail,
      subject,
      body: "Password recovery instructions were generated and sent. Sensitive reset token omitted.",
      deliveryBody: body,
    }, token);
  }

  private async postJson(path: string, payload: Record<string, unknown>, bearerToken: string): Promise<NotificationApiResponse> {
    const url = new URL(path, this.notificationServiceBaseUrl);
    const isHttps = url.protocol === "https:";
    const transport = isHttps ? https : http;
    const body = JSON.stringify(payload);

    return await new Promise<NotificationApiResponse>((resolve, reject) => {
      const req = transport.request(
        {
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: `${url.pathname}${url.search}`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
            Authorization: `Bearer ${bearerToken}`,
          },
          timeout: 10000,
        },
        (res) => {
          let chunks = "";
          res.on("data", (chunk: Buffer | string) => {
            chunks += chunk.toString();
          });
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              if (!chunks.trim()) {
                resolve({});
                return;
              }
              try {
                resolve(JSON.parse(chunks) as NotificationApiResponse);
              } catch {
                resolve({});
              }
              return;
            }
            reject(new Error(`notification-service returned ${res.statusCode ?? "unknown"}: ${chunks}`));
          });
        }
      );

      req.on("timeout", () => {
        req.destroy(new Error("notification-service request timed out"));
      });
      req.on("error", (err) => reject(err));
      req.write(body);
      req.end();
    }).catch((err) => {
      logger.error({ err }, "Failed to send password recovery notification");
      throw err;
    });
  }
}

export class NoopPasswordRecoveryNotifierAdapter implements IPasswordRecoveryNotifier {
  async notifyPasswordRecovery(): Promise<void> {
    return;
  }
}
