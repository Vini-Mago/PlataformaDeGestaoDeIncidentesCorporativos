import jwt from "jsonwebtoken";
import type { IIntegrationLogRepository } from "../ports/integration-log-repository.port";

export interface GetIntegrationIncidentInput {
  id?: string;
  externalId?: string;
  source?: string;
  correlationId?: string;
}

export class GetIntegrationIncidentUseCase {
  constructor(
    private readonly integrationLogRepository: IIntegrationLogRepository,
    private readonly jwtSecret: string,
    private readonly incidentServiceUrl: string
  ) {}

  async execute(input: GetIntegrationIncidentInput) {
    const token = jwt.sign(
      {
        sub: "integration-service",
        email: "integration-service@pgic.internal",
        role: "admin",
      },
      this.jwtSecret,
      { expiresIn: "5m" }
    );

    let url = "";
    let logEndpoint = "";
    let externalIdValue = input.id ?? input.externalId ?? null;

    if (input.id) {
      url = `${this.incidentServiceUrl}/api/incidents/${input.id}`;
      logEndpoint = `/api/webhooks/v1/incidents/${input.id}`;
    } else if (input.externalId) {
      const source = input.source ?? "monitoring";
      url = `${this.incidentServiceUrl}/api/incidents?externalId=${input.externalId}&externalSource=${source}`;
      logEndpoint = `/api/webhooks/v1/incidents/external/${input.externalId}`;
    } else {
      throw new Error("Either id or externalId must be provided");
    }

    const startTime = Date.now();
    let httpStatus: number | null = null;
    let errorMessage: string | null = null;
    let resultPayload: any = null;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      httpStatus = response.status;

      if (!response.ok) {
        const text = await response.text();
        errorMessage = `Incident service returned status ${response.status}: ${text}`;
        throw new Error(errorMessage);
      }

      const body = await response.json();
      if (input.externalId) {
        // Querying list, body is an array
        const list = body as any[];
        if (list.length === 0) {
          httpStatus = 404;
          errorMessage = `Incident not found with externalId: ${input.externalId}`;
          throw new Error(errorMessage);
        }
        resultPayload = list[0];
      } else {
        resultPayload = body;
      }

      return resultPayload;
    } catch (err: any) {
      errorMessage = errorMessage ?? err.message;
      throw err;
    } finally {
      const durationMs = Date.now() - startTime;
      await this.integrationLogRepository.create({
        direction: "inbound",
        endpoint: logEndpoint,
        httpStatus: httpStatus,
        correlationId: input.correlationId ?? null,
        externalId: externalIdValue,
        payloadSummary: resultPayload ? { id: resultPayload.id, status: resultPayload.status } : null,
        errorMessage: errorMessage,
        durationMs,
      }).catch((logErr) => {
        console.error("Failed to write integration log", logErr);
      });
    }
  }
}
