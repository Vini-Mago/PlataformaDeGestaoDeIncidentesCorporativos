import { AppError } from "@pgic/shared";

export class AuditEntryNotFoundError extends AppError {
  override name = "AuditEntryNotFoundError";
  constructor(id: string) {
    super(`Audit entry not found: ${id}`);
    Object.setPrototypeOf(this, AuditEntryNotFoundError.prototype);
  }
}
