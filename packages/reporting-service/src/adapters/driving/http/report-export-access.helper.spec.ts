import type { NextFunction, Request, Response } from "express";
import { describe, it, expect, vi } from "vitest";
import {
  canAccessAllReportExports,
  requireReportExportJobAccess,
} from "./report-export-access.helper";

function createResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    headersSent: false,
  } as unknown as Response;
  return res;
}

function createRequest(input: {
  role?: string;
  permissions?: string[];
  userId?: string;
}): Request {
  return {
    userId: input.userId ?? "11111111-1111-1111-1111-111111111111",
    userRole: input.role ?? "user",
    permissionKeys: input.permissions ? new Set(input.permissions) : undefined,
  } as Request;
}

describe("report export access helper", () => {
  it("allows export-job route access with reporting:export:own", () => {
    const middleware = requireReportExportJobAccess();
    const req = createRequest({ permissions: ["reporting:export:own"] });
    const res = createResponse();
    const next: NextFunction = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("keeps export-job route access with reporting:export:all", () => {
    const middleware = requireReportExportJobAccess();
    const req = createRequest({ permissions: ["reporting:export:all"] });
    const res = createResponse();
    const next: NextFunction = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(canAccessAllReportExports(req)).toBe(true);
  });

  it("allows admin role without explicit permission keys", () => {
    const middleware = requireReportExportJobAccess();
    const req = createRequest({ role: "admin" });
    const res = createResponse();
    const next: NextFunction = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(canAccessAllReportExports(req)).toBe(true);
  });

  it("rejects export-job route access without export permission", () => {
    const middleware = requireReportExportJobAccess();
    const req = createRequest({ permissions: ["reporting:read:all"] });
    const res = createResponse();
    const next: NextFunction = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("does not treat reporting:export:own as administrative access", () => {
    const req = createRequest({ permissions: ["reporting:export:own"] });

    expect(canAccessAllReportExports(req)).toBe(false);
  });
});
