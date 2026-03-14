import type {
  ServiceRequest,
  ServiceRequestComment,
  ServiceRequestStatus,
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

export interface IServiceRequestRepository {
  create(data: CreateServiceRequestData): Promise<ServiceRequest>;
  findById(id: string): Promise<ServiceRequest | null>;
  list(filter: ListServiceRequestsFilter): Promise<ServiceRequest[]>;
  updateStatus(id: string, status: ServiceRequestStatus, meta?: { submittedAt?: Date; completedAt?: Date }): Promise<ServiceRequest>;
  addComment(requestId: string, authorId: string, body: string): Promise<ServiceRequestComment>;
  getComments(requestId: string): Promise<ServiceRequestComment[]>;
}
