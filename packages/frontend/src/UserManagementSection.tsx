import { useEffect, useState, useCallback, useMemo } from "react";
import {
  fetchUsers,
  fetchRoles,
  fetchPermissions,
  updateRolePermissions,
  updateUserStatus,
  updateUser,
  type User,
  type Role,
  type Permission,
} from "./api/identity";
import { ApiError } from "./auth";

export function UserManagementSection() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");

  // Users tab state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Roles tab state
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [savingRole, setSavingRole] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, r, p] = await Promise.all([
        fetchUsers(),
        fetchRoles(),
        fetchPermissions(),
      ]);
      setUsers(u);
      setRoles(r);
      setPermissions(p);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 403 ? "Sem permissão para gerir utilizadores e perfis." : err.message);
      } else {
        setError("Não foi possível carregar os dados.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleStatusToggle = async (user: User) => {
    try {
      const newStatus = user.status === "active" ? "inactive" : "active";
      await updateUserStatus(user.id, newStatus);
      setSuccessMessage(`Estado do utilizador ${user.name} alterado com sucesso.`);
      await loadData();
    } catch (err) {
      setError("Falha ao alterar estado do utilizador.");
    }
  };

  const handleRoleChange = async (user: User, newRole: string) => {
    if (user.role === newRole) return;
    try {
      await updateUser(user.id, { role: newRole });
      setSuccessMessage(`Perfil de ${user.name} alterado para ${newRole}.`);
      await loadData();
    } catch (err) {
      setError("Falha ao alterar perfil do utilizador.");
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role.name);
    setSelectedPermissions(new Set(role.permissionIds || []));
  };

  const handleTogglePermission = (permId: string) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(permId)) {
      newSet.delete(permId);
    } else {
      newSet.add(permId);
    }
    setSelectedPermissions(newSet);
  };

  const handleToggleModule = (module: string, modulePermissions: Permission[]) => {
    const newSet = new Set(selectedPermissions);
    const allSelected = modulePermissions.every((p) => newSet.has(p.id));
    if (allSelected) {
      modulePermissions.forEach((p) => newSet.delete(p.id));
    } else {
      modulePermissions.forEach((p) => newSet.add(p.id));
    }
    setSelectedPermissions(newSet);
  };

  const handleSaveRole = async () => {
    if (!editingRole) return;
    setSavingRole(true);
    setError(null);
    try {
      await updateRolePermissions(editingRole, Array.from(selectedPermissions));
      setSuccessMessage(`Permissões do perfil ${editingRole} atualizadas.`);
      setEditingRole(null);
      await loadData();
    } catch (err) {
      setError("Falha ao atualizar permissões do perfil.");
    } finally {
      setSavingRole(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
      }
      return true;
    });
  }, [users, roleFilter, searchQuery]);

  const permissionsByModule = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    for (const p of permissions) {
      if (!groups[p.module]) groups[p.module] = [];
      groups[p.module].push(p);
    }
    return groups;
  }, [permissions]);

  if (loading && users.length === 0) {
    return (
      <div className="content-stack" style={{ padding: 0 }}>
        <p>A carregar gestão de utilizadores...</p>
      </div>
    );
  }

  const activeUsersCount = users.filter((u) => u.status === "active").length;

  return (
    <div className="content-stack" style={{ padding: 0 }}>
      {error ? <div className="banner-error">{error}</div> : null}
      {successMessage ? (
        <div className="banner-success">
          {successMessage}
          <button
            type="button"
            className="btn-secondary"
            style={{ marginLeft: "auto", padding: "0.2rem 0.5rem" }}
            onClick={() => setSuccessMessage(null)}
          >
            x
          </button>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <article className="stat-card">
          <span>Total de Utilizadores</span>
          <strong>{users.length}</strong>
        </article>
        <article className="stat-card">
          <span>Contas Ativas</span>
          <strong>{activeUsersCount}</strong>
        </article>
        <article className="stat-card">
          <span>Perfis Existentes</span>
          <strong>{roles.length}</strong>
        </article>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
        <button
          type="button"
          className={activeTab === "users" ? "" : "btn-secondary"}
          onClick={() => { setActiveTab("users"); setEditingRole(null); }}
        >
          Lista de Utilizadores
        </button>
        <button
          type="button"
          className={activeTab === "roles" ? "" : "btn-secondary"}
          onClick={() => setActiveTab("roles")}
        >
          Gestão de Perfis (RBAC)
        </button>
      </div>

      {activeTab === "users" && (
        <section className="panel">
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={{ flex: 1, minWidth: "200px" }}>
              Buscar Utilizador
              <input 
                type="search" 
                placeholder="Nome ou e-mail..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
            <label style={{ width: "200px" }}>
              Filtrar por Perfil
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="">Todos</option>
                {roles.map((r) => (
                  <option key={r.name} value={r.name}>{r.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="table-wrap">
            <table className="incidents" style={{ minWidth: "800px" }}>
              <thead>
                <tr>
                  <th>Nome & Email</th>
                  <th>Departamento</th>
                  <th>Perfil de Acesso</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong><br/>
                      <small className="hint" style={{ padding: 0 }}>{u.email}</small>
                    </td>
                    <td>
                      {u.department || "—"}<br/>
                      <small className="hint" style={{ padding: 0 }}>{u.jobTitle}</small>
                    </td>
                    <td>
                      <select 
                        value={u.role} 
                        onChange={(e) => void handleRoleChange(u, e.target.value)}
                        style={{ padding: "0.2rem", fontSize: "0.9rem" }}
                      >
                        {roles.map((r) => (
                          <option key={r.name} value={r.name}>{r.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`status-badge status-${u.status === "active" ? "success" : "error"}`}>
                        {u.status === "active" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => void handleStatusToggle(u)}
                        style={{ padding: "0.2rem 0.5rem", fontSize: "0.85rem" }}
                      >
                        {u.status === "active" ? "Desativar Conta" : "Reativar Conta"}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>
                      Nenhum utilizador encontrado para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "roles" && !editingRole && (
        <section className="panel">
          <h3 style={{ marginTop: 0 }}>Hub de Perfis</h3>
          <p className="hint">
            Estes perfis determinam as permissões técnicas aplicadas aos utilizadores.
          </p>
          <div className="table-wrap">
            <table className="incidents">
              <thead>
                <tr>
                  <th>Cargo / Perfil</th>
                  <th>Utilizadores Atribuídos</th>
                  <th>Permissões Técnicas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => {
                  const assignedCount = users.filter((u) => u.role === r.name).length;
                  return (
                    <tr key={r.name}>
                      <td>
                        <strong>{r.name}</strong>
                        {r.description && <p className="hint" style={{ margin: 0, padding: 0 }}>{r.description}</p>}
                      </td>
                      <td>{assignedCount} utilizadores</td>
                      <td>{r.permissionIds?.length || 0} permissões ativas</td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleEditRole(r)}
                        >
                          Configurar Permissões
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "roles" && editingRole && (
        <section className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ marginTop: 0 }}>Editando matriz de acessos: {editingRole}</h3>
              <p className="hint" style={{ padding: 0 }}>
                Ajuste os privilégios granulares associados a este perfil.
              </p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setEditingRole(null)}>
              Voltar aos Perfis
            </button>
          </div>

          <div style={{ display: "grid", gap: "1.5rem", marginTop: "1.5rem" }}>
            {Object.entries(permissionsByModule).map(([module, modulePermissions]) => {
              const allSelected = modulePermissions.every((p) => selectedPermissions.has(p.id));
              
              return (
                <div key={module} style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius)", padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                    <h4 style={{ margin: 0, textTransform: "capitalize" }}>Módulo: {module}</h4>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}
                      onClick={() => handleToggleModule(module, modulePermissions)}
                    >
                      {allSelected ? "Desmarcar Todos" : "Marcar Todos"}
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "0.5rem" }}>
                    {modulePermissions.map((p) => (
                      <label key={p.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontWeight: "normal" }}>
                        <input
                          type="checkbox"
                          style={{ marginTop: "0.2rem" }}
                          checked={selectedPermissions.has(p.id)}
                          onChange={() => handleTogglePermission(p.id)}
                        />
                        <div style={{ lineHeight: 1.2 }}>
                          <strong>{p.action} <span style={{ opacity: 0.6 }}>({p.scope})</span></strong>
                          <br />
                          <small className="hint" style={{ padding: 0 }}>{p.description || "—"}</small>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="actions" style={{ marginTop: "2rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditingRole(null)}
              disabled={savingRole}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSaveRole()}
              disabled={savingRole}
            >
              {savingRole ? "A guardar..." : "Guardar Matriz de Permissões"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
