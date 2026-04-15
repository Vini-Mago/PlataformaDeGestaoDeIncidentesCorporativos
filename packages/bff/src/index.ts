import path from "path";
import { config as loadEnv } from "dotenv";
import express, { type Request, type Response as ExpressResponse } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";

loadEnv({ path: path.resolve(process.cwd(), "../../.env") });

const app = express();

const port = parseInt(process.env.BFF_PORT ?? "3100", 10);
const identityBaseUrl = process.env.IDENTITY_BASE_URL ?? "http://localhost:3001";
const requestServiceBaseUrl = process.env.REQUEST_SERVICE_BASE_URL ?? `http://localhost:${process.env.REQUEST_SERVICE_PORT ?? "3002"}`;
const incidentServiceBaseUrl = process.env.INCIDENT_SERVICE_BASE_URL ?? `http://localhost:${process.env.INCIDENT_SERVICE_PORT ?? "3004"}`;
const problemChangeServiceBaseUrl = process.env.PROBLEM_CHANGE_SERVICE_BASE_URL ?? `http://localhost:${process.env.PROBLEM_CHANGE_SERVICE_PORT ?? "3005"}`;
const slaServiceBaseUrl = process.env.SLA_SERVICE_BASE_URL ?? `http://localhost:${process.env.SLA_SERVICE_PORT ?? "3006"}`;
const escalationServiceBaseUrl = process.env.ESCALATION_SERVICE_BASE_URL ?? `http://localhost:${process.env.ESCALATION_SERVICE_PORT ?? "3007"}`;
const notificationServiceBaseUrl = process.env.NOTIFICATION_SERVICE_BASE_URL ?? `http://localhost:${process.env.NOTIFICATION_SERVICE_PORT ?? "3008"}`;
const auditServiceBaseUrl = process.env.AUDIT_SERVICE_BASE_URL ?? `http://localhost:${process.env.AUDIT_SERVICE_PORT ?? "3009"}`;
const reportingServiceBaseUrl = process.env.REPORTING_SERVICE_BASE_URL ?? `http://localhost:${process.env.REPORTING_SERVICE_PORT ?? "3010"}`;
const frontendDevUrl = process.env.FRONTEND_DEV_URL ?? "http://localhost:5173";
const cookieSecureMode = process.env.BFF_COOKIE_SECURE?.trim().toLowerCase();
const publicOriginOverride = process.env.PUBLIC_ORIGIN_OVERRIDE?.trim() || "";
const publicAllowedHostSuffixes = (process.env.PUBLIC_ALLOWED_HOST_SUFFIXES ?? "ngrok-free.app,ngrok.app,localhost")
  .split(",")
  .map((part) => part.trim().toLowerCase())
  .filter((part) => part.length > 0);

const ACCESS_COOKIE = "pgic_at";
const REFRESH_COOKIE = "pgic_rt";
const OAUTH_REDIRECT_FLOW_HEADER = "x-pgic-oauth-redirect";
const PUBLIC_ORIGIN_HEADER = "x-pgic-public-origin";

interface ServiceProxyConfig {
  routePrefix: `/${string}`;
  upstreamBaseUrl: string;
}

const serviceProxyConfigs: ServiceProxyConfig[] = [
  { routePrefix: "/identity", upstreamBaseUrl: identityBaseUrl },
  { routePrefix: "/request", upstreamBaseUrl: requestServiceBaseUrl },
  { routePrefix: "/incidents", upstreamBaseUrl: incidentServiceBaseUrl },
  { routePrefix: "/problem-change", upstreamBaseUrl: problemChangeServiceBaseUrl },
  { routePrefix: "/sla", upstreamBaseUrl: slaServiceBaseUrl },
  { routePrefix: "/escalation", upstreamBaseUrl: escalationServiceBaseUrl },
  { routePrefix: "/notifications", upstreamBaseUrl: notificationServiceBaseUrl },
  { routePrefix: "/audit", upstreamBaseUrl: auditServiceBaseUrl },
  { routePrefix: "/reporting", upstreamBaseUrl: reportingServiceBaseUrl },
];

const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "cookie",
  "authorization",
  "content-length",
]);
const passthroughHeaders = ["content-type", "location", "x-request-id"];

app.set("trust proxy", 1);
app.use(express.raw({ type: "*/*", limit: "1mb" }));
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function shouldUseSecureCookies(req: Request): boolean {
  if (cookieSecureMode === "true") return true;
  if (cookieSecureMode === "false") return false;
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  if (typeof proto === "string" && proto.split(",")[0]?.trim().toLowerCase() === "https") {
    return true;
  }
  if (req.secure) {
    return true;
  }
  const origin = req.headers.origin;
  if (typeof origin === "string" && origin.toLowerCase().startsWith("https://")) {
    return true;
  }
  return process.env.NODE_ENV === "production";
}

function setAuthCookies(req: Request, res: ExpressResponse, accessToken: string, refreshToken?: string): void {
  const cookieSecure = shouldUseSecureCookies(req);
  const common = {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax" as const,
    path: "/",
  };

  res.cookie(ACCESS_COOKIE, accessToken, {
    ...common,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  if (refreshToken) {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...common,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
  }
}

function clearAuthCookies(req: Request, res: ExpressResponse): void {
  const cookieSecure = shouldUseSecureCookies(req);
  const common = {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax" as const,
    path: "/",
  };

  res.clearCookie(ACCESS_COOKIE, common);
  res.clearCookie(REFRESH_COOKIE, common);
}

async function identityRequest(pathname: string, init: RequestInit = {}): Promise<globalThis.Response> {
  return fetch(`${normalizeBaseUrl(identityBaseUrl)}${pathname}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

function isAllowedPublicHost(hostWithPort: string): boolean {
  if (publicAllowedHostSuffixes.length === 0) {
    return true;
  }
  const host = hostWithPort.split(":")[0].toLowerCase();
  return publicAllowedHostSuffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

function resolveRequestPublicOrigin(req: Request): string | null {
  if (publicOriginOverride) {
    try {
      const parsed = new URL(publicOriginOverride);
      if (isAllowedPublicHost(parsed.host)) {
        return parsed.origin;
      }
      return null;
    } catch {
      return null;
    }
  }

  const host = typeof req.headers.host === "string" ? req.headers.host.trim() : "";
  if (!host || !isAllowedPublicHost(host)) {
    return null;
  }

  const forwardedProto = req.headers["x-forwarded-proto"];
  const protoRaw = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const proto = typeof protoRaw === "string" && protoRaw.split(",")[0]?.trim().toLowerCase() === "https"
    ? "https"
    : req.protocol === "https"
      ? "https"
      : "http";

  return `${proto}://${host}`;
}

async function refreshAccessToken(req: Request, res: ExpressResponse): Promise<string | null> {
  const refreshToken = req.cookies[REFRESH_COOKIE] as string | undefined;
  if (!refreshToken) {
    return null;
  }

  const refreshResponse = await identityRequest("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });

  if (!refreshResponse.ok) {
    clearAuthCookies(req, res);
    return null;
  }

  const payload = (await refreshResponse.json()) as {
    accessToken: string;
    refreshToken?: string;
  };

  setAuthCookies(req, res, payload.accessToken, payload.refreshToken);
  return payload.accessToken;
}

function buildForwardHeaders(req: Request, accessToken: string): Headers {
  const headers = new Headers();

  for (const [name, rawValue] of Object.entries(req.headers)) {
    const lower = name.toLowerCase();
    if (hopByHopHeaders.has(lower) || rawValue == null) {
      continue;
    }

    if (Array.isArray(rawValue)) {
      headers.set(name, rawValue.join(", "));
      continue;
    }

    headers.set(name, rawValue);
  }

  headers.set("Authorization", `Bearer ${accessToken}`);
  return headers;
}

function copyUpstreamHeaders(upstream: globalThis.Response, res: ExpressResponse): void {
  for (const headerName of passthroughHeaders) {
    const value = upstream.headers.get(headerName);
    if (value) {
      res.setHeader(headerName, value);
    }
  }
}

async function forwardToService(
  req: Request,
  upstreamBaseUrl: string,
  upstreamPathWithQuery: string,
  accessToken: string
): Promise<globalThis.Response> {
  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const rawBody = Buffer.isBuffer(req.body) && req.body.length > 0 ? req.body : undefined;
  const requestBody = rawBody ? new Uint8Array(rawBody) : undefined;

  return fetch(`${normalizeBaseUrl(upstreamBaseUrl)}${upstreamPathWithQuery}`, {
    method,
    headers: buildForwardHeaders(req, accessToken),
    body: hasBody ? requestBody : undefined,
    redirect: "manual",
  });
}

async function proxyServiceApi(req: Request, res: ExpressResponse, upstreamBaseUrl: string): Promise<void> {
  const accessToken = req.cookies[ACCESS_COOKIE] as string | undefined;
  if (!accessToken) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }

  const upstreamPathWithQuery = `/api${req.url}`;
  let upstreamResponse = await forwardToService(req, upstreamBaseUrl, upstreamPathWithQuery, accessToken);

  if (upstreamResponse.status === 401) {
    const refreshedAccess = await refreshAccessToken(req, res);
    if (!refreshedAccess) {
      res.status(401).json({ message: "Unauthenticated" });
      return;
    }
    upstreamResponse = await forwardToService(req, upstreamBaseUrl, upstreamPathWithQuery, refreshedAccess);
  }

  copyUpstreamHeaders(upstreamResponse, res);
  const body = Buffer.from(await upstreamResponse.arrayBuffer());
  res.status(upstreamResponse.status).send(body);
}

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "bff" });
});

app.get("/auth/google", async (req, res) => {
  const publicOrigin = resolveRequestPublicOrigin(req);
  if (!publicOrigin) {
    res.status(400).json({ message: "Invalid public origin" });
    return;
  }
  try {
    const googleRedirect = await identityRequest("/api/auth/google", {
      method: "GET",
      redirect: "manual",
      headers: {
        [OAUTH_REDIRECT_FLOW_HEADER]: "1",
        [PUBLIC_ORIGIN_HEADER]: publicOrigin,
      },
    });
    const location = googleRedirect.headers.get("location");
    if (!location) {
      res.status(502).json({ message: "OAuth provider redirect missing" });
      return;
    }
    res.redirect(location);
  } catch {
    res.status(502).json({ message: "Failed to start OAuth flow" });
  }
});

app.get("/auth/google/callback", async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  if (!code || !state) {
    clearAuthCookies(req, res);
    res.redirect("/login?error=OAuth%20callback%20invalido");
    return;
  }
  const publicOrigin = resolveRequestPublicOrigin(req);
  if (!publicOrigin) {
    clearAuthCookies(req, res);
    res.redirect("/login?error=Origem%20publica%20invalida");
    return;
  }
  try {
    const callbackResponse = await identityRequest(
      `/api/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      {
        method: "GET",
        redirect: "manual",
        headers: {
          [OAUTH_REDIRECT_FLOW_HEADER]: "1",
          [PUBLIC_ORIGIN_HEADER]: publicOrigin,
        },
      }
    );
    const location = callbackResponse.headers.get("location");
    if (!location) {
      clearAuthCookies(req, res);
      res.redirect("/login?error=Falha%20no%20callback%20OAuth");
      return;
    }
    res.redirect(location);
  } catch {
    clearAuthCookies(req, res);
    res.redirect("/login?error=Falha%20ao%20finalizar%20OAuth");
  }
});

app.get("/auth/callback", async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const error = typeof req.query.error === "string" ? req.query.error : "";

  if (error) {
    clearAuthCookies(req, res);
    res.redirect(`/login?error=${encodeURIComponent(error)}`);
    return;
  }

  if (!code) {
    clearAuthCookies(req, res);
    res.redirect("/login?error=OAuth%20callback%20invalido");
    return;
  }

  try {
    const exchangeResponse = await identityRequest("/api/auth/exchange-code", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    if (!exchangeResponse.ok) {
      clearAuthCookies(req, res);
      res.redirect("/login?error=Falha%20na%20troca%20de%20codigo%20OAuth");
      return;
    }
    const payload = (await exchangeResponse.json()) as {
      accessToken: string;
      refreshToken?: string;
    };
    setAuthCookies(req, res, payload.accessToken, payload.refreshToken);
    res.redirect("/dashboard");
  } catch {
    clearAuthCookies(req, res);
    res.redirect("/login?error=Falha%20ao%20finalizar%20OAuth");
  }
});

app.get("/auth/me", async (req, res) => {
  const accessToken = req.cookies[ACCESS_COOKIE] as string | undefined;
  if (!accessToken) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }

  const meResponse = await identityRequest("/api/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (meResponse.ok) {
    const me = await meResponse.json();
    res.status(200).json(me);
    return;
  }

  if (meResponse.status !== 401) {
    const text = await meResponse.text();
    res.status(meResponse.status).send(text || "Failed to fetch profile");
    return;
  }

  const refreshedAccess = await refreshAccessToken(req, res);
  if (!refreshedAccess) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }

  const retryMe = await identityRequest("/api/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${refreshedAccess}`,
    },
  });

  if (!retryMe.ok) {
    clearAuthCookies(req, res);
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }

  const me = await retryMe.json();
  res.status(200).json(me);
});

app.post("/auth/logout", async (req, res) => {
  const accessToken = req.cookies[ACCESS_COOKIE] as string | undefined;

  if (accessToken) {
    try {
      await identityRequest("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch {
      // best-effort logout no upstream
    }
  }

  clearAuthCookies(req, res);
  res.status(204).send();
});

for (const config of serviceProxyConfigs) {
  app.get(`${config.routePrefix}/health`, async (_req, res) => {
    try {
      const upstreamResponse = await fetch(`${normalizeBaseUrl(config.upstreamBaseUrl)}/health`, {
        method: "GET",
      });
      const body = Buffer.from(await upstreamResponse.arrayBuffer());
      copyUpstreamHeaders(upstreamResponse, res);
      res.status(upstreamResponse.status).send(body);
    } catch {
      res.status(502).json({ message: `Failed to reach ${config.routePrefix} upstream` });
    }
  });

  app.use(config.routePrefix, (req, res) => {
    void proxyServiceApi(req, res, config.upstreamBaseUrl);
  });
}

app.use(
  "/",
  createProxyMiddleware({
    target: frontendDevUrl,
    changeOrigin: true,
    ws: true,
  })
);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`BFF listening on http://localhost:${port}`);
});
