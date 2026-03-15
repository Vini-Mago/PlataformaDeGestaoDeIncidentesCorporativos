/**
 * Mescla duas specs OpenAPI 3 em uma única, prefixando schemas para evitar colisões.
 * Mantém dois servers (Identity e Request) para o "Try it out" do Swagger.
 */

export interface OpenApiSpec {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: Array<{ url: string; description?: string }>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
  paths?: Record<string, unknown>;
}

const REF_PREFIX = "#/components/schemas/";

function prefixRefsInValue(value: unknown, prefix: string, schemaKeys: string[]): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    for (const key of schemaKeys) {
      if (value === REF_PREFIX + key) return REF_PREFIX + prefix + key;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => prefixRefsInValue(item, prefix, schemaKeys));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = k === "$ref" && typeof v === "string" && v.startsWith(REF_PREFIX)
        ? schemaKeys.reduce((s, key) => s.replace(REF_PREFIX + key, REF_PREFIX + prefix + key), v)
        : prefixRefsInValue(v, prefix, schemaKeys);
    }
    return out;
  }
  return value;
}

function prefixSpec(spec: OpenApiSpec, prefix: string): OpenApiSpec {
  const schemas = spec.components?.schemas ?? {};
  const schemaKeys = Object.keys(schemas);
  if (schemaKeys.length === 0) return spec;

  const prefixedSchemas: Record<string, unknown> = {};
  for (const key of schemaKeys) {
    const value = prefixRefsInValue(schemas[key], prefix, schemaKeys);
    prefixedSchemas[prefix + key] = value;
  }

  const pathValues = spec.paths ? prefixRefsInValue(spec.paths, prefix, schemaKeys) : undefined;
  return {
    ...spec,
    components: {
      ...spec.components,
      schemas: prefixedSchemas,
    },
    paths: pathValues as Record<string, unknown> | undefined,
  };
}

export interface SpecEntry {
  spec: OpenApiSpec;
  prefix: string;
  description?: string;
}

type ServerEntry = { url: string; description?: string };

function mergeTwoSpecs(
  base: { servers: ServerEntry[]; schemas: Record<string, unknown>; paths: Record<string, unknown>; securitySchemes: Record<string, unknown> },
  entry: SpecEntry
): typeof base {
  const prefixed = prefixSpec(entry.spec, entry.prefix);
  const servers = prefixed.servers ?? [];
  return {
    servers: [
      ...base.servers,
      ...servers.map((s): ServerEntry => ({ url: s.url, description: s.description ?? entry.description ?? entry.prefix })),
    ],
    schemas: { ...base.schemas, ...(prefixed.components?.schemas ?? {}) },
    paths: { ...base.paths, ...(prefixed.paths ?? {}) },
    securitySchemes: { ...base.securitySchemes, ...(prefixed.components?.securitySchemes ?? {}) },
  };
}

export function mergeOpenApiSpecs(
  identitySpec: OpenApiSpec,
  requestSpec: OpenApiSpec,
  incidentSpec?: OpenApiSpec,
  problemChangeSpec?: OpenApiSpec,
  slaSpec?: OpenApiSpec,
  escalationSpec?: OpenApiSpec,
  notificationSpec?: OpenApiSpec
): OpenApiSpec {
  const entries: SpecEntry[] = [
    { spec: identitySpec, prefix: "Identity_", description: "Identity Service" },
    { spec: requestSpec, prefix: "Request_", description: "Request Service" },
  ];
  if (incidentSpec) {
    entries.push({ spec: incidentSpec, prefix: "Incident_", description: "Incident Service" });
  }
  if (problemChangeSpec) {
    entries.push({ spec: problemChangeSpec, prefix: "ProblemChange_", description: "Problem-change Service" });
  }
  if (slaSpec) {
    entries.push({ spec: slaSpec, prefix: "Sla_", description: "SLA Service" });
  }
  if (escalationSpec) {
    entries.push({ spec: escalationSpec, prefix: "Escalation_", description: "Escalation Service" });
  }
  if (notificationSpec) {
    entries.push({ spec: notificationSpec, prefix: "Notification_", description: "Notification Service" });
  }

  const first = prefixSpec(entries[0].spec, entries[0].prefix);
  let merged: { servers: ServerEntry[]; schemas: Record<string, unknown>; paths: Record<string, unknown>; securitySchemes: Record<string, unknown> } = {
    servers: (first.servers ?? []).map((s): ServerEntry => ({ url: s.url, description: s.description ?? entries[0].description })),
    schemas: (first.components?.schemas ?? {}) as Record<string, unknown>,
    paths: (first.paths ?? {}) as Record<string, unknown>,
    securitySchemes: (first.components?.securitySchemes ?? {}) as Record<string, unknown>,
  };

  for (let i = 1; i < entries.length; i++) {
    merged = mergeTwoSpecs(merged, entries[i]);
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "PGIC API",
      version: "1.0.0",
      description: "Unified docs: Identity (auth), Request (catalog, service requests), Incident (incident lifecycle), Problem-change (problems, changes), SLA (policies, calendars), Escalation (rules, history), Notification (notifications). Use «Servers» to switch backend.",
    },
    servers: merged.servers,
    components: {
      securitySchemes: merged.securitySchemes,
      schemas: merged.schemas,
    },
    paths: merged.paths,
  };
}
