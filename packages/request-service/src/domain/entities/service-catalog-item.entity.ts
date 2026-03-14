/**
 * Service catalog item (RF-6.1): a standard service users can request (e.g. access to system, user creation).
 */
export interface ServiceCatalogItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  responsibleTeamId: string | null;
  defaultSlaHours: number | null;
  formSchema: Record<string, unknown> | null;
  approvalFlow: "none" | "single" | "sequential" | "parallel";
  approverRoleIds: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
