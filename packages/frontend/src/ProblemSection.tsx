import { useCallback, useEffect, useState, type FormEvent } from "react";
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

  useEffect(() => {
    const p = rows?.find((r) => r.id === selectedId);
    if (p) {
      setRootCause(p.rootCause ?? "");
      setActionPlan(p.actionPlan ?? "");
      setStatus((p.status as (typeof STATUSES)[number]) ?? "Open");
    } else {
      setRootCause("");
      setActionPlan("");
      setStatus("Open");
    }
  }, [selectedId, rows]);

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
      await load();
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? `${err.message} (${err.status})` : "Falha ao guardar (problems:update?)."
      );
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <section className="panel">
      <div className="section-head">
        <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Problemas (RF-7.2)</h2>
        <button type="button" className="btn-secondary" disabled={loading} onClick={() => void load()}>
          {loading ? "A atualizar…" : "Atualizar"}
        </button>
      </div>
      <p className="hint">
        Causa raiz, plano de ação e estado via <code>PATCH /problem-change/problems/:id</code>. Exige permissão{" "}
        <code>problems:update:all</code>.
      </p>
      {hint ? <p className="hint">{hint}</p> : null}
      {error ? <div className="banner-error">{error}</div> : null}
      {loading ? <p>A carregar…</p> : null}
      {!loading && rows !== null && rows.length === 0 && !error ? (
        <p className="hint">Nenhum problema registado.</p>
      ) : null}
      {!loading && rows !== null && rows.length > 0 ? (
        <div className="table-wrap">
          <table className="incidents">
            <thead>
              <tr>
                <th>Título</th>
                <th>Estado</th>
                <th>Causa raiz</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td>{r.status}</td>
                  <td>{r.rootCause ? `${r.rootCause.slice(0, 80)}${r.rootCause.length > 80 ? "…" : ""}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && rows !== null && rows.length > 0 ? (
        <div className="nested-panel">
          <h3 style={{ marginTop: 0, fontSize: "1.05rem" }}>Editar problema</h3>
          {saveError ? <div className="banner-error">{saveError}</div> : null}
          <form className="form" onSubmit={(ev) => void handleSave(ev)}>
            <label>
              Problema
              <select value={selectedId} onChange={(ev) => setSelectedId(ev.target.value)} disabled={saveLoading}>
                <option value="">— Escolha —</option>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
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
            <label>
              Causa raiz
              <textarea
                value={rootCause}
                onChange={(ev) => setRootCause(ev.target.value)}
                rows={4}
                disabled={saveLoading || !selectedId}
              />
            </label>
            <label>
              Plano de ação
              <textarea
                value={actionPlan}
                onChange={(ev) => setActionPlan(ev.target.value)}
                rows={4}
                disabled={saveLoading || !selectedId}
              />
            </label>
            <button type="submit" disabled={saveLoading || !selectedId}>
              {saveLoading ? "A guardar…" : "Guardar"}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
