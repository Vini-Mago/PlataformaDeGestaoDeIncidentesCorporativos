import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { logger } from "@pgic/shared";
import type { IEmailSender, SendEmailInput } from "../../../application/ports/email-sender.port";

export interface SmtpEmailSenderConfig {
  fromAddress: string;
  fromName: string;
  host: string;
  port: number;
  secure: boolean;
  requireTls: boolean;
  username?: string;
  password?: string;
  connectionTimeoutMs: number;
  messageTimeoutMs: number;
}

export class SmtpEmailSenderAdapter implements IEmailSender {
  private readonly transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;

  constructor(private readonly config: SmtpEmailSenderConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: config.requireTls,
      connectionTimeout: config.connectionTimeoutMs,
      greetingTimeout: config.connectionTimeoutMs,
      socketTimeout: config.messageTimeoutMs,
      auth: config.username && config.password
        ? { user: config.username, pass: config.password }
        : undefined,
    });
  }

  async send(input: SendEmailInput): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: { name: this.config.fromName, address: this.config.fromAddress },
        to: input.to,
        subject: input.subject,
        text: input.body,
      });
    } catch (err) {
      logger.error({ err }, "SMTP send failed");
      throw err;
    }
  }
}

export class NoopEmailSenderAdapter implements IEmailSender {
  async send(): Promise<void> {
    return;
  }
}
