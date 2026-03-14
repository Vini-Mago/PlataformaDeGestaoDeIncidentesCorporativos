import { PrismaClient } from "../../../../generated/prisma-client/index.js";
import type { ServiceCatalogItem } from "../../../domain/entities/service-catalog-item.entity.js";
import type {
  IServiceCatalogRepository,
  CreateCatalogItemData,
} from "../../../application/ports/service-catalog-repository.port.js";

export class PrismaServiceCatalogRepository implements IServiceCatalogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateCatalogItemData): Promise<ServiceCatalogItem> {
    const row = await this.prisma.serviceCatalogItemModel.create({
      data: {
        name: data.name,
        description: data.description ?? undefined,
        category: data.category ?? undefined,
        responsibleTeamId: data.responsibleTeamId ?? undefined,
        defaultSlaHours: data.defaultSlaHours ?? undefined,
        formSchema: (data.formSchema ?? undefined) as object | undefined,
        approvalFlow: data.approvalFlow ?? "none",
        approverRoleIds: data.approverRoleIds ?? [],
      },
    });
    return this.toEntity(row);
  }

  async findById(id: string): Promise<ServiceCatalogItem | null> {
    const row = await this.prisma.serviceCatalogItemModel.findUnique({
      where: { id },
    });
    return row ? this.toEntity(row) : null;
  }

  async listActive(): Promise<ServiceCatalogItem[]> {
    const rows = await this.prisma.serviceCatalogItemModel.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => this.toEntity(r));
  }

  private toEntity(row: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    responsibleTeamId: string | null;
    defaultSlaHours: number | null;
    formSchema: unknown;
    approvalFlow: string;
    approverRoleIds: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ServiceCatalogItem {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      responsibleTeamId: row.responsibleTeamId,
      defaultSlaHours: row.defaultSlaHours,
      formSchema: row.formSchema as Record<string, unknown> | null,
      approvalFlow: row.approvalFlow as ServiceCatalogItem["approvalFlow"],
      approverRoleIds: row.approverRoleIds,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
