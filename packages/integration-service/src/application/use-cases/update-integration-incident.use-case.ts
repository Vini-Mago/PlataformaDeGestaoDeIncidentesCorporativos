import jwt from "jsonwebtoken";
import type { IIntegrationLogRepository } from "../ports/integration-log-repository.port";

export interface UpdateIntegrationIncidentInput {
  id?: string;
  externalId?: string;
  source?: string;
  status: string;
  comment?: string;
  correlationId?: string;
}

export class UpdateIntegrationIncidentUseCase {
  constructor(
    private readonly integrationLogRepository: IIntegrationLogRepository,
    private readonly jwtSecret: string,
    private readonly incidentServiceUrl: string
  ) {}

  async execute(input: UpdateIntegrationIncidentInput) {
    const token = jwt.sign(
      {
        sub: "integration-service",
        email: "integration-service@pgic.internal",
        role: "admin",
      },
      this.jwtSecret,
      { expiresIn: "5m" }
    );

    let id = input.id;
    const source = input.source ?? "monitoring";
    let logEndpoint = input.id
      ? `/api/webhooks/v1/incidents/${input.id}`
      : `/api/webhooks/v1/incidents/external/${input.externalId}`;

    const startTime = Date.now();
    let httpStatus: number | null = null;
    let errorMessage: string | null = null;
    let resultPayload: any = null;

    try {
      // 1. Resolve ID if externalId was provided
      if (!id) {
        if (!input.externalId) {
          throw new Error("Either id or externalId must be provided");
        }

        const resolveUrl = `${this.incidentServiceUrl}/api/incidents?externalId=${input.externalId}&externalSource=${source}`;
        const resolveResponse = await fetch(resolveUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!resolveResponse.ok) {
          const text = await resolveResponse.text();
          throw new Error(`Failed to resolve external ID: ${text}`);
        }

        const list = (await resolveResponse.json()) as any[];
        if (list.length === 0) {
          httpStatus = 404;
          errorMessage = `Incident not found with externalId: ${input.externalId}`;
          throw new Error(errorMessage);
        }
        id = list[0].id;
      }

      // 2. Perform the status update patch request to incident-service
      const patchUrl = `${this.incidentServiceUrl}/api/incidents/${id}/status`;
      const response = await fetch(patchUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          toStatus: input.status,
          comment: input.comment ?? null,
        }),
      });

      httpStatus = response.status;

      if (!response.ok) {
        const text = await response.text();
        errorMessage = `Failed to update status on incident-service: ${text}`;
        throw new Error(errorMessage);
      }

      resultPayload = await response.json();
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
        externalId: input.id ?? input.externalId ?? null,
        payloadSummary: { status: input.status },
        errorMessage: errorMessage,
        durationMs,
      }).catch((logErr) => {
        console.error("Failed to write integration log", logErr);
      });
    }
  }
}
