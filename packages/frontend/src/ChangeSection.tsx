import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError } from "./auth";
import {
  fetchChangesList,
  fetchChangeDetail,
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

export function ChangeSection() {
  const [rows, setRows] = useState<ChangeRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<ChangeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
      const updated = await updateChangeRecord(selectedId, payload);
      setDetail(updated);
      await loadList();
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? `${err.message} (${err.status})` : "Falha ao guardar (changes:update?)."
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!selectedId) return;
    try {
      const d = await fetchChangeDetail(selectedId);
      setDetail(d);
    } catch {
      /* ignore */
    }
  };

  const handleLinkIncident = async () => {
    const id = incidentLinkInput.trim();
    if (!selectedId || !id) return;
    setLinkError(null);
    try {
      await linkIncidentToChange(selectedId, id);
      setIncidentLinkInput("");
      await refreshDetail();
    } catch (err) {
      setLinkError(err instanceof ApiError ? err.message : "Falha ao vincular incidente.");
    }
  };

  const handleLinkProblem = async () => {
    const id = problemLinkInput.trim();
    if (!selectedId || !id) return;
    setLinkError(null);
    try {
      await linkProblemToChange(selectedId, id);
      setProblemLinkInput("");
      await refreshDetail();
    } catch (err) {
      setLinkError(err instanceof ApiError ? err.message : "Falha ao vincular problema.");
    }
  };

  return (
    <section className="panel">
      <div className="section-head">
        <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Mudanças (RF-7.3)</h2>
        <button type="button" className="btn-secondary" disabled={loading} onClick={() => void loadList()}>
          {loading ? "A atualizar…" : "Atualizar"}
        </button>
      </div>
      <p className="hint">
        Workflow, janela de execução, rollback e vínculos a incidentes/problemas. Política CAB (alto risco):{" "}
        <code>CHANGE_CAB_HIGH_RISK</code> no serviço (predefinição: não saltar aprovação). Permissões:{" "}
        <code>changes:read:all</code>, <code>changes:update:all</code>.
      </p>
      {hint ? <p className="hint">{hint}</p> : null}
      {error ? <div className="banner-error">{error}</div> : null}
      {loading ? <p>A carregar…</p> : null}
      {!loading && rows !== null && rows.length === 0 && !error ? (
        <p className="hint">Nenhuma mudança registada.</p>
      ) : null}
      {!loading && rows !== null && rows.length > 0 ? (
        <div className="table-wrap">
          <table className="incidents">
            <thead>
              <tr>
                <th>Título</th>
                <th>Estado</th>
                <th>Risco</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td>{r.status}</td>
                  <td>{r.risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && rows !== null && rows.length > 0 ? (
        <div className="nested-panel">
          <h3 style={{ marginTop: 0, fontSize: "1.05rem" }}>Editar mudança</h3>
          {detailLoading ? <p className="hint">A carregar detalhe…</p> : null}
          {saveError ? <div className="banner-error">{saveError}</div> : null}
          {linkError ? <div className="banner-error">{linkError}</div> : null}

          <form className="form" onSubmit={(ev) => void handleSave(ev)}>
            <label>
              Mudança
              <select value={selectedId} onChange={(ev) => setSelectedId(ev.target.value)} disabled={saveLoading}>
                <option value="">— Escolha —</option>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>

            {detail ? (
              <>
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

                <fieldset disabled={!isDraft || saveLoading} style={{ border: "1px solid var(--border, #ccc)", padding: "0.75rem", borderRadius: 6 }}>
                  <legend className="hint">Campos de conteúdo (apenas Rascunho)</legend>
                  <label>
                    Título
                    <input value={title} onChange={(ev) => setTitle(ev.target.value)} />
                  </label>
                  <label>
                    Descrição
                    <textarea value={description} onChange={(ev) => setDescription(ev.target.value)} rows={3} />
                  </label>
                  <label>
                    Justificação
                    <textarea value={justification} onChange={(ev) => setJustification(ev.target.value)} rows={3} />
                  </label>
                  <label>
                    Tipo
                    <select value={changeType} onChange={(ev) => setChangeType(ev.target.value as (typeof CHANGE_TYPES)[number])}>
                      {CHANGE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
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
                </fieldset>

                <label>
                  Início da janela (local)
                  <input
                    type="datetime-local"
                    value={windowStartLocal}
                    onChange={(ev) => setWindowStartLocal(ev.target.value)}
                    disabled={saveLoading || !selectedId}
                  />
                </label>
                <label>
                  Fim da janela (local)
                  <input
                    type="datetime-local"
                    value={windowEndLocal}
                    onChange={(ev) => setWindowEndLocal(ev.target.value)}
                    disabled={saveLoading || !selectedId}
                  />
                </label>
                <label>
                  Plano de rollback
                  <textarea
                    value={rollbackPlan}
                    onChange={(ev) => setRollbackPlan(ev.target.value)}
                    rows={3}
                    disabled={saveLoading || !selectedId}
                  />
                </label>

                <button type="submit" disabled={saveLoading || !selectedId}>
                  {saveLoading ? "A guardar…" : "Guardar"}
                </button>
              </>
            ) : null}
          </form>

          {detail && selectedId ? (
            <div style={{ marginTop: "1.25rem" }}>
              <h4 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Vínculos motivadores</h4>
              <div className="form" style={{ gap: "0.5rem" }}>
                <p className="hint" style={{ margin: 0 }}>
                  Incidentes: {detail.linkedIncidentIds.length ? detail.linkedIncidentIds.join(", ") : "—"}
                </p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
                  <label style={{ flex: "1 1 200px", margin: 0 }}>
                    UUID incidente
                    <input value={incidentLinkInput} onChange={(ev) => setIncidentLinkInput(ev.target.value)} placeholder="uuid" />
                  </label>
                  <button type="button" className="btn-secondary" onClick={() => void handleLinkIncident()}>
                    Vincular incidente
                  </button>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0.25rem 0" }}>
                  {detail.linkedIncidentIds.map((iid) => (
                    <li key={iid} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <code>{iid}</code>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() =>
                          void unlinkIncidentFromChange(selectedId, iid).then(() => void refreshDetail())
                        }
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>

                <p className="hint" style={{ margin: "0.75rem 0 0" }}>
                  Problemas: {detail.linkedProblemIds.length ? detail.linkedProblemIds.join(", ") : "—"}
                </p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
                  <label style={{ flex: "1 1 200px", margin: 0 }}>
                    UUID problema
                    <input value={problemLinkInput} onChange={(ev) => setProblemLinkInput(ev.target.value)} placeholder="uuid" />
                  </label>
                  <button type="button" className="btn-secondary" onClick={() => void handleLinkProblem()}>
                    Vincular problema
                  </button>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0.25rem 0" }}>
                  {detail.linkedProblemIds.map((pid) => (
                    <li key={pid} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <code>{pid}</code>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() =>
                          void unlinkProblemFromChange(selectedId, pid).then(() => void refreshDetail())
                        }
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
