export interface AccessLogInput {
  userId?: string | null;
  identifier?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  method?: string | null;
  path?: string | null;
  eventType: string;
  result: "success" | "failure";
  statusCode: number;
  reason?: string | null;
}

export interface AccessLogRecord extends AccessLogInput {
  id: string;
  createdAt: Date;
}

export interface ListAccessLogsQuery {
  userId?: string;
  eventType?: string;
  result?: "success" | "failure";
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface IAccessLogRepository {
  create(input: AccessLogInput): Promise<void>;
  list(query: ListAccessLogsQuery): Promise<{ items: AccessLogRecord[]; total: number }>;
}
