import { IncidentNotFoundError } from "../errors";
import type {
  AddIncidentAttachmentInput,
  IIncidentRepository,
} from "../ports/incident-repository.port";

export class AddIncidentAttachmentUseCase {
  constructor(private readonly incidentRepository: IIncidentRepository) {}

  async execute(input: AddIncidentAttachmentInput) {
    const incident = await this.incidentRepository.findById(input.incidentId);
    if (!incident) throw new IncidentNotFoundError(input.incidentId);
    return this.incidentRepository.addAttachment(input);
  }
}
