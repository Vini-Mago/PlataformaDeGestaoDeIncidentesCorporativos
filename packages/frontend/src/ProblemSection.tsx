import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError } from "./auth";
import {
  fetchProblemsList,
  updateProblem,
  type ProblemRecord,
  type UpdateProblemPayload,
} from "./api/problem-change";

const STATUSES = ["Open", "InAnalysis", "Resolved", "Closed"] as const;

export function ProblemSection() {
  const [rows, setRows] = useState<ProblemRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [selectedId, setSelectedId] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [actionPlan, setActionPlan] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("Open");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    setRows(null);
    try {
      const list = await fetchProblemsList();
      setRows(list);
    } catch (err) {
      setRows(null);
      if (err instanceof ApiError && err.status === 403) {
        setHint("Sem permissão para listar problemas (perfil analista/gestor).");
      } else if (err instanceof ApiError && err.status === 401) {
        setError("Sessão expirada.");
      } else {
        setError("Não foi possível carregar problemas.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleOpenEdit = (p: ProblemRecord) => {
    setSelectedId(p.id);
    setRootCause(p.rootCause ?? "");
    setActionPlan(p.actionPlan ?? "");
    setStatus((p.status as (typeof STATUSES)[number]) ?? "Open");
    setShowEdit(true);
    setSaveError(null);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedId) {
      setSaveError("Escolha um problema.");
      return;
    }
    setSaveError(null);
    const payload: UpdateProblemPayload = {
      status,
      rootCause: rootCause.trim() || null,
      actionPlan: actionPlan.trim() || null,
    };
    setSaveLoading(true);
    try {
      await updateProblem(selectedId, payload);
      setShowEdit(false);
      await load();
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? `${err.message} (${err.status})` : "Falha ao guardar (problems:update?)."
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return r.title.toLowerCase().includes(query) || (r.description?.toLowerCase().includes(query));
      }
      return true;
    });
  }, [rows, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    if (!rows) return { total: 0, open: 0, resolved: 0 };
    return {
      total: rows.length,
      open: rows.filter((r) => r.status === "Open" || r.status === "InAnalysis").length,
      resolved: rows.filter((r) => r.status === "Resolved" || r.status === "Closed").length,
    };
  }, [rows]);

  return (
    <div className="content-stack" style={{ padding: 0 }}>
      {/* Top Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <article className="stat-card">
          <span>Total de Problemas</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="stat-card">
          <span>Em Análise / Abertos</span>
          <strong style={{ color: stats.open > 0 ? "var(--warning)" : "inherit" }}>{stats.open}</strong>
        </article>
        <article className="stat-card">
          <span>Resolvidos / Fechados</span>
          <strong style={{ color: "var(--success)" }}>{stats.resolved}</strong>
        </article>
      </div>

      {/* Toolbar / Actions */}
      <div style={{ display: "flex", gap: "1rem", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "1rem", flex: 1, minWidth: "300px" }}>
          <label style={{ flex: 1 }}>
            Buscar Problema
            <input 
              type="search" 
              placeholder="Título ou descrição..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <label style={{ minWidth: "200px" }}>
            Status
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Todos</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
      </div>

      {showEdit && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Editar Problema</h3>
              <button type="button" className="modal-close" onClick={() => setShowEdit(false)}>×</button>
            </div>
            {saveError ? <div className="banner-error">{saveError}</div> : null}
            <form className="form" onSubmit={(ev) => void handleSave(ev)}>
              <div className="form-grid-2">
                <label>
                  Estado
                  <select
                    value={status}
                    onChange={(ev) => setStatus(ev.target.value as (typeof STATUSES)[number])}
                    disabled={saveLoading || !selectedId}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Causa raiz <span className="hint" style={{display:'inline', padding:0}}>(Diagnóstico)</span>
                <textarea
                  value={rootCause}
                  onChange={(ev) => setRootCause(ev.target.value)}
                  rows={4}
                  disabled={saveLoading || !selectedId}
                  placeholder="Descreva a causa raiz encontrada..."
                />
              </label>
              <label>
                Plano de ação <span className="hint" style={{display:'inline', padding:0}}>(Resolução definitiva)</span>
                <textarea
                  value={actionPlan}
                  onChange={(ev) => setActionPlan(ev.target.value)}
                  rows={4}
                  disabled={saveLoading || !selectedId}
                  placeholder="Descreva o plano de ação..."
                />
              </label>
              <div className="actions" style={{ justifyContent: "flex-end", marginTop: "1.5rem" }}>
                <button type="button" className="btn-secondary" onClick={() => setShowEdit(false)} disabled={saveLoading}>
                  Cancelar
                </button>
                <button type="submit" disabled={saveLoading || !selectedId}>
                  {saveLoading ? "A guardar…" : "Guardar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="panel">
        <div className="section-head">
          <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Tabela de Problemas</h3>
          <button type="button" className="btn-secondary" disabled={loading} onClick={() => void load()}>
            {loading ? "A atualizar…" : "Atualizar lista"}
          </button>
        </div>
        
        {hint ? <p className="hint">{hint}</p> : null}
        {error ? <div className="banner-error">{error}</div> : null}
        
        {loading ? <p style={{ padding: "2rem", textAlign: "center" }}>A carregar problemas…</p> : null}
        
        {!loading && filteredRows.length === 0 && rows?.length !== 0 ? (
          <p className="hint" style={{ padding: "2rem", textAlign: "center" }}>Nenhum problema encontrado para este filtro.</p>
        ) : null}

        {!loading && rows !== null && rows.length === 0 && !error ? (
          <p className="hint" style={{ padding: "2rem", textAlign: "center" }}>Nenhum problema registado no sistema.</p>
        ) : null}

        {!loading && filteredRows.length > 0 ? (
          <div className="table-wrap">
            <table className="incidents" style={{ minWidth: "900px" }}>
              <thead>
                <tr>
                  <th>Título / Descrição</th>
                  <th>Estado</th>
                  <th>Causa raiz</th>
                  <th>Plano de Ação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ maxWidth: "300px" }}>
                      <strong>{r.title}</strong><br/>
                      <small className="hint" style={{ padding: 0 }}>
                        {r.description ? `${r.description.slice(0, 100)}${r.description.length > 100 ? "…" : ""}` : "—"}
                      </small>
                    </td>
                    <td>
                      <span className={`status-badge status-${r.status.toLowerCase()}`}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ maxWidth: "200px" }}>
                      <small>
                        {r.rootCause ? `${r.rootCause.slice(0, 80)}${r.rootCause.length > 80 ? "…" : ""}` : <span className="hint">Pendente</span>}
                      </small>
                    </td>
                    <td style={{ maxWidth: "200px" }}>
                      <small>
                        {r.actionPlan ? `${r.actionPlan.slice(0, 80)}${r.actionPlan.length > 80 ? "…" : ""}` : <span className="hint">Pendente</span>}
                      </small>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: "0.85rem", padding: "0.25rem 0.5rem" }}
                        onClick={() => handleOpenEdit(r)}
                      >
                        Investigar / Editar
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
