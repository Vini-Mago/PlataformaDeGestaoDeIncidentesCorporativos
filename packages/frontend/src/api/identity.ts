import { bffFetchJson } from "./http";

export interface User {
  id: string;
  name: string;
  email: string;
  login: string;
  status: "active" | "inactive";
  role: string;
  department?: string | null;
  jobTitle?: string | null;
}

export interface Role {
  name: string;
  description?: string;
  permissionIds: string[];
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  scope: string;
  description?: string;
}

export async function fetchUsers(): Promise<User[]> {
  return bffFetchJson<User[]>("/identity/users");
}

export async function fetchRoles(): Promise<Role[]> {
  const data = await bffFetchJson<{ items: Role[] }>("/identity/roles");
  return data.items;
}

export async function fetchPermissions(): Promise<Permission[]> {
  const data = await bffFetchJson<{ items: Permission[] }>("/identity/permissions");
  return data.items;
}

export async function updateRolePermissions(roleName: string, permissionIds: string[]): Promise<void> {
  await bffFetchJson<void>(`/identity/roles/${encodeURIComponent(roleName)}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permissionIds }),
  });
}

export async function updateUserStatus(userId: string, status: "active" | "inactive"): Promise<void> {
  await bffFetchJson<void>(`/identity/users/${encodeURIComponent(userId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function updateUser(userId: string, data: Partial<User>): Promise<void> {
  await bffFetchJson<void>(`/identity/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
