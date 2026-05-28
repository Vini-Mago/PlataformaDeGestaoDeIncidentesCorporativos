export interface PasswordRecoveryNotifyInput {
  recipientEmail: string;
  recipientName?: string;
  resetToken: string;
  expiresAt: Date;
}

export interface IPasswordRecoveryNotifier {
  notifyPasswordRecovery(input: PasswordRecoveryNotifyInput): Promise<void>;
}

