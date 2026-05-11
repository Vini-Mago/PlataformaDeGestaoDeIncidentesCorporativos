/**
 * Restringe aprovação/rejeição ao papel JWT quando o catálogo define `approverRoleIds`.
 * Administrador (`role === admin`) ignora a lista.
 */
export function canApproveWithCatalogRoles(params: {
  userRole: string | undefined;
  isAdminRole: boolean;
  approverRoleIds: string[];
}): boolean {
  if (params.isAdminRole) return true;
  if (params.approverRoleIds.length === 0) return true;
  const role = params.userRole ?? "";
  return params.approverRoleIds.includes(role);
}
