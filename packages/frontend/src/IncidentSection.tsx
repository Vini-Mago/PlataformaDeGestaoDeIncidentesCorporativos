import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError } from "./auth";
import {
  addIncidentAttachment,
  createIncident,
  fetchIncidentAttachments,
  fetchIncidents,
  type AddIncidentAttachmentPayload,
  type CreateIncidentPayload,
  type IncidentAttachment,
  type IncidentCriticality,
  type IncidentListItem,
} from "./api/incidents";
import {
  createProblem,
  fetchIncidentProblemLinks,
  fetchProblemsForSelect,
  linkIncidentToProblem,
  unlinkIncidentFromProblem,
  type IncidentProblemLink,
} from "./api/problem-change";
import { fetchSlaAssignment, type SlaAssignmentRecord } from "./api/sla";
import { fetchEscalationHistory, type EscalationHistoryRecord } from "./api/escalation";

const CRITICALITIES: IncidentCriticality[] = ["Low", "Medium", "High", "Critical"];
const MAX_ATTACHMENT_BYTES = 1_048_576;
const ALLOWED_ATTACHMENT_TYPES: AddIncidentAttachmentPayload["mimeType"][] = [
  "image/png",
  "image/jpeg",
  "application/pdf",
  "text/plain",
];

function isAllowedAttachmentType(type: string): type is AddIncidentAttachmentPayload["mimeType"] {
  return ALLOWED_ATTACHMENT_TYPES.includes(type as AddIncidentAttachmentPayload["mimeType"]);
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o ficheiro."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",").pop() ?? "" : result);
    };
    reader.readAsDataURL(file);
  });
}

function mapLoadError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) {
      return "Sem permissão para listar incidentes. Peça ao administrador o papel adequado ou faça login novamente.";
    }
    if (err.status === 401) {
      return "Sessão expirada ou não autenticado.";
    }
    return err.message;
  }
  return "Não foi possível carregar incidentes.";
}

export function IncidentSection() {
  const [incidents, setIncidents] = useState<IncidentListItem[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateProblem, setShowCreateProblem] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [criticalityFilter, setCriticalityFilter] = useState("");

  const [problemCatalog, setProblemCatalog] = useState<{ id: string; title: string }[]>([]);
  const [catalogHint, setCatalogHint] = useState<string | null>(null);

  const [incidentLinks, setIncidentLinks] = useState<IncidentProblemLink[]>([]);
  const [linksHint, setLinksHint] = useState<string | null>(null);
  const [attachmentsByIncident, setAttachmentsByIncident] = useState<Record<string, IncidentAttachment[]>>({});
  const [attachmentsHint, setAttachmentsHint] = useState<string | null>(null);
  
  const [slaAssignmentsByIncident, setSlaAssignmentsByIncident] = useState<Record<string, SlaAssignmentRecord[]>>({});
  const [escalationHistoriesByIncident, setEscalationHistoriesByIncident] = useState<Record<string, EscalationHistoryRecord[]>>({});

  const [selectedProblemByIncident, setSelectedProblemByIncident] = useState<Record<string, string>>({});
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});
  const [attachmentBusy, setAttachmentBusy] = useState<Record<string, boolean>>({});

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criticality, setCriticality] = useState<IncidentCriticality>("Medium");
  const [serviceAffected, setServiceAffected] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const [npIncidentId, setNpIncidentId] = useState("");
  const [npTitle, setNpTitle] = useState("");
  const [npDescription, setNpDescription] = useState("");
  const [npError, setNpError] = useState<string | null>(null);
  const [npLoading, setNpLoading] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  const linkByIncidentId = useMemo(() => {
    const m = new Map<string, IncidentProblemLink>();
    incidentLinks.forEach((r) => m.set(r.incidentId, r));
    return m;
  }, [incidentLinks]);

  const refreshProblemOps = useCallback(async (rows: IncidentListItem[]) => {
    setCatalogHint(null);
    setLinksHint(null);
    try {
      const catalog = await fetchProblemsForSelect();
      setProblemCatalog(catalog);
    } catch (err) {
      setProblemCatalog([]);
      if (err instanceof ApiError && err.status === 403) {
        setCatalogHint("Sem permissão para listar problemas (papel analista/gestor).");
      } else if (err instanceof ApiError && err.status === 401) {
        setCatalogHint("Sessão expirada ao carregar problemas.");
      } else {
        setCatalogHint("Não foi possível carregar o catálogo de problemas.");
      }
    }
    if (rows.length === 0) {
      setIncidentLinks([]);
      return;
    }
    try {
      const links = await fetchIncidentProblemLinks(rows.map((r) => r.id));
      setIncidentLinks(links);
    } catch (err) {
      setIncidentLinks([]);
      if (err instanceof ApiError && err.status === 403) {
        setLinksHint("Sem permissão para resolver vínculos incidente–problema.");
      } else if (!(err instanceof ApiError && err.status === 401)) {
        setLinksHint("Não foi possível carregar vínculos com problemas.");
      }
    }
  }, []);

  const refreshAttachments = useCallback(async (rows: IncidentListItem[]) => {
    setAttachmentsHint(null);
    if (rows.length === 0) {
      setAttachmentsByIncident({});
      return;
    }
    try {
      const pairs = await Promise.all(
        rows.map(async (row) => [row.id, await fetchIncidentAttachments(row.id)] as const)
      );
      setAttachmentsByIncident(Object.fromEntries(pairs));
    } catch (err) {
      setAttachmentsByIncident({});
      if (err instanceof ApiError && err.status === 403) {
        setAttachmentsHint("Sem permissão para listar anexos dos incidentes.");
      } else if (!(err instanceof ApiError && err.status === 401)) {
        setAttachmentsHint("Não foi possível carregar anexos.");
      }
    }
  }, []);

  const refreshSlaAndEscalation = useCallback(async (rows: IncidentListItem[]) => {
    if (rows.length === 0) {
      setSlaAssignmentsByIncident({});
      setEscalationHistoriesByIncident({});
      return;
    }
    
    // Fetch SLAs
    try {
      const slaPairs = await Promise.all(
        rows.map(async (row) => [row.id, await fetchSlaAssignment(row.id)] as const)
      );
      setSlaAssignmentsByIncident(Object.fromEntries(slaPairs));
    } catch {
      setSlaAssignmentsByIncident({});
    }

    // Fetch Escalations
    try {
      const escPairs = await Promise.all(
        rows.map(async (row) => [row.id, await fetchEscalationHistory(row.id)] as const)
      );
      setEscalationHistoriesByIncident(Object.fromEntries(escPairs));
    } catch {
      setEscalationHistoriesByIncident({});
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    setIncidents(null);
    try {
      const rows = await fetchIncidents();
      setIncidents(rows);
      await refreshProblemOps(rows);
      await refreshAttachments(rows);
      await refreshSlaAndEscalation(rows);
    } catch (err) {
      setIncidents(null);
      setListError(mapLoadError(err));
    } finally {
      setListLoading(false);
    }
  }, [refreshAttachments, refreshProblemOps, refreshSlaAndEscalation]);

  useEffect(() => {
    void loadIncidents();
  }, [loadIncidents]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    if (!trimmedTitle || !trimmedDesc) {
      setCreateError("Título e descrição são obrigatórios.");
      return;
    }

    const payload: CreateIncidentPayload = {
      title: trimmedTitle,
      description: trimmedDesc,
      criticality,
    };
    const svc = serviceAffected.trim();
    if (svc) {
      payload.serviceAffected = svc;
    }

    setCreateLoading(true);
    try {
      await createIncident(payload);
      setTitle("");
      setDescription("");
      setCriticality("Medium");
      setServiceAffected("");
      setShowCreate(false);
      await loadIncidents();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setCreateError("Sem permissão para abrir incidentes.");
        } else if (err.status === 401) {
          setCreateError("Sessão expirada. Volte a entrar.");
        } else {
          setCreateError(err.message);
        }
      } else {
        setCreateError("Não foi possível criar o incidente.");
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCreateProblem = async (e: FormEvent) => {
    e.preventDefault();
    setNpError(null);
    if (!npIncidentId) {
      setNpError("Selecione um incidente de origem.");
      return;
    }
    const trimmedTitle = npTitle.trim();
    const trimmedDesc = npDescription.trim();
    if (!trimmedTitle || !trimmedDesc) {
      setNpError("Título e descrição são obrigatórios.");
      return;
    }

    setNpLoading(true);
    try {
      const created = await createProblem({ title: trimmedTitle, description: trimmedDesc });
      await linkIncidentToProblem(npIncidentId, created.id);
      setNpIncidentId("");
      setNpTitle("");
      setNpDescription("");
      setShowCreateProblem(false);
      if (incidents) {
        await refreshProblemOps(incidents);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setNpError(err.message);
      } else {
        setNpError("Falha na criação e vínculo do problema.");
      }
    } finally {
      setNpLoading(false);
    }
  };

  const handleAssociate = async (incidentId: string) => {
    const problemId = selectedProblemByIncident[incidentId];
    if (!problemId) return;

    setOpError(null);
    setRowBusy((prev) => ({ ...prev, [incidentId]: true }));
    try {
      await linkIncidentToProblem(incidentId, problemId);
      if (incidents) {
        await refreshProblemOps(incidents);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setOpError(err.message);
      } else {
        setOpError("Falha ao associar problema.");
      }
    } finally {
      setRowBusy((prev) => ({ ...prev, [incidentId]: false }));
    }
  };

  const handleUnlink = async (incidentId: string) => {
    setOpError(null);
    const link = linkByIncidentId.get(incidentId);
    if (!link) return;
    setRowBusy((prev) => ({ ...prev, [incidentId]: true }));
    try {
      await unlinkIncidentFromProblem(link.problemId, incidentId);
      if (incidents) {
        await refreshProblemOps(incidents);
      }
      setSelectedProblemByIncident((prev) => {
        const next = { ...prev };
        delete next[incidentId];
        return next;
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setOpError(err.message);
      } else {
        setOpError("Falha ao remover vínculo.");
      }
    } finally {
      setRowBusy((prev) => ({ ...prev, [incidentId]: false }));
    }
  };

  const handleAttachmentSelected = async (incidentId: string, file: File | null) => {
    if (!file) return;
    setOpError(null);
    if (!isAllowedAttachmentType(file.type)) {
      setOpError(`Tipo de ficheiro não permitido: ${file.type}`);
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setOpError(`Tamanho máximo excedido (${Math.round(MAX_ATTACHMENT_BYTES / 1024)}KB).`);
      return;
    }

    setAttachmentBusy((prev) => ({ ...prev, [incidentId]: true }));
    try {
      const b64 = await readFileAsBase64(file);
      await addIncidentAttachment(incidentId, {
        fileName: file.name,
        mimeType: file.type as AddIncidentAttachmentPayload["mimeType"],
        contentBase64: b64,
      });
      if (incidents) {
        await refreshAttachments(incidents);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setOpError(err.message);
      } else {
        setOpError("Falha ao anexar ficheiro.");
      }
    } finally {
      setAttachmentBusy((prev) => ({ ...prev, [incidentId]: false }));
    }
  };

  const filteredIncidents = useMemo(() => {
    if (!incidents) return [];
    return incidents.filter((i) => {
      if (statusFilter && i.status !== statusFilter) return false;
      if (criticalityFilter && i.criticality !== criticalityFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return i.title.toLowerCase().includes(query) || (i.serviceAffected?.toLowerCase().includes(query));
      }
      return true;
    });
  }, [incidents, searchQuery, statusFilter, criticalityFilter]);

  const stats = useMemo(() => {
    if (!incidents) return { total: 0, critical: 0, active: 0 };
    return {
      total: incidents.length,
      critical: incidents.filter((i) => i.criticality === "Critical" && i.status !== "Closed").length,
      active: incidents.filter((i) => i.status !== "Closed" && i.status !== "Resolved").length,
    };
  }, [incidents]);

  return (
    <div className="content-stack" style={{ padding: 0 }}>
      {/* Top Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <article className="stat-card">
          <span>Total de Incidentes</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="stat-card">
          <span>Incidentes Ativos</span>
          <strong>{stats.active}</strong>
        </article>
        <article className="stat-card">
          <span>Críticos (Não-Fechados)</span>
          <strong style={{ color: stats.critical > 0 ? "var(--critical)" : "inherit" }}>{stats.critical}</strong>
        </article>
      </div>

      {/* Toolbar / Actions */}
      <div style={{ display: "flex", gap: "1rem", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "1rem", flex: 1, minWidth: "300px" }}>
          <label style={{ flex: 1 }}>
            Buscar Incidente
            <input 
              type="search" 
              placeholder="Título ou Serviço..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <label>
            Criticidade
            <select value={criticalityFilter} onChange={(e) => setCriticalityFilter(e.target.value)}>
              <option value="">Todas</option>
              {CRITICALITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Status
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Todos</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </label>
        </div>
        
        <div style={{ display: "flex", gap: "1rem", height: "fit-content" }}>
          <button type="button" onClick={() => setShowCreate(true)}>
            Novo incidente
          </button>
          <button type="button" className="btn-secondary" onClick={() => setShowCreateProblem(true)}>
            Novo problema
          </button>
        </div>
      </div>

      {/* Modals for Create (Kept as before but cleaner styling overlay assumed) */}
      {showCreateProblem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Problema a partir de Incidente</h3>
              <button type="button" className="modal-close" onClick={() => setShowCreateProblem(false)}>×</button>
            </div>
            {npError ? <div className="banner-error">{npError}</div> : null}
            <form className="form" onSubmit={(ev) => void handleCreateProblem(ev)}>
              <label>
                Incidente base
                <select
                  value={npIncidentId}
                  onChange={(ev) => setNpIncidentId(ev.target.value)}
                  disabled={npLoading}
                  required
                >
                  <option value="">— Escolha —</option>
                  {(incidents ?? []).map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Título do problema
                <input
                  value={npTitle}
                  onChange={(ev) => setNpTitle(ev.target.value)}
                  maxLength={255}
                  disabled={npLoading}
                  required
                />
              </label>
              <label>
                Descrição do problema
                <textarea
                  value={npDescription}
                  onChange={(ev) => setNpDescription(ev.target.value)}
                  rows={3}
                  disabled={npLoading}
                  required
                />
              </label>
              <div className="actions" style={{ justifyContent: "flex-end", marginTop: "1.5rem" }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateProblem(false)} disabled={npLoading}>
                  Cancelar
                </button>
                <button type="submit" disabled={npLoading}>
                  {npLoading ? "A criar…" : "Criar problema e associar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Abertura de Incidente</h3>
              <button type="button" className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            {createError ? <div className="banner-error">{createError}</div> : null}
            <form className="form" onSubmit={(ev) => void handleCreate(ev)}>
              <label>
                Título
                <input
                  value={title}
                  onChange={(ev) => setTitle(ev.target.value)}
                  maxLength={255}
                  autoComplete="off"
                  disabled={createLoading}
                  required
                />
              </label>
              <label>
                Descrição
                <textarea
                  value={description}
                  onChange={(ev) => setDescription(ev.target.value)}
                  rows={4}
                  disabled={createLoading}
                  required
                />
              </label>
              <div className="form-grid-2">
                <label>
                  Criticidade
                  <select
                    value={criticality}
                    onChange={(ev) => setCriticality(ev.target.value as IncidentCriticality)}
                    disabled={createLoading}
                  >
                    {CRITICALITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Serviço afetado <span className="hint" style={{display:'inline', padding:0}}>(opcional)</span>
                  <input
                    value={serviceAffected}
                    onChange={(ev) => setServiceAffected(ev.target.value)}
                    maxLength={255}
                    placeholder="ex.: API de pagamentos"
                    disabled={createLoading}
                  />
                </label>
              </div>
              <div className="actions" style={{ justifyContent: "flex-end", marginTop: "1.5rem" }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)} disabled={createLoading}>
                  Cancelar
                </button>
                <button type="submit" disabled={createLoading}>
                  {createLoading ? "A registar…" : "Registar incidente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="panel">
        <div className="section-head">
          <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Tabela de Incidentes</h3>
          <button type="button" className="btn-secondary" disabled={listLoading} onClick={() => void loadIncidents()}>
            {listLoading ? "A atualizar…" : "Atualizar lista"}
          </button>
        </div>
        
        {catalogHint ? <p className="hint">{catalogHint}</p> : null}
        {linksHint ? <p className="hint">{linksHint}</p> : null}
        {attachmentsHint ? <p className="hint">{attachmentsHint}</p> : null}
        {opError ? <div className="banner-error">{opError}</div> : null}
        {listError ? <div className="banner-error">{listError}</div> : null}
        
        {listLoading ? <p style={{ padding: "2rem", textAlign: "center" }}>A carregar incidentes…</p> : null}
        
        {!listLoading && filteredIncidents.length === 0 && incidents?.length !== 0 ? (
          <p className="hint" style={{ padding: "2rem", textAlign: "center" }}>Nenhum incidente encontrado para este filtro.</p>
        ) : null}
        
        {!listLoading && incidents !== null && incidents.length === 0 && !listError ? (
          <p className="hint" style={{ padding: "2rem", textAlign: "center" }}>Nenhum incidente cadastrado no sistema.</p>
        ) : null}

        {!listLoading && filteredIncidents.length > 0 ? (
          <div className="table-wrap">
            <table className="incidents" style={{ minWidth: "1000px" }}>
              <thead>
                <tr>
                  <th>Título / Serviço</th>
                  <th>Estado</th>
                  <th>Criticidade</th>
                  <th>SLA / Escalonamentos</th>
                  <th>Associação de Problema</th>
                  <th>Anexos</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map((row) => {
                  const link = linkByIncidentId.get(row.id);
                  const busy = rowBusy[row.id];
                  const attachmentCount = attachmentsByIncident[row.id]?.length ?? 0;
                  return (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.title}</strong><br/>
                        <span className="hint" style={{ padding: 0 }}>{row.serviceAffected ?? "Serviço não especificado"}</span>
                      </td>
                      <td>
                        <span className={`status-badge status-${row.status.toLowerCase()}`}>
                          {row.status}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "0.8rem",
                          fontWeight: "bold",
                          backgroundColor: row.criticality === "Critical" ? "rgba(244, 63, 94, 0.2)" : 
                                           row.criticality === "High" ? "rgba(245, 158, 11, 0.2)" :
                                           row.criticality === "Medium" ? "rgba(59, 130, 246, 0.2)" : "rgba(16, 185, 129, 0.2)",
                          color: row.criticality === "Critical" ? "var(--critical)" : 
                                 row.criticality === "High" ? "var(--warning)" :
                                 row.criticality === "Medium" ? "var(--primary-accent)" : "var(--success)"
                        }}>
                          {row.criticality}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: "0.85rem", maxWidth: "250px" }}>
                          {slaAssignmentsByIncident[row.id] && slaAssignmentsByIncident[row.id]!.length > 0 ? (
                            slaAssignmentsByIncident[row.id]!.map((sla) => (
                              <div key={sla.id} style={{ marginBottom: "4px", paddingBottom: "4px" }}>
                                <strong>Status:</strong> {sla.status} <br/>
                                <strong>Prazo:</strong> {new Date(sla.resolutionDeadline).toLocaleString()}
                              </div>
                            ))
                          ) : (
                            <span className="hint">Sem SLA</span>
                          )}
                          
                          {escalationHistoriesByIncident[row.id] && escalationHistoriesByIncident[row.id]!.length > 0 && (
                            <div style={{ marginTop: "4px" }}>
                              <strong style={{ color: "var(--warning)" }}>Escalonado</strong>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {link ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-start" }}>
                            <strong>{link.problemTitle}</strong>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}
                              disabled={busy}
                              onClick={() => void handleUnlink(row.id)}
                            >
                              Desvincular
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "0.5rem", flexDirection: "column" }}>
                            <select
                              value={selectedProblemByIncident[row.id] ?? ""}
                              onChange={(ev) =>
                                setSelectedProblemByIncident((prev) => ({
                                  ...prev,
                                  [row.id]: ev.target.value,
                                }))
                              }
                              disabled={busy || problemCatalog.length === 0}
                              style={{ padding: "0.2rem", fontSize: "0.85rem", width: "100%" }}
                            >
                              <option value="">— Selecionar Problema —</option>
                              {problemCatalog.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.title}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}
                              disabled={
                                busy ||
                                !selectedProblemByIncident[row.id]
                              }
                              onClick={() => void handleAssociate(row.id)}
                            >
                              Associar
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="attachment-cell">
                          <span>{attachmentCount} doc(s)</span>
                          <label className="btn-secondary file-button" style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", cursor: "pointer" }}>
                            {attachmentBusy[row.id] ? "..." : "Anexar"}
                            <input
                              type="file"
                              accept=".png,.jpg,.jpeg,.pdf,.txt,image/png,image/jpeg,application/pdf,text/plain"
                              disabled={attachmentBusy[row.id]}
                              onChange={(ev) => {
                                const file = ev.target.files?.[0] ?? null;
                                ev.currentTarget.value = "";
                                void handleAttachmentSelected(row.id, file);
                              }}
                            />
                          </label>
                        </div>
                      </td>
                    </tr>
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
