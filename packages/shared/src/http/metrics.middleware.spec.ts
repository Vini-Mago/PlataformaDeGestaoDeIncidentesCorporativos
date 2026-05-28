import { describe, expect, it, beforeEach } from "vitest";
import { createMetricsHandler, createMetricsMiddleware, resetMetricsForTest } from "./metrics.middleware";
import { EventEmitter } from "events";
import type { NextFunction, Request, Response } from "express";

function observeRequest(path: string, statusCode: number, routePath?: string): void {
  const middleware = createMetricsMiddleware("test-service", { maxSeries: 2 });
  const req = { method: "GET", path, route: routePath ? { path: routePath } : undefined } as unknown as Request;
  const res = new EventEmitter() as Response & EventEmitter;
  res.statusCode = statusCode;
  const next: NextFunction = () => undefined;
  middleware(req, res, next);
  res.emit("finish");
}

function renderMetrics(token = "test-token"): string {
  let body = "";
  const res = {
    status: () => res,
    json: () => res,
    type: () => res,
    send: (value: string) => {
      body = value;
      return res;
    },
  } as unknown as Response;
  createMetricsHandler("test-service", { token })(
    { headers: { authorization: `Bearer ${token}` } } as unknown as Request,
    res
  );
  return body;
}

describe("metrics middleware", () => {
  beforeEach(() => resetMetricsForTest());

  it("exposes Prometheus metrics for successful and failed requests with normalized routes", async () => {
    observeRequest("/items/123", 200, "/items/:id");
    observeRequest("/boom", 503);
    observeRequest("/not-found", 404);

    const text = renderMetrics();

    expect(text).toContain("# TYPE pgic_http_requests_total counter");
    expect(text).toContain('pgic_service_up{service="test-service"} 1');
    expect(text).toContain('method="GET",route="/items/:id",status_class="2xx"} 1');
    expect(text).toContain('method="GET",route="/boom",status_class="5xx"} 1');
    expect(text).not.toContain('route="/not-found"');
    expect(text).toContain("pgic_http_request_duration_seconds_bucket");
  });

  it("caps series cardinality and routes overflow to /unknown", () => {
    observeRequest("/a", 200);
    observeRequest("/b", 200);
    observeRequest("/c", 200);

    const text = renderMetrics();
    expect(text).toContain('route="/unknown",status_class="2xx"} 1');
  });

  it("returns 503 when metrics token is not configured", () => {
    const req = { headers: {} } as unknown as Request;
    const res = {
      status: (code: number) => {
        expect(code).toBe(503);
        return res;
      },
      json: (body: unknown) => {
        expect(body).toEqual({ error: "Metrics endpoint disabled. Configure METRICS_TOKEN." });
        return res;
      },
    } as unknown as Response;
    createMetricsHandler("test-service")(req, res);
  });
});
