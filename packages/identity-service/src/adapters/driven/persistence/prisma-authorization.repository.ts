import { randomUUID } from "crypto";
import { PrismaClient } from "../../../../generated/prisma-client";
import type {
  IAuthorizationRepository,
  PermissionRecord,
  RoleRecord,
  UserPermissionOverrideRecord,
} from "../../../application/ports/authorization-repository.port";

type RoleRow = { id: string; name: string; description: string | null };
type PermissionRow = {
  id: string;
  module: string;
  action: string;
  scope: string;
  description: string | null;
};
type RolePermissionRow = { permission: PermissionRow };
type UserPermissionOverrideRow = { permissionId: string; granted: boolean };

type AuthorizationTxLike = {
  roleModel: { upsert: (args: unknown) => Promise<unknown> };
  permissionModel: {
    upsert: (args: unknown) => Promise<unknown>;
    findMany: (args?: unknown) => Promise<unknown[]>;
  };
  rolePermissionModel: {
    upsert: (args: unknown) => Promise<unknown>;
    deleteMany: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<unknown>;
  };
  userPermissionOverrideModel: {
    upsert: (args: unknown) => Promise<unknown>;
  };
};

type PrismaAuthorizationClientLike = {
  roleModel: { findMany: (args: unknown) => Promise<unknown[]> };
  permissionModel: { findMany: (args: unknown) => Promise<unknown[]> };
  rolePermissionModel: { findMany: (args: unknown) => Promise<unknown[]> };
  userPermissionOverrideModel: { findMany: (args: unknown) => Promise<unknown[]> };
  $transaction: {
    <T>(fn: (tx: unknown) => Promise<T>): Promise<T>;
  };
};

type PermissionSeed = {
  module: string;
  action: string;
  scope: string;
  description: string;
};

function key(module: string, action: string, scope: string): string {
  return `${module}:${action}:${scope}`;
}

/** IAM / plataforma (identity-service). */
const IAM_PERMISSIONS: PermissionSeed[] = [
  { module: "users", action: "create", scope: "all", description: "Create users" },
  { module: "users", action: "read", scope: "all", description: "Read users" },
  { module: "users", action: "update", scope: "all", description: "Update users" },
  { module: "users", action: "update", scope: "own", description: "Update own profile" },
  { module: "users", action: "status", scope: "all", description: "Activate/deactivate users" },
  { module: "roles", action: "manage", scope: "all", description: "Manage role permissions" },
  { module: "sessions", action: "manage", scope: "own", description: "Manage own sessions" },
  { module: "sessions", action: "manage", scope: "all", description: "Manage all sessions" },
  { module: "access_logs", action: "read", scope: "all", description: "Read access logs" },
];

/** Domínio ITSM alinhado a RF-2.2 (módulos PGIC). Usado por RBAC e futura enforcement nos microsserviços. */
const ITSM_PERMISSIONS: PermissionSeed[] = [
  { module: "incidents", action: "read", scope: "all", description: "View all incidents" },
  { module: "incidents", action: "read", scope: "own", description: "View own incidents" },
  { module: "incidents", action: "create", scope: "all", description: "Open incidents" },
  { module: "incidents", action: "update", scope: "all", description: "Update any incident" },
  { module: "incidents", action: "update", scope: "own", description: "Update own incident (e.g. comments)" },
  { module: "incidents", action: "assign", scope: "all", description: "Assign or reassign incidents" },
  { module: "requests", action: "read", scope: "all", description: "View all service requests" },
  { module: "requests", action: "read", scope: "own", description: "View own service requests" },
  { module: "requests", action: "create", scope: "all", description: "Submit service requests" },
  { module: "requests", action: "update", scope: "all", description: "Process service requests" },
  { module: "requests", action: "approve", scope: "all", description: "Approve or reject requests" },
  { module: "problems", action: "read", scope: "all", description: "View problems" },
  { module: "problems", action: "create", scope: "all", description: "Create problems" },
  { module: "problems", action: "update", scope: "all", description: "Update problems" },
  { module: "changes", action: "read", scope: "all", description: "View changes" },
  { module: "changes", action: "create", scope: "all", description: "Create changes" },
  { module: "changes", action: "update", scope: "all", description: "Update changes" },
  { module: "changes", action: "approve", scope: "all", description: "Approve changes" },
  { module: "sla", action: "read", scope: "all", description: "View SLA policies and timers" },
  { module: "sla", action: "manage", scope: "all", description: "Manage SLA policies and calendars" },
  { module: "escalation", action: "read", scope: "all", description: "View escalation rules and history" },
  { module: "escalation", action: "manage", scope: "all", description: "Manage escalation rules" },
  { module: "notifications", action: "read", scope: "all", description: "View notification configuration" },
  { module: "notifications", action: "manage", scope: "all", description: "Manage templates and channels" },
  { module: "audit", action: "read", scope: "all", description: "Read domain audit trail" },
  { module: "audit", action: "create", scope: "all", description: "Create audit entries" },
  { module: "reporting", action: "read", scope: "all", description: "View dashboards and KPIs" },
  { module: "reporting", action: "create", scope: "all", description: "Create report definitions" },
  { module: "reporting", action: "export", scope: "all", description: "Export reports (PDF/CSV)" },
  { module: "settings", action: "read", scope: "all", description: "View platform settings" },
  { module: "settings", action: "manage", scope: "all", description: "Manage platform settings" },
];

const DEFAULT_PERMISSIONS: PermissionSeed[] = [...IAM_PERMISSIONS, ...ITSM_PERMISSIONS];

const ITSM_READ_ALL_KEYS = ITSM_PERMISSIONS.filter(
  (p) => p.action === "read" && p.scope === "all"
).map((p) => key(p.module, p.action, p.scope));

const ANALISTA_ITSM_KEYS = ITSM_PERMISSIONS.filter(
  (p) => !(p.module === "settings" && p.action === "manage")
).map((p) => key(p.module, p.action, p.scope));

const DEFAULT_ROLES: Array<{ name: string; description: string }> = [
  { name: "admin", description: "Administrator" },
  { name: "gestor", description: "Manager" },
  { name: "analista", description: "Support analyst" },
  { name: "noc", description: "Network Operations Center" },
  { name: "user", description: "End user" },
];

const ROLE_PERMISSION_KEYS: Record<string, string[]> = {
  admin: DEFAULT_PERMISSIONS.map((p) => key(p.module, p.action, p.scope)),
  gestor: [
    "users:read:all",
    "access_logs:read:all",
    ...ITSM_READ_ALL_KEYS,
    "reporting:export:all",
    "incidents:create:all",
    "incidents:assign:all",
    "requests:create:all",
    "requests:approve:all",
    "changes:approve:all",
  ],
  analista: ["users:read:all", "users:update:own", "sessions:manage:own", ...ANALISTA_ITSM_KEYS],
  noc: [
    "users:read:all",
    "sessions:manage:own",
    key("incidents", "read", "all"),
    key("incidents", "assign", "all"),
    key("incidents", "update", "all"),
    key("requests", "read", "all"),
    key("problems", "read", "all"),
    key("changes", "read", "all"),
    key("sla", "read", "all"),
    key("escalation", "read", "all"),
    key("notifications", "read", "all"),
    key("audit", "read", "all"),
  ],
  user: [
    "users:read:all",
    "users:update:own",
    "sessions:manage:own",
    key("incidents", "read", "own"),
    key("incidents", "create", "all"),
    key("incidents", "update", "own"),
    key("requests", "read", "own"),
    key("requests", "create", "all"),
    key("requests", "update", "own"),
  ],
};

export class PrismaAuthorizationRepository implements IAuthorizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async ensureDefaults(): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction(async (txRaw: unknown) => {
      const tx = txRaw as AuthorizationTxLike;
      for (const role of DEFAULT_ROLES) {
        await tx.roleModel.upsert({
          where: { name: role.name },
          create: { id: randomUUID(), name: role.name, description: role.description, createdAt: now, updatedAt: now },
          update: { description: role.description, updatedAt: now },
        });
      }

      for (const permission of DEFAULT_PERMISSIONS) {
        await tx.permissionModel.upsert({
          where: {
            module_action_scope: {
              module: permission.module,
              action: permission.action,
              scope: permission.scope,
            },
          },
          create: {
            id: randomUUID(),
            module: permission.module,
            action: permission.action,
            scope: permission.scope,
            description: permission.description,
            createdAt: now,
          },
          update: {
            description: permission.description,
          },
        });
      }

      const permissions = (await tx.permissionModel.findMany()) as PermissionRow[];
      const permissionByKey = new Map(permissions.map((p) => [key(p.module, p.action, p.scope), p.id]));

      for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSION_KEYS)) {
        for (const permissionKey of permissionKeys) {
          const permissionId = permissionByKey.get(permissionKey);
          if (!permissionId) continue;
          await tx.rolePermissionModel.upsert({
            where: { roleName_permissionId: { roleName, permissionId } },
            create: { id: randomUUID(), roleName, permissionId, createdAt: now },
            update: {},
          });
        }
      }
    });
  }

  async listRoles(): Promise<RoleRecord[]> {
    const prisma = this.prisma as unknown as PrismaAuthorizationClientLike;
    const rows = await prisma.roleModel.findMany({ orderBy: { name: "asc" } });
    return (rows as RoleRow[]).map((row) => ({ id: row.id, name: row.name, description: row.description }));
  }

  async listPermissions(): Promise<PermissionRecord[]> {
    const prisma = this.prisma as unknown as PrismaAuthorizationClientLike;
    const rows = await prisma.permissionModel.findMany({
      orderBy: [{ module: "asc" }, { action: "asc" }, { scope: "asc" }],
    });
    return (rows as PermissionRow[]).map((row) => ({
      id: row.id,
      module: row.module,
      action: row.action,
      scope: row.scope,
      description: row.description,
    }));
  }

  async getPermissionsByIds(permissionIds: string[]): Promise<PermissionRecord[]> {
    if (permissionIds.length === 0) return [];
    const prisma = this.prisma as unknown as PrismaAuthorizationClientLike;
    const rows = await prisma.permissionModel.findMany({
      where: { id: { in: permissionIds } },
    });
    return (rows as PermissionRow[]).map((row) => ({
      id: row.id,
      module: row.module,
      action: row.action,
      scope: row.scope,
      description: row.description,
    }));
  }

  async getRolePermissions(roleName: string): Promise<PermissionRecord[]> {
    const prisma = this.prisma as unknown as PrismaAuthorizationClientLike;
    const rows = await prisma.rolePermissionModel.findMany({
      where: { roleName },
      include: { permission: true },
    });
    return (rows as RolePermissionRow[]).map((row) => ({
      id: row.permission.id,
      module: row.permission.module,
      action: row.permission.action,
      scope: row.permission.scope,
      description: row.permission.description,
    }));
  }

  async setRolePermissions(roleName: string, permissionIds: string[]): Promise<void> {
    await this.prisma.$transaction(async (txRaw: unknown) => {
      const tx = txRaw as AuthorizationTxLike;
      await tx.rolePermissionModel.deleteMany({ where: { roleName } });
      for (const permissionId of permissionIds) {
        await tx.rolePermissionModel.create({
          data: { id: randomUUID(), roleName, permissionId, createdAt: new Date() },
        });
      }
    });
  }

  async setUserPermissionOverrides(
    userId: string,
    overrides: Array<{ permissionId: string; granted: boolean }>
  ): Promise<void> {
    await this.prisma.$transaction(async (txRaw: unknown) => {
      const tx = txRaw as AuthorizationTxLike;
      for (const override of overrides) {
        await tx.userPermissionOverrideModel.upsert({
          where: { userId_permissionId: { userId, permissionId: override.permissionId } },
          create: {
            id: randomUUID(),
            userId,
            permissionId: override.permissionId,
            granted: override.granted,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          update: {
            granted: override.granted,
            updatedAt: new Date(),
          },
        });
      }
    });
  }

  async getUserPermissionOverrides(userId: string): Promise<UserPermissionOverrideRecord[]> {
    const prisma = this.prisma as unknown as PrismaAuthorizationClientLike;
    const rows = await prisma.userPermissionOverrideModel.findMany({
      where: { userId },
      select: { permissionId: true, granted: true },
    });
    return rows as UserPermissionOverrideRow[];
  }
}
