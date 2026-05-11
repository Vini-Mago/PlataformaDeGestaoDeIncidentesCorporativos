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
  approverRoleIds: string[] | undefined
): boolean {
  if (userRole === "admin") return true;
  if (!hasApproveJwtRole(userRole)) return false;
  const ids = approverRoleIds ?? [];
  if (ids.length === 0) return true;
  return !!userRole && ids.includes(userRole);
}

export function ServiceRequestSection() {
  const { user } = useAuth();
  const userId = user?.id;
  const userRole = user?.role;

  const [catalogItems, setCatalogItems] = useState<CatalogItemSummary[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [rows, setRows] = useState<ServiceRequestListItem[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);

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

  return (
    <>
      <section className="panel">
        <h2 style={{ marginTop: 0, fontSize: "1.25rem" }}>Novo pedido de serviço</h2>
        <p className="hint">
          Escolha um item ativo do catálogo e crie um pedido em rascunho. Depois use <strong>Submeter</strong> e{" "}
          <strong>Enviar para aprovação</strong> na lista (conforme o fluxo do item no catálogo).
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
            Dados adicionais <span className="hint">(JSON opcional)</span>
            <textarea
              value={formDataJson}
              onChange={(ev) => setFormDataJson(ev.target.value)}
              rows={4}
              placeholder='{"motivo":"nova conta"}'
              disabled={createLoading}
            />
          </label>
          <button type="submit" disabled={createLoading || catalogLoading || !catalogItems?.length}>
            {createLoading ? "A registar…" : "Criar pedido"}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Pedidos de serviço</h2>
          <button type="button" className="btn-secondary" disabled={listLoading} onClick={() => void loadList()}>
            {listLoading ? "A atualizar…" : "Atualizar lista"}
          </button>
        </div>
        <p className="hint">
          Ações usam o BFF (<code>/request/…</code>) com a sua sessão. <strong>Submeter / Enviar para aprovação</strong>{" "}
          como requisitante; <strong>Aprovar / Rejeitar</strong> com permissão no servidor; <strong>Iniciar / Concluir</strong>{" "}
          para analistas ou administrador.
        </p>
        {actionMessage ? (
          <div className={actionMessage.tone === "ok" ? "banner-success" : "banner-error"}>{actionMessage.text}</div>
        ) : null}
        {listError ? <div className="banner-error">{listError}</div> : null}
        {listLoading ? <p>A carregar pedidos…</p> : null}
        {!listLoading && rows !== null && rows.length === 0 && !listError ? (
          <p className="hint">Nenhum pedido encontrado.</p>
        ) : null}
        {!listLoading && rows !== null && rows.length > 0 ? (
          <div className="table-wrap">
            <table className="incidents">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Serviço</th>
                  <th>Estado</th>
                  <th>Requisitante</th>
                  <th>Criado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const cat = catalogById.get(r.catalogItemId);
                  const isRequester = Boolean(userId && r.requesterId === userId);
                  const busy = actionBusyId === r.id;
                  const showSubmit = r.status === "Draft" && isRequester;
                  const showSend = r.status === "Submitted" && isRequester;
                  const showApproveReject =
                    r.status === "InApproval" && canShowApproveButtons(userRole, cat?.approverRoleIds);
                  const showStart = r.status === "Approved" && hasFulfillJwtRole(userRole);
                  const showComplete = r.status === "InProgress" && hasFulfillJwtRole(userRole);

                  return (
                    <Fragment key={r.id}>
                      <tr>
                        <td title={r.id}>{shortId(r.id)}</td>
                        <td title={r.catalogItemId}>
                          {cat?.name ?? shortId(r.catalogItemId)}
                          {cat?.approvalFlow && cat.approvalFlow !== "none" ? (
                            <span className="hint" style={{ display: "block", fontSize: "0.8rem" }}>
                              Aprovação: {cat.approvalFlow}
                            </span>
                          ) : null}
                        </td>
                        <td>{r.status}</td>
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
                              {expandedId === r.id ? "Ocultar trilha" : "Trilha"}
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
                                  className="btn-secondary"
                                  style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
                                  disabled={busy}
                                  onClick={() => void runRowAction(r.id, () => approveServiceRequest(r.id))}
                                >
                                  Aprovar
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
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
                                Iniciar
                              </button>
                            ) : null}
                            {showComplete ? (
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
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
                          <td colSpan={6} style={{ background: "var(--panel-alt, #f8f9fa)", verticalAlign: "top" }}>
                            {detailLoading ? <p className="hint">A carregar trilha…</p> : null}
                            {detailError ? <div className="banner-error">{detailError}</div> : null}
                            {!detailLoading && detail && detail.id === r.id ? (
                              <div style={{ padding: "0.5rem 0" }}>
                                <p style={{ marginTop: 0, fontWeight: 600 }}>Eventos de workflow</p>
                                {detail.workflowEvents.length === 0 ? (
                                  <p className="hint">Sem eventos registados.</p>
                                ) : (
                                  <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                                    {detail.workflowEvents.map((e) => (
                                      <li key={e.id} style={{ marginBottom: "0.35rem" }}>
                                        <code>{e.fromStatus}</code> → <code>{e.toStatus}</code> — actor{" "}
                                        <code>{shortId(e.actorId)}</code> — {new Date(e.createdAt).toLocaleString()}
                                        {e.reason ? (
                                          <>
                                            {" "}
                                            — <em>{e.reason}</em>
                                          </>
                                        ) : null}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                <p style={{ fontWeight: 600 }}>Comentários</p>
                                {detail.comments.length === 0 ? (
                                  <p className="hint">Sem comentários.</p>
                                ) : (
                                  <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                                    {detail.comments.map((c) => (
                                      <li key={c.id} style={{ marginBottom: "0.35rem" }}>
                                        <code>{shortId(c.authorId)}</code> ({new Date(c.createdAt).toLocaleString()}
                                        ): {c.body}
                                      </li>
                                    ))}
                                  </ul>
                                )}
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
    </>
  );
}
