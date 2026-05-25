import { strict as assert } from "node:assert";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createIdentityOpenApi } = require("../../packages/identity-service/src/openapi");
const { createRequestOpenApi } = require("../../packages/request-service/src/openapi");
const { createProblemChangeOpenApi } = require("../../packages/problem-change-service/src/openapi");
const { createIntegrationOpenApi } = require("../../packages/integration-service/src/openapi");

type OpenApiDoc = {
  openapi: string;
  paths?: Record<string, Record<string, { responses?: Record<string, unknown> }>>;
};

function asOpenApiDoc(value: object): OpenApiDoc {
  return value as OpenApiDoc;
}

function assertOperation(
  docName: string,
  doc: OpenApiDoc,
  path: string,
  method: "get" | "post" | "put" | "patch" | "delete",
  expectedResponses: string[]
): void {
  const operations = doc.paths?.[path];
  assert(operations, `[${docName}] missing path: ${path}`);
  const operation = operations[method];
  assert(operation, `[${docName}] missing operation: ${method.toUpperCase()} ${path}`);

  for (const code of expectedResponses) {
    assert(
      operation.responses?.[code],
      `[${docName}] missing response ${code} for ${method.toUpperCase()} ${path}`
    );
  }
}

function main(): void {
  const identityDoc = asOpenApiDoc(createIdentityOpenApi("http://identity"));
  const requestDoc = asOpenApiDoc(createRequestOpenApi("http://request"));
  const problemChangeDoc = asOpenApiDoc(createProblemChangeOpenApi("http://problem-change"));
  const integrationDoc = asOpenApiDoc(createIntegrationOpenApi("http://integration"));

  assert(identityDoc.openapi?.startsWith("3."), "[identity-service] invalid OpenAPI version");
  assert(requestDoc.openapi?.startsWith("3."), "[request-service] invalid OpenAPI version");
  assert(problemChangeDoc.openapi?.startsWith("3."), "[problem-change-service] invalid OpenAPI version");
  assert(integrationDoc.openapi?.startsWith("3."), "[integration-service] invalid OpenAPI version");

  assertOperation("identity-service", identityDoc, "/api/auth/login", "post", ["200", "401"]);
  assertOperation("request-service", requestDoc, "/api/service-requests", "post", ["201", "400"]);
  assertOperation("problem-change-service", problemChangeDoc, "/api/problems/{id}/versions", "get", ["200", "404"]);
  assertOperation("integration-service", integrationDoc, "/api/outbound/v1/deliver", "post", ["202", "401"]);
  assertOperation("integration-service", integrationDoc, "/api/integration-dlq/{id}/reprocess", "post", [
    "202",
    "404",
    "409",
  ]);

  console.log("OpenAPI contract checks passed.");
}

main();
