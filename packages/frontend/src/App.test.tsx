import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

type MockRoute = {
  method?: string;
  match: string | RegExp | ((url: string, method: string) => boolean);
  status?: number;
  body?: unknown;
};

const user = {
  id: "user-1",
  name: "Audri Admin",
  email: "audri@example.com",
  role: "admin",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function matchesRoute(route: MockRoute, url: string, method: string): boolean {
  if (route.method && route.method !== method) return false;
  if (typeof route.match === "string") return url === route.match;
  if (route.match instanceof RegExp) return route.match.test(url);
  return route.match(url, method);
}

function installFetchMock(routes: MockRoute[]) {
  const calls: Array<{ url: string; method: string }> = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    calls.push({ url, method });
    const route = routes.find((candidate) => matchesRoute(candidate, url, method));
    if (!route) {
      return jsonResponse({ message: `Unhandled request: ${method} ${url}` }, 404);
    }
    return jsonResponse(route.body ?? {}, route.status ?? 200);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, calls };
}

function authenticatedRoutes(extra: MockRoute[] = []): MockRoute[] {
  return [
    ...extra,
    { match: "/auth/me", body: user },
    { match: "/incidents/incidents", body: [] },
    { match: "/request/service-requests", body: [] },
    { match: "/request/catalog-items", body: [] },
    { match: "/problem-change/problems", body: [] },
    { match: /\/problem-change\/problems\/linked.*/, body: [] },
    { match: "/problem-change/changes", body: [] },
    { match: /\/incidents\/incidents\/[^/]+\/attachments/, body: [] },
    ...healthRoutes(),
  ];
}

function healthRoutes(): MockRoute[] {
  return [
    "/health",
    "/identity/health",
    "/incidents/health",
    "/request/health",
    "/problem-change/health",
    "/sla/health",
    "/escalation/health",
    "/notifications/health",
    "/audit/health",
    "/reporting/health",
    "/integration/health",
  ].map((path) => ({ match: path, body: { status: "ok" } }));
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("auth pages", () => {
  it("logs in with password and opens the dashboard", async () => {
    installFetchMock([
      { match: "/auth/me", status: 401, body: { message: "Unauthenticated" } },
      { match: "/auth/login", method: "POST", body: user },
      ...authenticatedRoutes().filter((route) => route.match !== "/auth/me"),
    ]);

    renderAt("/login");
    await screen.findByRole("heading", { name: "Entrar" });
    await userEvent.type(screen.getByLabelText("E-mail ou login"), "audri@example.com");
    await userEvent.type(screen.getByLabelText("Senha"), "Password123");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("heading", { name: "Visão operacional" })).toBeInTheDocument();
    expect(screen.getByText("Audri Admin")).toBeInTheDocument();
  });

  it("registers with password and opens the dashboard", async () => {
    installFetchMock([
      { match: "/auth/me", status: 401, body: { message: "Unauthenticated" } },
      { match: "/auth/register", method: "POST", body: user },
      ...authenticatedRoutes().filter((route) => route.match !== "/auth/me"),
    ]);

    renderAt("/register");
    await screen.findByRole("heading", { name: "Criar acesso" });
    await userEvent.type(screen.getByLabelText("Nome completo"), "Audri Admin");
    await userEvent.type(screen.getByLabelText("E-mail"), "audri@example.com");
    await userEvent.type(screen.getByLabelText("Senha"), "Password123");
    await userEvent.click(screen.getByRole("button", { name: "Registrar e entrar" }));

    expect(await screen.findByRole("heading", { name: "Visão operacional" })).toBeInTheDocument();
  });

  it("redirects protected routes to login when the session is missing", async () => {
    installFetchMock([{ match: "/auth/me", status: 401, body: { message: "Unauthenticated" } }]);

    renderAt("/dashboard");

    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument();
  });
});

describe("dashboard and module pages", () => {
  it("shows dashboard metrics from incident and request data", async () => {
    installFetchMock(authenticatedRoutes([
      {
        match: "/incidents/incidents",
        body: [
          { id: "i1", title: "API offline", status: "Open", criticality: "Critical", requesterId: "user-1" },
          { id: "i2", title: "VPN lenta", status: "Resolved", criticality: "Low", requesterId: "user-1" },
        ],
      },
      {
        match: "/request/service-requests",
        body: [
          { id: "r1", catalogItemId: "c1", requesterId: "user-1", status: "Submitted", formData: null, assignedTeamId: null, assignedToId: null },
          { id: "r2", catalogItemId: "c1", requesterId: "user-1", status: "Completed", formData: null, assignedTeamId: null, assignedToId: null },
        ],
      },
    ]));

    renderAt("/dashboard");

    expect(await screen.findByText("Incidentes abertos")).toBeInTheDocument();
    expect(screen.getByText("API offline")).toBeInTheDocument();
    expect(screen.getByText("Requisições recentes")).toBeInTheDocument();
    expect(screen.getByText("Alta criticidade")).toBeInTheDocument();
  });

  it("opens the incidents page with create form, list, problem link controls and attachment controls", async () => {
    installFetchMock(authenticatedRoutes([
      {
        match: "/incidents/incidents",
        body: [{ id: "i1", title: "Servidor caiu", status: "Open", criticality: "High", requesterId: "user-1", serviceAffected: "api" }],
      },
      { match: "/problem-change/problems/select", body: [{ id: "p1", title: "Falha recorrente" }] },
      { match: /\/problem-change\/problems\/linked.*/, body: [{ incidentId: "i1", problemId: "p1", problemTitle: "Falha recorrente" }] },
      { match: /\/incidents\/incidents\/i1\/attachments/, body: [{ id: "a1", incidentId: "i1", uploadedById: "user-1", fileName: "evidencia.txt", mimeType: "text/plain", sizeBytes: 10, createdAt: new Date().toISOString() }] },
    ]));

    renderAt("/incidents");

    expect(await screen.findByRole("heading", { name: "Gestão de incidentes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Abrir incidente" })).toBeInTheDocument();
    expect(screen.getAllByText("Servidor caiu").length).toBeGreaterThan(0);
    expect(screen.getByText("Falha recorrente")).toBeInTheDocument();
    expect(screen.getByText("Anexar")).toBeInTheDocument();
  });

  it("opens the requests page", async () => {
    installFetchMock(authenticatedRoutes([
      { match: "/request/catalog-items", body: [{ id: "c1", name: "Acesso VPN", description: null, category: "Acesso", approvalFlow: "single", approverRoleIds: ["gestor"] }] },
      { match: "/request/service-requests", body: [{ id: "r1", catalogItemId: "c1", requesterId: "user-1", status: "Draft", formData: null, assignedTeamId: null, assignedToId: null }] },
    ]));

    renderAt("/requests");

    expect(await screen.findByRole("heading", { name: "Catálogo e requisições" })).toBeInTheDocument();
    expect(screen.getByText("Novo pedido de serviço")).toBeInTheDocument();
  });

  it("opens the problems page", async () => {
    installFetchMock(authenticatedRoutes([
      { match: "/problem-change/problems", body: [{ id: "p1", title: "Erro recorrente", description: "Desc", status: "Open", rootCause: null, actionPlan: null }] },
    ]));

    renderAt("/problems");

    expect(await screen.findByRole("heading", { name: "Problemas recorrentes" })).toBeInTheDocument();
    expect(screen.getAllByText("Erro recorrente").length).toBeGreaterThan(0);
  });

  it("opens the changes page", async () => {
    installFetchMock(authenticatedRoutes([
      { match: "/problem-change/changes", body: [{ id: "ch1", title: "Deploy API", status: "Draft", risk: "Medium" }] },
    ]));

    renderAt("/changes");

    expect(await screen.findByRole("heading", { name: "Change management" })).toBeInTheDocument();
    expect(screen.getAllByText("Deploy API").length).toBeGreaterThan(0);
  });
});

describe("system page", () => {
  it("shows health cards, integration logs and reprocesses a DLQ item", async () => {
    const { calls } = installFetchMock(authenticatedRoutes([
      { match: "/integration/integration-logs?limit=8", body: { items: [{ id: "l1", direction: "inbound", endpoint: "/webhook", httpStatus: 202, correlationId: null, externalId: "ext-1", errorMessage: null, durationMs: 12, createdAt: new Date().toISOString() }] } },
      { match: "/integration/integration-dlq?status=all&limit=8", body: { items: [{ id: "d1", eventName: "integration.incident_ingest", errorMessage: "failed", reprocessedAt: null, createdAt: new Date().toISOString() }] } },
      { match: "/integration/integration-dlq/d1/reprocess", method: "POST", body: { id: "d1" } },
    ]));

    renderAt("/system");

    expect(await screen.findByRole("heading", { name: "Serviços e integrações" })).toBeInTheDocument();
    expect(screen.getByText("Integration")).toBeInTheDocument();
    expect(await screen.findByText("/webhook")).toBeInTheDocument();
    const dlqSection = screen.getByRole("heading", { name: "DLQ de integração" }).closest("section");
    expect(dlqSection).not.toBeNull();
    await userEvent.click(within(dlqSection!).getByRole("button", { name: "Reprocessar" }));

    await waitFor(() => {
      expect(calls).toContainEqual({ url: "/integration/integration-dlq/d1/reprocess", method: "POST" });
    });
  });
});
