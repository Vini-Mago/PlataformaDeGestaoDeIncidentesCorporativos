import { PrismaClient as IncidentPrismaClient } from "../../../../../incident-service/generated/prisma-client";
import type { IIncidentProvider } from "../../../application/ports/incident-provider.port";
import type { IncidentData } from "../../../domain/services/executive-kpi-calculator";

export class PrismaIncidentProvider implements IIncidentProvider {
  private readonly prisma: IncidentPrismaClient;

  constructor(incidentDatabaseUrl: string) {
    this.prisma = new IncidentPrismaClient({
      datasources: {
        db: {
          url: incidentDatabaseUrl,
        },
      },
    });
  }

  async fetchIncidents(): Promise<IncidentData[]> {
    const list = await this.prisma.incidentModel.findMany({
      select: {
        createdAt: true,
        resolvedAt: true,
        serviceAffected: true,
        assignedTeamId: true,
        criticality: true,
      },
    });

    return list.map((item) => ({
      createdAt: item.createdAt,
      resolvedAt: item.resolvedAt,
      serviceAffected: item.serviceAffected,
      assignedTeamId: item.assignedTeamId,
      criticality: item.criticality,
    }));
  }

  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}
