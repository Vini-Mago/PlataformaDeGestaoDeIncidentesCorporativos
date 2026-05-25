import {
  REQUEST_APPROVED_EVENT,
  REQUEST_COMPLETED_EVENT,
  REQUEST_CREATED_EVENT,
  REQUEST_DOMAIN_EVENT_NAMES,
  REQUEST_IN_APPROVAL_EVENT,
  REQUEST_REJECTED_EVENT,
  REQUEST_STARTED_EVENT,
  REQUEST_SUBMITTED_EVENT,
  requestDomainEventPayloadSchema,
  type RequestDomainEventPayload,
} from "@pgic/shared";
import { CreateNotificationUseCase } from "./create-notification.use-case";

const handled = new Set<string>(REQUEST_DOMAIN_EVENT_NAMES);

function notificationCopy(
  eventType: string,
  p: RequestDomainEventPayload
): { subject: string; body: string } {
  const shortId = p.serviceRequestId.slice(0, 8);
  switch (eventType) {
    case REQUEST_CREATED_EVENT:
      return {
        subject: "Requisição de serviço criada",
        body: `Rascunho ${shortId}… — edite e submeta quando estiver pronto.`,
      };
    case REQUEST_SUBMITTED_EVENT:
      return {
        subject: "Requisição submetida",
        body: `A requisição ${shortId}… foi enviada para processamento.`,
      };
    case REQUEST_IN_APPROVAL_EVENT:
      return {
        subject: "Requisição em aprovação",
        body: `A requisição ${shortId}… aguarda aprovação.`,
      };
    case REQUEST_APPROVED_EVENT:
      return {
        subject: "Requisição aprovada",
        body: `A requisição ${shortId}… foi aprovada.`,
      };
    case REQUEST_REJECTED_EVENT: {
      const reason = p.reason ? ` Motivo: ${p.reason}` : "";
      return {
        subject: "Requisição rejeitada",
        body: `A requisição ${shortId}… foi rejeitada.${reason}`,
      };
    }
    case REQUEST_STARTED_EVENT:
      return {
        subject: "Atendimento iniciado",
        body: `O atendimento da requisição ${shortId}… foi iniciado.`,
      };
    case REQUEST_COMPLETED_EVENT:
      return {
        subject: "Requisição concluída",
        body: `A requisição ${shortId}… foi concluída.`,
      };
    default:
      return {
        subject: "Atualização de requisição",
        body: `Evento ${eventType} para a requisição ${shortId}….`,
      };
  }
}

export class HandleRequestDomainEventUseCase {
  constructor(private readonly createNotification: CreateNotificationUseCase) {}

  handlesEventType(eventType: string): boolean {
    return handled.has(eventType);
  }

  async execute(eventType: string, payload: unknown): Promise<{ ok: true } | { ok: false }> {
    if (!handled.has(eventType)) {
      return { ok: false };
    }
    const parsed = requestDomainEventPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false };
    }
    const p = parsed.data;
    const { subject, body } = notificationCopy(eventType, p);
    await this.createNotification.execute({
      type: "in_app",
      recipient: p.requesterId,
      subject,
      body,
    });
    return { ok: true };
  }
}
