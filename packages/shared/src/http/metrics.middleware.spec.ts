import { describe, expect, it, beforeEach } from "vitest";
import { createMetricsHandler, createMetricsMiddleware, resetMetricsForTest } from "./metrics.middleware";
import { EventEmitter } from "events";
import type { NextFunction, Request, Response } from "express";

function observeRequest(path: string, statusCode: number): void {
  const middleware = createMetricsMiddleware("test-service");
  const req = { method: "GET", path } as Request;
  const res = new EventEmitter() as Response & EventEmitter;
  res.statusCode = statusCode;
  const next: NextFunction = () => undefined;
  middleware(req, res, next);
  res.emit("finish");
}

function renderMetrics(): string {
  let body = "";
  const res = {
    type: () => res,
    send: (value: string) => {
      body = value;
      return res;
    },
  } as unknown as Response;
  createMetricsHandler("test-service")({} as Request, res);
  return body;
}

describe("metrics middleware", () => {
  beforeEach(() => resetMetricsForTest());

  it("exposes Prometheus metrics for successful and failed requests with normalized routes", async () => {
    observeRequest("/items/123", 200);
    observeRequest("/boom", 503);

    const text = renderMetrics();

    expect(text).toContain("# TYPE pgic_http_requests_total counter");
    expect(text).toContain('pgic_service_up{service="test-service"} 1');
    expect(text).toContain('method="GET",route="/items/:id",status_class="2xx"} 1');
    expect(text).toContain('method="GET",route="/boom",status_class="5xx"} 1');
    expect(text).toContain("pgic_http_request_duration_seconds_bucket");
  });
});
