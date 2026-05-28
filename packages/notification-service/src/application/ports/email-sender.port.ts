export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export interface IEmailSender {
  send(input: SendEmailInput): Promise<void>;
}

