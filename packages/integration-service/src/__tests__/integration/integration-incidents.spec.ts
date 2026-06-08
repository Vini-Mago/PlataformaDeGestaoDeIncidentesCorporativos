import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createContainer } from "../../container";
import { createApp } from "../../app";

describe("integration-service - External Systems Incidents API", () => {
  const jwtSecret = "integration-test-secret-minimum-32-characters";
  const databaseUrl =
    process.env.INTEGRATION_DATABASE_URL ??
    "postgresql://pgic:pgic@localhost:55432/integration_service";

  const container = createContainer({
    databaseUrl,
    jwtSecret,
    webhookApiKey: "test-webhook-key",
    systemUserId: "00000000-0000-4000-8000-000000000001",
    incidentServiceUrl: "http://localhost:3204",
  });

  const app = createApp(container);
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("GET /api/webhooks/v1/incidents/:id fetches incident from incident-service and returns it", async () => {
    const mockIncident = {
      id: "abc-123",
      title: "Test Alert",
      status: "Open",
      criticality: "High",
    };

    // Mock fetch to incident-service returning mockIncident
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockIncident,
    } as Response);

    const res = await request(app)
      .get("/api/webhooks/v1/incidents/abc-123")
      .set("X-API-Key", "test-webhook-key");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockIncident);

    // Verify fetch call details
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3204/api/incidents/abc-123",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "Authorization": expect.stringContaining("Bearer "),
        }),
      })
    );
  });

  it("GET /api/webhooks/v1/incidents/external/:externalId filters from list in incident-service and returns it", async () => {
    const mockIncident = {
      id: "abc-123",
      title: "Test Alert",
      status: "Open",
      criticality: "High",
      externalId: "alert-555",
      externalSource: "monitoring",
    };

    // Mock fetch first returning the list of incidents matching filters
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [mockIncident],
    } as Response);

    const res = await request(app)
      .get("/api/webhooks/v1/incidents/external/alert-555")
      .set("X-API-Key", "test-webhook-key");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockIncident);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3204/api/incidents?externalId=alert-555&externalSource=monitoring",
      expect.objectContaining({
        method: "GET",
      })
    );
  });

  it("GET /api/webhooks/v1/incidents/external/:externalId returns 404 if not found", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    } as Response);

    const res = await request(app)
      .get("/api/webhooks/v1/incidents/external/alert-nonexistent")
      .set("X-API-Key", "test-webhook-key");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Incident not found with externalId: alert-nonexistent");
  });

  it("PATCH /api/webhooks/v1/incidents/:id updates incident status via incident-service", async () => {
    const mockUpdatedIncident = {
      id: "abc-123",
      status: "Resolved",
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockUpdatedIncident,
    } as Response);

    const res = await request(app)
      .patch("/api/webhooks/v1/incidents/abc-123")
      .set("X-API-Key", "test-webhook-key")
      .send({ status: "Resolved", comment: "Resolved by external system API" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockUpdatedIncident);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3204/api/incidents/abc-123/status",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          toStatus: "Resolved",
          comment: "Resolved by external system API",
        }),
      })
    );
  });

  it("PATCH /api/webhooks/v1/incidents/external/:externalId resolves externalRef first then patches status", async () => {
    const mockIncidentList = [
      { id: "abc-123", externalId: "alert-555" }
    ];
    const mockUpdatedIncident = {
      id: "abc-123",
      status: "Resolved",
    };

    // First fetch: list, Second fetch: patch status
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockIncidentList,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockUpdatedIncident,
      } as Response);

    const res = await request(app)
      .patch("/api/webhooks/v1/incidents/external/alert-555")
      .set("X-API-Key", "test-webhook-key")
      .send({ status: "Resolved", comment: "Auto-resolved" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockUpdatedIncident);

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3204/api/incidents?externalId=alert-555&externalSource=monitoring",
      expect.any(Object)
    );

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3204/api/incidents/abc-123/status",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          toStatus: "Resolved",
          comment: "Auto-resolved",
        }),
      })
    );
  });
});
