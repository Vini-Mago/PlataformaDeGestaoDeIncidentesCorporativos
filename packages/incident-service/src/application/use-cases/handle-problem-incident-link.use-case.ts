import { logger } from "@pgic/shared";
import { problemIncidentLinkPayloadSchema } from "../dtos/problem-incident-link-payload.schema";
import type { IIncidentRepository } from "../ports/incident-repository.port";

type HandleResult = { ok: boolean; reason?: "invalid_payload" | "incident_not_updated" };
const LOG_CONTEXT = "problem-incident-link-handler";

export class HandleProblemIncidentLinkUseCase {
  constructor(private readonly incidentRepository: IIncidentRepository) {}

  private parse(rawPayload: unknown): { incidentId: string; problemId: string } | null {
    const parsed = problemIncidentLinkPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      logger.warn({ context: LOG_CONTEXT, errors: parsed.error.flatten() }, "invalid payload, skipping");
      return null;
    }
    return { incidentId: parsed.data.incidentId, problemId: parsed.data.problemId };
  }

  private async apply(incidentId: string, problemId: string | null): Promise<HandleResult> {
    try {
      await this.incidentRepository.setProblemLink(incidentId, problemId);
      return { ok: true };
    } catch (err) {
      logger.warn({ context: LOG_CONTEXT, err, incidentId, problemId }, "incident not updated");
      return { ok: false, reason: "incident_not_updated" };
    }
  }

  async link(rawPayload: unknown): Promise<HandleResult> {
    const payload = this.parse(rawPayload);
    if (!payload) return { ok: false, reason: "invalid_payload" };
    return this.apply(payload.incidentId, payload.problemId);
  }

  async unlink(rawPayload: unknown): Promise<HandleResult> {
    const payload = this.parse(rawPayload);
    if (!payload) return { ok: false, reason: "invalid_payload" };
    return this.apply(payload.incidentId, null);
  }
}
