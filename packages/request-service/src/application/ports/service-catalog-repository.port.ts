import type { ServiceCatalogItem } from "../../domain/entities/service-catalog-item.entity";

export interface CreateCatalogItemData {
  name: string;
  description?: string | null;
  category?: string | null;
  responsibleTeamId?: string | null;
  defaultSlaHours?: number | null;
  formSchema?: Record<string, unknown> | null;
  approvalFlow?: "none" | "single" | "sequential" | "parallel";
  approverRoleIds?: string[];
}

export interface IServiceCatalogRepository {
  create(data: CreateCatalogItemData): Promise<ServiceCatalogItem>;
  findById(id: string): Promise<ServiceCatalogItem | null>;
  listActive(): Promise<ServiceCatalogItem[]>;
}
