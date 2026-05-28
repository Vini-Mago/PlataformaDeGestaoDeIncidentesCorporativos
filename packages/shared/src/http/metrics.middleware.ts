import type { NextFunction, Request, Response } from "express";

const DEFAULT_BUCKETS_SECONDS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const NUMERIC_SEGMENT_RE = /\/[0-9]+(?=\/|$)/g;

interface RequestMetric {
  count: number;
  sumSeconds: number;
  buckets: number[];
}

interface MetricsStore {
  startedAt: number;
  requests: Map<string, RequestMetric>;
}

const stores = new Map<string, MetricsStore>();

function getStore(serviceName: string): MetricsStore {
  const existing = stores.get(serviceName);
  if (existing) return existing;
  const created: MetricsStore = { startedAt: Date.now(), requests: new Map() };
  stores.set(serviceName, created);
  return created;
}

function escapeLabel(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\n/g, "\\n");
}

function normalizePath(path: string): string {
  const withoutQuery = path.split("?")[0] || "/";
  const normalized = withoutQuery
    .replace(UUID_RE, ":id")
    .replace(NUMERIC_SEGMENT_RE, "/:id")
    .replace(/\/+/g, "/");
  return normalized.length > 1 && normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function metricKey(method: string, route: string, statusClass: string): string {
  return `${method}\u0000${route}\u0000${statusClass}`;
}

function observe(serviceName: string, method: string, route: string, statusCode: number, durationSeconds: number): void {
  const store = getStore(serviceName);
  const statusClass = `${Math.floor(statusCode / 100)}xx`;
  const key = metricKey(method, route, statusClass);
  const metric = store.requests.get(key) ?? {
    count: 0,
    sumSeconds: 0,
    buckets: DEFAULT_BUCKETS_SECONDS.map(() => 0),
  };
  metric.count += 1;
  metric.sumSeconds += durationSeconds;
  DEFAULT_BUCKETS_SECONDS.forEach((bucket, index) => {
    if (durationSeconds <= bucket) metric.buckets[index] += 1;
  });
  store.requests.set(key, metric);
}

export function createMetricsMiddleware(serviceName: string) {
  getStore(serviceName);
  return (req: Request, res: Response, next: NextFunction): void => {
    const started = process.hrtime.bigint();
    res.on("finish", () => {
      const durationSeconds = Number(process.hrtime.bigint() - started) / 1_000_000_000;
      observe(serviceName, req.method, normalizePath(req.path), res.statusCode, durationSeconds);
    });
    next();
  };
}

export function createMetricsHandler(serviceName: string) {
  const store = getStore(serviceName);
  return (_req: Request, res: Response): void => {
    const lines: string[] = [
      "# HELP pgic_service_up Service process is up.",
      "# TYPE pgic_service_up gauge",
      `pgic_service_up{service="${escapeLabel(serviceName)}"} 1`,
      "# HELP pgic_service_uptime_seconds Service process uptime in seconds.",
      "# TYPE pgic_service_uptime_seconds gauge",
      `pgic_service_uptime_seconds{service="${escapeLabel(serviceName)}"} ${Math.floor((Date.now() - store.startedAt) / 1000)}`,
      "# HELP pgic_http_requests_total Total HTTP requests by service, method, route and status class.",
      "# TYPE pgic_http_requests_total counter",
    ];

    const entries = [...store.requests.entries()].sort(([a], [b]) => a.localeCompare(b));
    for (const [key, metric] of entries) {
      const [method, route, statusClass] = key.split("\u0000");
      const labels = `service="${escapeLabel(serviceName)}",method="${escapeLabel(method)}",route="${escapeLabel(route)}",status_class="${escapeLabel(statusClass)}"`;
      lines.push(`pgic_http_requests_total{${labels}} ${metric.count}`);
    }

    lines.push(
      "# HELP pgic_http_request_duration_seconds HTTP request duration histogram by service, method, route and status class.",
      "# TYPE pgic_http_request_duration_seconds histogram"
    );

    for (const [key, metric] of entries) {
      const [method, route, statusClass] = key.split("\u0000");
      const baseLabels = `service="${escapeLabel(serviceName)}",method="${escapeLabel(method)}",route="${escapeLabel(route)}",status_class="${escapeLabel(statusClass)}"`;
      DEFAULT_BUCKETS_SECONDS.forEach((bucket, index) => {
        lines.push(`pgic_http_request_duration_seconds_bucket{${baseLabels},le="${bucket}"} ${metric.buckets[index]}`);
      });
      lines.push(`pgic_http_request_duration_seconds_bucket{${baseLabels},le="+Inf"} ${metric.count}`);
      lines.push(`pgic_http_request_duration_seconds_sum{${baseLabels}} ${metric.sumSeconds}`);
      lines.push(`pgic_http_request_duration_seconds_count{${baseLabels}} ${metric.count}`);
    }

    res.type("text/plain; version=0.0.4; charset=utf-8").send(`${lines.join("\n")}\n`);
  };
}

export function resetMetricsForTest(serviceName?: string): void {
  if (serviceName) {
    stores.delete(serviceName);
    return;
  }
  stores.clear();
}
