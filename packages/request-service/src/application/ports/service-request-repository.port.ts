import type {
  ServiceRequest,
  ServiceRequestComment,
  ServiceRequestStatus,
  ServiceRequestWorkflowEvent,
} from "../../domain/entities/service-request.entity";

export interface CreateServiceRequestData {
  catalogItemId: string;
  requesterId: string;
  formData?: Record<string, unknown> | null;
}

export interface ListServiceRequestsFilter {
  requesterId?: string;
  status?: ServiceRequestStatus;
  catalogItemId?: string;
}

export interface TransitionServiceRequestParams {
  actorId: string;
  allowedFromStatuses: ServiceRequestStatus[];
  toStatus: ServiceRequestStatus;
  reason?: string | null;
  submittedAt?: Date;
  completedAt?: Date;
}

export interface IServiceRequestRepository {
  create(data: CreateServiceRequestData): Promise<ServiceRequest>;
  findById(id: string): Promise<ServiceRequest | null>;
  list(filter: ListServiceRequestsFilter): Promise<ServiceRequest[]>;
  transition(id: string, params: TransitionServiceRequestParams): Promise<ServiceRequest>;
  getWorkflowEvents(requestId: string): Promise<ServiceRequestWorkflowEvent[]>;
  addComment(requestId: string, authorId: string, body: string): Promise<ServiceRequestComment>;
  getComments(requestId: string): Promise<ServiceRequestComment[]>;
}
