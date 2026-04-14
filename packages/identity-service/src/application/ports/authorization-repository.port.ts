export interface PermissionRecord {
  id: string;
  module: string;
  action: string;
  scope: string;
  description: string | null;
}

export interface RoleRecord {
  id: string;
  name: string;
  description: string | null;
}

export interface UserPermissionOverrideRecord {
  permissionId: string;
  granted: boolean;
}

export interface IAuthorizationRepository {
  ensureDefaults(): Promise<void>;
  listRoles(): Promise<RoleRecord[]>;
  listPermissions(): Promise<PermissionRecord[]>;
  getPermissionsByIds(permissionIds: string[]): Promise<PermissionRecord[]>;
  getRolePermissions(roleName: string): Promise<PermissionRecord[]>;
  setRolePermissions(roleName: string, permissionIds: string[]): Promise<void>;
  setUserPermissionOverrides(
    userId: string,
    overrides: Array<{ permissionId: string; granted: boolean }>
  ): Promise<void>;
  getUserPermissionOverrides(userId: string): Promise<UserPermissionOverrideRecord[]>;
}
