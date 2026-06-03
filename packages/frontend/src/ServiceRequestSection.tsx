import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError } from "./auth";
import { useAuth } from "./auth-context";
import {
  approveServiceRequest,
  completeServiceRequest,
  createServiceRequest,
  fetchCatalogItems,
  fetchServiceRequestById,
  fetchServiceRequests,
  rejectServiceRequest,
  sendServiceRequestForApproval,
  startServiceRequest,
  submitServiceRequest,
  type CatalogItemSummary,
  type ServiceRequestDetail,
  type ServiceRequestListItem,
} from "./api/service-requests";

function mapLoadError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) {
      return "Sem permissão para listar pedidos. Peça ao administrador o papel adequado ou faça login novamente.";
    }
    if (err.status === 401) {
      return "Sessão expirada ou não autenticado.";
    }
    return err.message;
  }
  return "Não foi possível carregar os pedidos de serviço.";
}

function mapCatalogError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return "Sessão expirada.";
    }
    return err.message;
  }
  return "Não foi possível carregar o catálogo.";
}

function mapActionError(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  return "Operação falhou.";
}

function shortId(id: string): string {
  if (id.length <= 12) {
    return id;
  }
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function hasApproveJwtRole(role: string | undefined): boolean {
  if (!role) return false;
  return role === "admin" || role === "gestor" || role === "analista";
}

function hasFulfillJwtRole(role: string | undefined): boolean {
  if (!role) return false;
  return role === "admin" || role === "analista";
}

function canShowApproveButtons(
  userRole: string | undefined,
  r: ServiceRequestListItem,
  cat: CatalogItemSummary | undefined
): boolean {
  if (userRole === "admin") return true;
  if (r.status !== "InApproval") return false;
  if (!cat) return false;
  if (!hasApproveJwtRole(userRole)) return false;

  const flow = cat.approvalFlow || "none";
  const role = userRole ?? "";
  const approverRoleIds = cat.approverRoleIds ?? [];

  if (flow === "single" || flow === "none") {
    if (approverRoleIds.length === 0) return true;
    return approverRoleIds.includes(role);
  }

  if (flow === "sequential") {
    const rawState = r.approvalState;
    let step = 0;
    if (rawState && typeof rawState === "object" && rawState.mode === "sequential" && typeof rawState.step === "number") {
      step = rawState.step;
    }
    const requiredRole = approverRoleIds[step];
    if (!requiredRole) return false;
    return role === requiredRole;
  }

  if (flow === "parallel") {
    if (!approverRoleIds.includes(role)) return false;
    const rawState = r.approvalState;
    let approvedRoles: string[] = [];
    if (rawState && typeof rawState === "object" && rawState.mode === "parallel" && Array.isArray(rawState.roles)) {
      approvedRoles = rawState.roles.filter((val): val is string => typeof val === "string");
    }
    return !approvedRoles.includes(role);
  }

  return false;
}

export function ServiceRequestSection() {
  const { user } = useAuth();
  const userId = user?.id;
  const userRole = user?.role;

  const [catalogItems, setCatalogItems] = useState<CatalogItemSummary[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [rows, setRows] = useState<ServiceRequestListItem[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [catalogItemId, setCatalogItemId] = useState("");
  const [formDataJson, setFormDataJson] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ServiceRequestDetail | null>(null);

  const catalogById = useMemo(() => {
    const m = new Map<string, CatalogItemSummary>();
    catalogItems?.forEach((c) => m.set(c.id, c));
    return m;
  }, [catalogItems]);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);
    void fetchCatalogItems()
      .then((items) => {
        if (!cancelled) {
          setCatalogItems(items);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setCatalogItems(null);
          setCatalogError(mapCatalogError(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    setRows(null);
    try {
      const list = await fetchServiceRequests();
      setRows(list);
    } catch (err) {
      setRows(null);
      setListError(mapLoadError(err));
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const runRowAction = useCallback(
    async (id: string, fn: () => Promise<ServiceRequestListItem>) => {
      setActionMessage(null);
      setActionBusyId(id);
      try {
        await fn();
        setActionMessage({ tone: "ok", text: "Estado atualizado." });
        await loadList();
        if (expandedId === id) {
          setDetailLoading(true);
          setDetailError(null);
          try {
            const d = await fetchServiceRequestById(id);
            setDetail(d);
          } catch (e) {
            setDetail(null);
            setDetailError(mapActionError(e));
          } finally {
            setDetailLoading(false);
          }
        }
      } catch (err) {
        setActionMessage({ tone: "err", text: mapActionError(err) });
      } finally {
        setActionBusyId(null);
      }
    },
    [expandedId, loadList]
  );

  const toggleTrail = useCallback(
    async (id: string) => {
      if (expandedId === id) {
        setExpandedId(null);
        setDetail(null);
        setDetailError(null);
        return;
      }
      setExpandedId(id);
      setDetail(null);
      setDetailError(null);
      setDetailLoading(true);
      try {
        const d = await fetchServiceRequestById(id);
        setDetail(d);
      } catch (e) {
        setDetailError(mapActionError(e));
      } finally {
        setDetailLoading(false);
      }
    },
    [expandedId]
  );

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!catalogItemId) {
      setCreateError("Escolha um item do catálogo.");
      return;
    }

    let formData: Record<string, unknown> | undefined;
    const trimmed = formDataJson.trim();
    if (trimmed) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
          setCreateError("Dados adicionais devem ser um objeto JSON (ex.: {\"chave\":\"valor\"}).");
          return;
        }
        formData = parsed as Record<string, unknown>;
      } catch {
        setCreateError("JSON inválido nos dados adicionais.");
        return;
      }
    }

    const payload: { catalogItemId: string; formData?: Record<string, unknown> } = {
      catalogItemId,
    };
    if (formData !== undefined) {
      payload.formData = formData;
    }

    setCreateLoading(true);
    try {
      await createServiceRequest(payload);
      setFormDataJson("");
      setCatalogItemId("");
      setShowCreate(false);
      await loadList();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setCreateError("Sem permissão para abrir pedidos (requests:create).");
        } else if (err.status === 401) {
          setCreateError("Sessão expirada. Volte a entrar.");
        } else {
          setCreateError(err.message);
        }
      } else {
        setCreateError("Não foi possível criar o pedido.");
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const approvalHint = (catalogItemId: string): string | null => {
    const c = catalogById.get(catalogItemId);
    if (!c?.approvalFlow || c.approvalFlow === "none") {
      return null;
    }
    return "Este serviço pede aprovação após submissão.";
  };

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const cat = catalogById.get(r.catalogItemId);
        const catName = cat?.name.toLowerCase() || "";
        return catName.includes(query) || r.id.toLowerCase().includes(query);
      }
      return true;
    });
  }, [rows, searchQuery, statusFilter, catalogById]);

  const stats = useMemo(() => {
    if (!rows) return { total: 0, pending: 0, active: 0 };
    return {
      total: rows.length,
      pending: rows.filter((r) => r.status === "InApproval" || r.status === "Submitted").length,
      active: rows.filter((r) => r.status === "InProgress" || r.status === "Approved").length,
    };
  }, [rows]);

  return (
    <div className="content-stack" style={{ padding: 0 }}>
      {/* Top Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <article className="stat-card">
          <span>Total de Requisições</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="stat-card">
          <span>Aguardando Ação / Aprovação</span>
          <strong style={{ color: stats.pending > 0 ? "var(--warning)" : "inherit" }}>{stats.pending}</strong>
        </article>
        <article className="stat-card">
          <span>Em Atendimento (Aprovadas)</span>
          <strong style={{ color: "var(--success)" }}>{stats.active}</strong>
        </article>
      </div>

      {/* Toolbar / Actions */}
      <div style={{ display: "flex", gap: "1rem", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "1rem", flex: 1, minWidth: "300px" }}>
          <label style={{ flex: 1 }}>
            Buscar Requisição
            <input 
              type="search" 
              placeholder="Serviço ou ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <label style={{ minWidth: "200px" }}>
            Status
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Todos</option>
              <option value="Draft">Rascunho (Draft)</option>
              <option value="Submitted">Submetido</option>
              <option value="InApproval">Em Aprovação</option>
              <option value="Approved">Aprovado</option>
              <option value="Rejected">Rejeitado</option>
              <option value="InProgress">Em Progresso</option>
              <option value="Completed">Concluído</option>
            </select>
          </label>
        </div>
        
        <div style={{ display: "flex", gap: "1rem", height: "fit-content" }}>
          <button type="button" onClick={() => setShowCreate(true)}>
            Nova Requisição
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Nova requisição de serviço</h3>
              <button type="button" className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <p className="hint" style={{ padding: 0, marginBottom: "1rem" }}>
              Escolha um item ativo do catálogo e crie um pedido em rascunho.
            </p>
            {catalogError ? <div className="banner-error">{catalogError}</div> : null}
            {catalogLoading ? <p className="hint">A carregar catálogo…</p> : null}
            {!catalogLoading && catalogItems !== null && catalogItems.length === 0 && !catalogError ? (
              <p className="hint">Não há itens no catálogo. Um administrador deve registar serviços primeiro.</p>
            ) : null}
            {createError ? <div className="banner-error">{createError}</div> : null}
            <form className="form" onSubmit={(ev) => void handleCreate(ev)}>
              <label>
                Serviço do catálogo
                <select
                  value={catalogItemId}
                  onChange={(ev) => setCatalogItemId(ev.target.value)}
                  disabled={createLoading || catalogLoading || !catalogItems?.length}
                  required
                >
                  <option value="">— Escolha —</option>
                  {(catalogItems ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.category ? ` (${c.category})` : ""}
                      {c.approvalFlow && c.approvalFlow !== "none" ? " — com aprovação" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {catalogItemId ? (
                <p className="hint" style={{ marginTop: "-0.5rem" }}>
                  {approvalHint(catalogItemId) ?? "Fluxo sem fila de aprovação no catálogo: após submeter, «Enviar para aprovação» passa direto a aprovado."}
                </p>
              ) : null}
              <label>
                Informações Adicionais <span className="hint" style={{display:'inline', padding:0}}>(Opcional)</span>
                <textarea
                  value={formDataJson}
                  onChange={(ev) => setFormDataJson(ev.target.value)}
                  rows={4}
                  placeholder='Ex: {"motivo":"nova conta"}'
                  disabled={createLoading}
                />
              </label>
              <div className="actions" style={{ justifyContent: "flex-end", marginTop: "1.5rem" }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)} disabled={createLoading || catalogLoading}>
                  Cancelar
                </button>
                <button type="submit" disabled={createLoading || catalogLoading || !catalogItems?.length}>
                  {createLoading ? "A registar…" : "Criar pedido"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="panel">
        <div className="section-head">
          <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Tabela de Requisições</h3>
          <button type="button" className="btn-secondary" disabled={listLoading} onClick={() => void loadList()}>
            {listLoading ? "A atualizar…" : "Atualizar lista"}
          </button>
        </div>
        
        {actionMessage ? (
          <div className={actionMessage.tone === "ok" ? "banner-success" : "banner-error"}>{actionMessage.text}</div>
        ) : null}
        {listError ? <div className="banner-error">{listError}</div> : null}
        
        {listLoading ? <p style={{ padding: "2rem", textAlign: "center" }}>A carregar pedidos…</p> : null}
        
        {!listLoading && filteredRows.length === 0 && rows?.length !== 0 ? (
          <p className="hint" style={{ padding: "2rem", textAlign: "center" }}>Nenhuma requisição encontrada para este filtro.</p>
        ) : null}

        {!listLoading && rows !== null && rows.length === 0 && !listError ? (
          <p className="hint" style={{ padding: "2rem", textAlign: "center" }}>Nenhum pedido de serviço registado no sistema.</p>
        ) : null}

        {!listLoading && filteredRows.length > 0 ? (
          <div className="table-wrap">
            <table className="incidents" style={{ minWidth: "1000px" }}>
              <thead>
                <tr>
                  <th>ID / Serviço</th>
                  <th>Estado</th>
                  <th>Requisitante</th>
                  <th>Criado em</th>
                  <th>Ações do Ciclo de Vida</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => {
                  const cat = catalogById.get(r.catalogItemId);
                  const isRequester = Boolean(userId && r.requesterId === userId);
                  const busy = actionBusyId === r.id;
                  const showSubmit = r.status === "Draft" && isRequester;
                  const showSend = r.status === "Submitted" && isRequester;
                  const showApproveReject = canShowApproveButtons(userRole, r, cat);
                  const showStart = r.status === "Approved" && hasFulfillJwtRole(userRole);
                  const showComplete = r.status === "InProgress" && hasFulfillJwtRole(userRole);

                  return (
                    <Fragment key={r.id}>
                      <tr>
                        <td title={r.id}>
                          <strong>{shortId(r.id)}</strong><br/>
                          <span className="hint" style={{ padding: 0 }}>
                            {cat?.name ?? shortId(r.catalogItemId)}
                          </span>
                        </td>
                        <td>
                          <div>
                            <span className={`status-badge status-${r.status.toLowerCase()}`}>
                              {r.status}
                            </span>
                            {r.status === "InApproval" && (
                              <div style={{ fontSize: "0.8rem", color: "var(--text-muted, #6c757d)", marginTop: "0.2rem" }}>
                                {r.approvalState?.mode === "sequential" && (
                                  <>
                                    <span style={{ display: "block" }}>
                                      Passo {((r.approvalState?.step ?? 0) as number) + 1} de {cat?.approverRoleIds?.length ?? 0}
                                    </span>
                                    {cat?.approverRoleIds && cat.approverRoleIds[(r.approvalState?.step ?? 0) as number] && (
                                      <span style={{ display: "block", fontStyle: "italic" }}>
                                        Aguardando: {cat.approverRoleIds[(r.approvalState?.step ?? 0) as number]}
                                      </span>
                                    )}
                                  </>
                                )}
                                {r.approvalState?.mode === "parallel" && (
                                  <>
                                    <span style={{ display: "block" }}>
                                      Aprovados: {Array.isArray(r.approvalState?.roles) ? r.approvalState.roles.length : 0} de {cat?.approverRoleIds ? [...new Set(cat.approverRoleIds)].length : 0}
                                    </span>
                                    {Array.isArray(r.approvalState?.roles) && r.approvalState.roles.length > 0 && (
                                      <span style={{ display: "block", fontStyle: "italic" }}>
                                        Por: {r.approvalState.roles.join(", ")}
                                      </span>
                                    )}
                                    {cat?.approverRoleIds && (
                                      <span style={{ display: "block", fontStyle: "italic" }}>
                                        Restantes: {[...new Set(cat.approverRoleIds)]
                                          .filter((role) => !Array.isArray(r.approvalState?.roles) || !r.approvalState.roles.includes(role))
                                          .join(", ")}
                                      </span>
                                    )}
                                  </>
                                )}
                                {(!r.approvalState || r.approvalState.mode === "single") && cat?.approverRoleIds && cat.approverRoleIds.length > 0 && (
                                  <span style={{ display: "block", fontStyle: "italic" }}>
                                    Aguardando: {cat.approverRoleIds.join(", ")}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td title={r.requesterId}>{shortId(r.requesterId)}</td>
                        <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
                              disabled={busy}
                              onClick={() => void toggleTrail(r.id)}
                            >
                              {expandedId === r.id ? "Ocultar Histórico" : "Ver Detalhes"}
                            </button>
                            {showSubmit ? (
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
                                disabled={busy}
                                onClick={() => void runRowAction(r.id, () => submitServiceRequest(r.id))}
                              >
                                Submeter
                              </button>
                            ) : null}
                            {showSend ? (
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
                                disabled={busy}
                                onClick={() => void runRowAction(r.id, () => sendServiceRequestForApproval(r.id))}
                              >
                                Enviar p/ aprovação
                              </button>
                            ) : null}
                            {showApproveReject ? (
                              <>
                                <button
                                  type="button"
                                  style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem", background: "var(--success-color)" }}
                                  disabled={busy}
                                  onClick={() => void runRowAction(r.id, () => approveServiceRequest(r.id))}
                                >
                                  Aprovar
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem", color: "var(--danger-color)" }}
                                  disabled={busy}
                                  onClick={() => {
                                    const reason = window.prompt("Motivo da rejeição (opcional):") ?? "";
                                    void runRowAction(r.id, () =>
                                      rejectServiceRequest(r.id, { reason: reason.trim() || undefined })
                                    );
                                  }}
                                >
                                  Rejeitar
                                </button>
                              </>
                            ) : null}
                            {showStart ? (
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
                                disabled={busy}
                                onClick={() => void runRowAction(r.id, () => startServiceRequest(r.id))}
                              >
                                Iniciar Serviço
                              </button>
                            ) : null}
                            {showComplete ? (
                              <button
                                type="button"
                                style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem", background: "var(--primary-color)" }}
                                disabled={busy}
                                onClick={() => void runRowAction(r.id, () => completeServiceRequest(r.id))}
                              >
                                Concluir
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {expandedId === r.id ? (
                        <tr>
                          <td colSpan={5} style={{ background: "var(--panel-alt, #f8f9fa)", verticalAlign: "top", borderBottom: "1px solid var(--border-color)" }}>
                            {detailLoading ? <p className="hint">A carregar histórico…</p> : null}
                            {detailError ? <div className="banner-error">{detailError}</div> : null}
                            {!detailLoading && detail && detail.id === r.id ? (
                              <div style={{ padding: "0.5rem 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
                                <div>
                                  <p style={{ marginTop: 0, fontWeight: 600 }}>Histórico de Transições</p>
                                  {detail.workflowEvents.length === 0 ? (
                                    <p className="hint">Sem eventos registados.</p>
                                  ) : (
                                    <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.9rem" }}>
                                      {detail.workflowEvents.map((e) => (
                                        <li key={e.id} style={{ marginBottom: "0.35rem" }}>
                                          <strong>{e.fromStatus}</strong> → <strong>{e.toStatus}</strong><br/>
                                          <span className="hint" style={{ padding: 0 }}>
                                            Agente: {shortId(e.actorId)} — {new Date(e.createdAt).toLocaleString()}
                                            {e.reason ? ` — ${e.reason}` : ""}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                                
                                <div>
                                  {cat?.approvalFlow && cat.approvalFlow !== "none" && detail.status !== "Draft" && detail.status !== "Submitted" ? (
                                    <>
                                      <p style={{ fontWeight: 600, marginTop: 0 }}>Situação de Aprovações</p>
                                      {(!cat.approverRoleIds || cat.approverRoleIds.length === 0) ? (
                                        <p className="hint">Qualquer administrador ou analista/gestor pode aprovar.</p>
                                      ) : (
                                        <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: "0.9rem" }}>
                                          {cat.approverRoleIds.map((rRole, idx) => {
                                             let state = "⏳ Aguardando";
                                             if (detail.status === "Approved" || detail.status === "InProgress" || detail.status === "Completed") state = "✅ Aprovado";
                                             else if (detail.status === "Rejected") state = "❌ Rejeitado";
                                             else if (cat.approvalFlow === "sequential") {
                                               const step = detail.approvalState?.mode === "sequential" ? (detail.approvalState.step as number) : 0;
                                               if (idx < step) state = "✅ Aprovado";
                                               else if (idx === step) state = "⏳ Aguardando";
                                               else state = "⏸️ Pendente";
                                             } else if (cat.approvalFlow === "parallel") {
                                               const approvedRoles = (detail.approvalState?.mode === "parallel" && Array.isArray(detail.approvalState.roles)) ? detail.approvalState.roles : [];
                                               if (approvedRoles.includes(rRole)) state = "✅ Aprovado";
                                             }
                                             return (
                                               <li key={idx} style={{ marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                 <span style={{ width: "20px", textAlign: "center" }}>{state.slice(0, 2)}</span>
                                                 <strong>{rRole}</strong> 
                                                 <span className="hint">{state.slice(3)}</span>
                                               </li>
                                             );
                                          })}
                                        </ul>
                                      )}
                                    </>
                                  ) : null}

                                  <p style={{ fontWeight: 600, marginTop: "1rem" }}>Comentários da Fila</p>
                                  {detail.comments.length === 0 ? (
                                    <p className="hint">Sem comentários adicionais.</p>
                                  ) : (
                                    <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.9rem" }}>
                                      {detail.comments.map((c) => (
                                        <li key={c.id} style={{ marginBottom: "0.35rem" }}>
                                          <strong>{shortId(c.authorId)}</strong> ({new Date(c.createdAt).toLocaleString()}
                                          ): {c.body}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
