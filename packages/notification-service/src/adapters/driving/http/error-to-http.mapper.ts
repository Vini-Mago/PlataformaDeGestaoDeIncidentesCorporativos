import { createErrorToHttpMapper } from "@pgic/shared";
import {
  NotificationNotFoundError,
  InvalidNotificationTypeError,
} from "../../../application/errors";

const map = createErrorToHttpMapper([
  [NotificationNotFoundError, 404],
  [InvalidNotificationTypeError, 400],
]);

export function mapApplicationErrorToHttp(error: unknown): { statusCode: number; message: string } {
  return map(error);
}
