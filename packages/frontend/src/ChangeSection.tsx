import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError } from "./auth";
import {
  fetchChangesList,
  fetchChangeDetail,
  createChange,
  updateChangeRecord,
  linkIncidentToChange,
  unlinkIncidentFromChange,
  linkProblemToChange,
  unlinkProblemFromChange,
  type ChangeDetail,
  type ChangeRecord,
  type UpdateChangePayload,
} from "./api/problem-change";

const CHANGE_STATUSES = [
  "Draft",
  "Submitted",
  "InApproval",
  "Approved",
  "Rejected",
  "Scheduled",
  "InProgress",
  "Completed",
  "Rollback",
] as const;

const CHANGE_TYPES = ["Standard", "Normal", "Emergency"] as const;
const RISKS = ["Low", "Medium", "High"] as const;
const SCHEDULING_EDIT_STATUSES = ["Draft", "Submitted", "InApproval", "Approved", "Scheduled"] as const;
type SchedulingEditableStatus = (typeof SCHEDULING_EDIT_STATUSES)[number];

function isSchedulingEditableStatus(status: string): status is SchedulingEditableStatus {
  return SCHEDULING_EDIT_STATUSES.includes(status as SchedulingEditableStatus);
}

function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(local: string): string | null {
  const t = local.trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function shortId(id: string): string {
  if (!id) return "";
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export function ChangeSection() {
  const [rows, setRows] = useState<ChangeRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<ChangeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createJustification, setCreateJustification] = useState("");
  const [createType, setCreateType] = useState<(typeof CHANGE_TYPES)[number]>("Normal");
  const [createRisk, setCreateRisk] = useState<(typeof RISKS)[number]>("Medium");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const [status, setStatus] = useState<(typeof CHANGE_STATUSES)[number]>("Draft");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [justification, setJustification] = useState("");
  const [changeType, setChangeType] = useState<(typeof CHANGE_TYPES)[number]>("Normal");
  const [risk, setRisk] = useState<(typeof RISKS)[number]>("Medium");
  const [windowStartLocal, setWindowStartLocal] = useState("");
  const [windowEndLocal, setWindowEndLocal] = useState("");
  const [rollbackPlan, setRollbackPlan] = useState("");

  const [incidentLinkInput, setIncidentLinkInput] = useState("");
  const [problemLinkInput, setProblemLinkInput] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    setRows(null);
    try {
      const list = await fetchChangesList();
      setRows(list);
    } catch (err) {
      setRows(null);
      if (err instanceof ApiError && err.status === 403) {
        setHint("Sem permissão para listar mudanças (perfil analista/gestor).");
      } else if (err instanceof ApiError && err.status === 401) {
        setError("Sessão expirada.");
      } else {
        setError("Não foi possível carregar mudanças.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void fetchChangeDetail(selectedId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    const d = detail;
    if (!d) return;
    setStatus((d.status as (typeof CHANGE_STATUSES)[number]) ?? "Draft");
    setTitle(d.title);
    setDescription(d.description);
    setJustification(d.justification);
    setChangeType((d.changeType as (typeof CHANGE_TYPES)[number]) ?? "Normal");
    setRisk((d.risk as (typeof RISKS)[number]) ?? "Medium");
    setWindowStartLocal(isoToDatetimeLocal(d.windowStart));
    setWindowEndLocal(isoToDatetimeLocal(d.windowEnd));
    setRollbackPlan(d.rollbackPlan ?? "");
  }, [detail]);

  const isDraft = detail?.status === "Draft";
  const canEditScheduling = detail ? isSchedulingEditableStatus(detail.status) : false;

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);
    try {
      await createChange({
        title: createTitle.trim(),
        description: createDescription.trim(),
        justification: createJustification.trim(),
        changeType: createType,
        risk: createRisk,
      });
      setShowCreate(false);
      setCreateTitle("");
      setCreateDescription("");
      setCreateJustification("");
      setCreateType("Normal");
      setCreateRisk("Medium");
      await loadList();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Falha ao criar mudança.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenEdit = (r: ChangeRecord) => {
    setSelectedId(r.id);
    setShowEdit(true);
    setSaveError(null);
    setLinkError(null);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedId || !detail) {
      setSaveError("Escolha uma mudança.");
      return;
    }
    setSaveError(null);
    const ws = datetimeLocalToIso(windowStartLocal);
    const we = datetimeLocalToIso(windowEndLocal);
    setSaveLoading(true);
    try {
      const payload: UpdateChangePayload = {
        status,
      };
      if (canEditScheduling) {
        payload.windowStart = ws;
        payload.windowEnd = we;
        payload.rollbackPlan = rollbackPlan.trim() || null;
      }
      if (isDraft) {
        payload.title = title.trim();
        payload.description = description.trim();
        payload.justification = justification.trim();
        payload.changeType = changeType;
        payload.risk = risk;
      }
      await updateChangeRecord(selectedId, payload);
      setShowEdit(false);
      await loadList();
    } catch (err) {
      setSaveError(err instanceof ApiError ? `${err.message} (${err.status})` : "Falha ao guardar mudança.");
    } finally {
      setSaveLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!selectedId) return;
    setDetailLoading(true);
    try {
      const d = await fetchChangeDetail(selectedId);
      setDetail(d);
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLinkIncident = async () => {
    const id = incidentLinkInput.trim();
    if (!id || !selectedId) return;
    setLinkError(null);
    try {
      await linkIncidentToChange(selectedId, id);
      setIncidentLinkInput("");
      await refreshDetail();
    } catch (err) {
      setLinkError(err instanceof ApiError ? err.message : "Erro a vincular.");
    }
  };

  const handleLinkProblem = async () => {
    const id = problemLinkInput.trim();
    if (!id || !selectedId) return;
    setLinkError(null);
    try {
      await linkProblemToChange(selectedId, id);
      setProblemLinkInput("");
      await refreshDetail();
    } catch (err) {
      setLinkError(err instanceof ApiError ? err.message : "Erro a vincular.");
    }
  };

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return r.title.toLowerCase().includes(query) || r.id.toLowerCase().includes(query);
      }
      return true;
    });
  }, [rows, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    if (!rows) return { total: 0, pending: 0, scheduled: 0, active: 0 };
    return {
      total: rows.length,
      pending: rows.filter((r) => r.status === "InApproval" || r.status === "Submitted").length,
      scheduled: rows.filter((r) => r.status === "Scheduled").length,
      active: rows.filter((r) => r.status === "InProgress" || r.status === "Rollback").length,
    };
  }, [rows]);

  return (
    <div className="content-stack" style={{ padding: 0 }}>
      {/* Top Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <article className="stat-card">
          <span>Total de Mudanças</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="stat-card">
          <span>Aguardando Aprovação</span>
          <strong style={{ color: stats.pending > 0 ? "var(--warning)" : "inherit" }}>{stats.pending}</strong>
        </article>
        <article className="stat-card">
          <span>Agendadas</span>
          <strong style={{ color: "var(--info)" }}>{stats.scheduled}</strong>
        </article>
        <article className="stat-card">
          <span>Em Progresso / Rollback</span>
          <strong style={{ color: stats.active > 0 ? "var(--danger-color)" : "inherit" }}>{stats.active}</strong>
        </article>
      </div>

      <div style={{ display: "flex", gap: "1rem", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "1rem", flex: 1, minWidth: "300px" }}>
          <label style={{ flex: 1 }}>
            Buscar Mudança
            <input 
              type="search" 
              placeholder="Título ou ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <label style={{ minWidth: "200px" }}>
            Status
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Todos</option>
              {CHANGE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
        
        <div style={{ display: "flex", gap: "1rem", height: "fit-content" }}>
          <button type="button" onClick={() => setShowCreate(true)}>
            Nova Mudança
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Criar mudança (Rascunho)</h3>
              <button type="button" className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            {createError ? <div className="banner-error">{createError}</div> : null}
            <form className="form" onSubmit={(ev) => void handleCreate(ev)}>
              <label>
                Título
                <input
                  value={createTitle}
                  onChange={(ev) => setCreateTitle(ev.target.value)}
                  required
                  disabled={createLoading}
                />
              </label>
              <div className="form-grid-2">
                <label>
                  Tipo
                  <select
                    value={createType}
                    onChange={(ev) => setCreateType(ev.target.value as (typeof CHANGE_TYPES)[number])}
                    disabled={createLoading}
                  >
                    {CHANGE_TYPES.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Risco
                  <select
                    value={createRisk}
                    onChange={(ev) => setCreateRisk(ev.target.value as (typeof RISKS)[number])}
                    disabled={createLoading}
                  >
                    {RISKS.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Descrição técnica
                <textarea
                  value={createDescription}
                  onChange={(ev) => setCreateDescription(ev.target.value)}
                  rows={4}
                  required
                  disabled={createLoading}
                />
              </label>
              <label>
                Justificação / Impacto
                <textarea
                  value={createJustification}
                  onChange={(ev) => setCreateJustification(ev.target.value)}
                  rows={3}
                  required
                  disabled={createLoading}
                />
              </label>
              <div className="actions" style={{ justifyContent: "flex-end", marginTop: "1.5rem" }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)} disabled={createLoading}>
                  Cancelar
                </button>
                <button type="submit" disabled={createLoading}>
                  {createLoading ? "A criar…" : "Registar rascunho"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEdit && selectedId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Detalhes e Gestão da Mudança</h3>
              <button type="button" className="modal-close" onClick={() => setShowEdit(false)}>×</button>
            </div>
            
            {detailLoading ? (
              <p className="hint">A carregar detalhes…</p>
            ) : detail ? (
              <>
                {saveError ? <div className="banner-error">{saveError}</div> : null}
                <form className="form" onSubmit={(ev) => void handleSave(ev)}>
                  <div className="form-grid-2">
                    <label>
                      ID
                      <input value={selectedId} disabled />
                    </label>
                    <label>
                      Estado
                      <select
                        value={status}
                        onChange={(ev) => setStatus(ev.target.value as (typeof CHANGE_STATUSES)[number])}
                        disabled={saveLoading || !selectedId}
                      >
                        {CHANGE_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <fieldset disabled={saveLoading || !isDraft || !selectedId} style={{ border: "none", padding: 0, margin: 0 }}>
                    <div className="form" style={{ marginTop: "1rem" }}>
                      <label>
                        Título
                        <input value={title} onChange={(ev) => setTitle(ev.target.value)} required />
                      </label>
                      <label>
                        Descrição
                        <textarea value={description} onChange={(ev) => setDescription(ev.target.value)} rows={3} required />
                      </label>
                      <label>
                        Justificação
                        <textarea value={justification} onChange={(ev) => setJustification(ev.target.value)} rows={2} required />
                      </label>
                      <div className="form-grid-2">
                        <label>
                          Tipo de Mudança
                          <select value={changeType} onChange={(ev) => setChangeType(ev.target.value as (typeof CHANGE_TYPES)[number])}>
                            {CHANGE_TYPES.map((x) => (
                              <option key={x} value={x}>
                                {x}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Risco
                          <select value={risk} onChange={(ev) => setRisk(ev.target.value as (typeof RISKS)[number])}>
                            {RISKS.map((x) => (
                              <option key={x} value={x}>
                                {x}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                  </fieldset>

                  <fieldset disabled={saveLoading || !canEditScheduling || !selectedId} style={{ border: "none", padding: 0, margin: 0 }}>
                    <div className="form" style={{ marginTop: "1rem" }}>
                      <div className="form-grid-2">
                        <label>
                          Início da janela (local)
                          <input
                            type="datetime-local"
                            value={windowStartLocal}
                            onChange={(ev) => setWindowStartLocal(ev.target.value)}
                          />
                        </label>
                        <label>
                          Fim da janela (local)
                          <input
                            type="datetime-local"
                            value={windowEndLocal}
                            onChange={(ev) => setWindowEndLocal(ev.target.value)}
                          />
                        </label>
                      </div>
                      <label>
                        Plano de rollback
                        <textarea
                          value={rollbackPlan}
                          onChange={(ev) => setRollbackPlan(ev.target.value)}
                          rows={3}
                        />
                      </label>
                    </div>
                  </fieldset>

                  <div className="actions" style={{ justifyContent: "flex-end", marginTop: "1.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--border-color)" }}>
                    <button type="button" className="btn-secondary" onClick={() => setShowEdit(false)} disabled={saveLoading}>
                      Cancelar
                    </button>
                    <button type="submit" disabled={saveLoading || !selectedId}>
                      {saveLoading ? "A guardar…" : "Guardar Alterações"}
                    </button>
                  </div>
                </form>

                <div style={{ marginTop: "1.5rem" }}>
                  <h4 style={{ fontSize: "1rem", marginBottom: "1rem", marginTop: 0 }}>Vínculos (Motivadores)</h4>
                  {linkError ? <div className="banner-error">{linkError}</div> : null}
                  <div className="form-grid-2">
                    <div>
                      <p className="hint" style={{ margin: 0, marginBottom: "0.5rem" }}>
                        Incidentes vinculados: {detail.linkedIncidentIds.length ? detail.linkedIncidentIds.length : "0"}
                      </p>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
                        <label style={{ flex: "1 1 120px", margin: 0 }}>
                          <input value={incidentLinkInput} onChange={(ev) => setIncidentLinkInput(ev.target.value)} placeholder="Código do Incidente" />
                        </label>
                        <button type="button" className="btn-secondary" onClick={() => void handleLinkIncident()}>
                          Vincular
                        </button>
                      </div>
                      <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0" }}>
                        {detail.linkedIncidentIds.map((iid) => (
                          <li key={iid} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem", background: "var(--bg-body)", padding: "0.25rem 0.5rem", borderRadius: "3px" }}>
                            <code>{shortId(iid)}</code>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: "0.15rem 0.5rem", fontSize: "0.75rem", marginLeft: "auto" }}
                              onClick={() => void unlinkIncidentFromChange(selectedId, iid).then(() => void refreshDetail())}
                            >
                              Remover
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="hint" style={{ margin: 0, marginBottom: "0.5rem" }}>
                        Problemas vinculados: {detail.linkedProblemIds.length ? detail.linkedProblemIds.length : "0"}
                      </p>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
                        <label style={{ flex: "1 1 120px", margin: 0 }}>
                          <input value={problemLinkInput} onChange={(ev) => setProblemLinkInput(ev.target.value)} placeholder="Código do Problema" />
                        </label>
                        <button type="button" className="btn-secondary" onClick={() => void handleLinkProblem()}>
                          Vincular
                        </button>
                      </div>
                      <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0" }}>
                        {detail.linkedProblemIds.map((pid) => (
                          <li key={pid} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem", background: "var(--bg-body)", padding: "0.25rem 0.5rem", borderRadius: "3px" }}>
                            <code>{shortId(pid)}</code>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: "0.15rem 0.5rem", fontSize: "0.75rem", marginLeft: "auto" }}
                              onClick={() => void unlinkProblemFromChange(selectedId, pid).then(() => void refreshDetail())}
                            >
                              Remover
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      <section className="panel">
        <div className="section-head">
          <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Lista de Mudanças</h3>
          <button type="button" className="btn-secondary" disabled={loading} onClick={() => void loadList()}>
            {loading ? "A atualizar…" : "Atualizar"}
          </button>
        </div>
        
        {hint ? <p className="hint">{hint}</p> : null}
        {error ? <div className="banner-error">{error}</div> : null}
        
        {loading ? <p style={{ padding: "2rem", textAlign: "center" }}>A carregar mudanças…</p> : null}
        
        {!loading && filteredRows.length === 0 && rows?.length !== 0 ? (
          <p className="hint" style={{ padding: "2rem", textAlign: "center" }}>Nenhuma mudança encontrada para este filtro.</p>
        ) : null}
        
        {!loading && rows !== null && rows.length === 0 && !error ? (
          <p className="hint" style={{ padding: "2rem", textAlign: "center" }}>Nenhuma mudança registada.</p>
        ) : null}
        
        {!loading && filteredRows.length > 0 ? (
          <div className="table-wrap">
            <table className="incidents" style={{ minWidth: "1000px" }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Título da Mudança</th>
                  <th>Estado</th>
                  <th>Tipo / Risco</th>
                  <th>Janela Agendada</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{shortId(r.id)}</strong></td>
                    <td style={{ maxWidth: "300px" }}>
                      {r.title}
                    </td>
                    <td>
                      <span className={`status-badge status-${r.status.toLowerCase()}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: "block" }}>{r.changeType}</span>
                      <span className="hint" style={{ display: "block", fontSize: "0.8rem", padding: 0 }}>Risco: {r.risk}</span>
                    </td>
                    <td>
                      {r.windowStart ? (
                        <div style={{ fontSize: "0.85rem" }}>
                          <div>{new Date(r.windowStart).toLocaleString()}</div>
                          <div className="hint" style={{ padding: 0 }}>até {r.windowEnd ? new Date(r.windowEnd).toLocaleString() : "?"}</div>
                        </div>
                      ) : (
                        <span className="hint">Não agendada</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: "0.85rem", padding: "0.25rem 0.5rem" }}
                        onClick={() => handleOpenEdit(r)}
                      >
                        Gerir Mudança
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
