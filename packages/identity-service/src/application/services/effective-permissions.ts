import type { IAuthorizationRepository } from "../ports/authorization-repository.port";

function permissionKey(permission: { module: string; action: string; scope: string }): string {
  return `${permission.module}:${permission.action}:${permission.scope}`;
}

/**
 * Resolve chaves efetivas `module:action:scope` (papel + overrides), igual à lógica do middleware RBAC.
 */
export async function resolveEffectivePermissionKeys(
  authorizationRepository: IAuthorizationRepository,
  userId: string,
  roleName: string
): Promise<string[]> {
  const rolePermissions = await authorizationRepository.getRolePermissions(roleName ?? "user");
  const effective = new Set(rolePermissions.map(permissionKey));

  const overrides = await authorizationRepository.getUserPermissionOverrides(userId);
  if (overrides.length > 0) {
    const overridePermissions = await authorizationRepository.getPermissionsByIds(
      overrides.map((o) => o.permissionId)
    );
    const byId = new Map(overridePermissions.map((p) => [p.id, p]));
    for (const override of overrides) {
      const permission = byId.get(override.permissionId);
      if (!permission) continue;
      const key = permissionKey(permission);
      if (override.granted) {
        effective.add(key);
      } else {
        effective.delete(key);
      }
    }
  }

  return [...effective];
}
