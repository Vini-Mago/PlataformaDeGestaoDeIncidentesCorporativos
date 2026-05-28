import net from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SmtpEmailSenderAdapter } from "./smtp-email-sender.adapter";
import { CreateNotificationUseCase } from "../../../application/use-cases/create-notification.use-case";
import type { INotificationRepository } from "../../../application/ports/notification-repository.port";
import type { Notification } from "../../../domain/entities/notification.entity";

interface ReceivedSmtpMessage {
  from: string;
  to: string;
  data: string;
}

class LocalSmtpSandbox {
  private readonly messages: ReceivedSmtpMessage[] = [];
  private readonly server = net.createServer((socket) => this.handleConnection(socket));
  private waiters: Array<(message: ReceivedSmtpMessage) => void> = [];

  async start(): Promise<number> {
    await new Promise<void>((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(0, "127.0.0.1", () => {
        this.server.off("error", reject);
        resolve();
      });
    });
    const address = this.server.address();
    if (!address || typeof address === "string") {
      throw new Error("SMTP sandbox did not bind to a TCP port");
    }
    return address.port;
  }

  async stop(): Promise<void> {
    for (const socket of this.serverConnections) socket.destroy();
    await new Promise<void>((resolve, reject) => {
      this.server.close((err) => (err ? reject(err) : resolve()));
    }).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== "ERR_SERVER_NOT_RUNNING") throw err;
    });
  }

  waitForMessage(): Promise<ReceivedSmtpMessage> {
    const existing = this.messages.at(-1);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }

  private readonly serverConnections = new Set<net.Socket>();

  private handleConnection(socket: net.Socket): void {
    this.serverConnections.add(socket);
    socket.on("close", () => this.serverConnections.delete(socket));

    let buffer = "";
    let dataMode = false;
    let dataLines: string[] = [];
    let from = "";
    let to = "";

    const send = (line: string) => socket.write(`${line}\r\n`);
    send("220 local-smtp-sandbox ESMTP");

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex >= 0) {
        const rawLine = buffer.slice(0, newlineIndex).replace(/\r$/, "");
        buffer = buffer.slice(newlineIndex + 1);
        newlineIndex = buffer.indexOf("\n");

        if (dataMode) {
          if (rawLine === ".") {
            dataMode = false;
            const message = { from, to, data: dataLines.join("\n") };
            this.messages.push(message);
            const waiter = this.waiters.shift();
            if (waiter) waiter(message);
            dataLines = [];
            send("250 2.0.0 queued");
          } else {
            dataLines.push(rawLine.startsWith("..") ? rawLine.slice(1) : rawLine);
          }
          continue;
        }

        const upperLine = rawLine.toUpperCase();
        if (upperLine.startsWith("EHLO") || upperLine.startsWith("HELO")) {
          send("250-local-smtp-sandbox");
          send("250 8BITMIME");
        } else if (upperLine.startsWith("MAIL FROM:")) {
          from = rawLine.slice("MAIL FROM:".length).trim();
          send("250 2.1.0 ok");
        } else if (upperLine.startsWith("RCPT TO:")) {
          to = rawLine.slice("RCPT TO:".length).trim();
          send("250 2.1.5 ok");
        } else if (upperLine === "DATA") {
          dataMode = true;
          send("354 end data with <CR><LF>.<CR><LF>");
        } else if (upperLine === "RSET") {
          dataMode = false;
          dataLines = [];
          send("250 2.0.0 reset");
        } else if (upperLine === "QUIT") {
          send("221 2.0.0 bye");
          socket.end();
        } else {
          send("250 2.0.0 ok");
        }
      }
    });
  }
}

describe("SmtpEmailSenderAdapter", () => {
  let sandbox: LocalSmtpSandbox | undefined;

  afterEach(async () => {
    await sandbox?.stop();
    sandbox = undefined;
  });

  async function createSender(): Promise<SmtpEmailSenderAdapter> {
    sandbox = new LocalSmtpSandbox();
    const port = await sandbox.start();
    return new SmtpEmailSenderAdapter({
      fromAddress: "no-reply@pgic.local",
      fromName: "PGIC",
      host: "127.0.0.1",
      port,
      secure: false,
      requireTls: false,
      connectionTimeoutMs: 1000,
      messageTimeoutMs: 1000,
    });
  }

  it("delivers an email through a real SMTP socket to a local sandbox", async () => {
    const sender = await createSender();

    await sender.send({
      to: "user@example.com",
      subject: "SMTP evidence",
      body: "Mensagem entregue via SMTP local.",
    });

    const message = await sandbox?.waitForMessage();
    expect(message?.from).toContain("no-reply@pgic.local");
    expect(message?.to).toContain("user@example.com");
    expect(message?.data).toContain("Subject: SMTP evidence");
    expect(message?.data).toContain("Mensagem entregue via SMTP local.");
  });

  it("marks notification as sent after SMTP delivery and persists only the redacted recovery body", async () => {
    const sender = await createSender();
    const rawResetToken = "raw-reset-token-123";
    const redactedBody = "Password recovery instructions were generated and sent. Sensitive reset token omitted.";
    const createdAt = new Date();
    let persistedNotification: Notification | undefined;

    const repository: INotificationRepository = {
      create: vi.fn(async (input) => {
        persistedNotification = {
          id: "smtp-notification-1",
          type: input.type,
          recipient: input.recipient,
          subject: input.subject,
          body: input.body ?? null,
          status: "pending",
          sentAt: null,
          deliveredAt: null,
          failedAt: null,
          errorMessage: null,
          createdAt,
        };
        return persistedNotification;
      }),
      markAsSent: vi.fn(async (id) => {
        if (!persistedNotification || persistedNotification.id !== id) {
          throw new Error("Notification not found");
        }
        persistedNotification = {
          ...persistedNotification,
          status: "sent",
          sentAt: new Date(),
          deliveredAt: new Date(),
          failedAt: null,
          errorMessage: null,
        };
        return persistedNotification;
      }),
      markAsFailed: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
    };
    const useCase = new CreateNotificationUseCase(repository, sender);

    const result = await useCase.execute({
      type: "email",
      recipient: "user@example.com",
      subject: "Recuperacao de senha",
      body: redactedBody,
      deliveryBody: `Use o token abaixo para redefinir:\n${rawResetToken}`,
    });

    const message = await sandbox?.waitForMessage();
    expect(repository.create).toHaveBeenCalledWith({
      type: "email",
      recipient: "user@example.com",
      subject: "Recuperacao de senha",
      body: redactedBody,
    });
    expect(repository.markAsSent).toHaveBeenCalledWith("smtp-notification-1");
    expect(repository.markAsFailed).not.toHaveBeenCalled();
    expect(result.status).toBe("sent");
    expect(persistedNotification?.body).toBe(redactedBody);
    expect(persistedNotification?.body).not.toContain(rawResetToken);
    expect(message?.data).toContain(rawResetToken);
  });
});
