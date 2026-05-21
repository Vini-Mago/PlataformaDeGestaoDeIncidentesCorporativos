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

  const [problemCatalog, setProblemCatalog] = useState<{ id: string; title: string }[]>([]);
  const [catalogHint, setCatalogHint] = useState<string | null>(null);

  const [incidentLinks, setIncidentLinks] = useState<IncidentProblemLink[]>([]);
  const [linksHint, setLinksHint] = useState<string | null>(null);
  const [attachmentsByIncident, setAttachmentsByIncident] = useState<Record<string, IncidentAttachment[]>>({});
  const [attachmentsHint, setAttachmentsHint] = useState<string | null>(null);

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

  const loadIncidents = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    setIncidents(null);
    try {
      const rows = await fetchIncidents();
      setIncidents(rows);
      await refreshProblemOps(rows);
      await refreshAttachments(rows);
    } catch (err) {
      setIncidents(null);
      setListError(mapLoadError(err));
    } finally {
      setListLoading(false);
    }
  }, [refreshAttachments, refreshProblemOps]);

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

  const setBusy = (incidentId: string, v: boolean) => {
    setRowBusy((prev) => ({ ...prev, [incidentId]: v }));
  };

  const handleAssociate = async (incidentId: string) => {
    const problemId = selectedProblemByIncident[incidentId]?.trim();
    if (!problemId) {
      return;
    }
    setOpError(null);
    setBusy(incidentId, true);
    try {
      await linkIncidentToProblem(problemId, incidentId);
      if (incidents) {
        await refreshProblemOps(incidents);
      }
      setSelectedProblemByIncident((prev) => ({ ...prev, [incidentId]: "" }));
    } catch (err) {
      setOpError(
        err instanceof ApiError
          ? `${err.message} (${err.status})`
          : "Falha ao associar (é necessário problems:update no JWT)."
      );
    } finally {
      setBusy(incidentId, false);
    }
  };

  const handleUnlink = async (incidentId: string) => {
    const link = linkByIncidentId.get(incidentId);
    if (!link) {
      return;
    }
    setOpError(null);
    setBusy(incidentId, true);
    try {
      await unlinkIncidentFromProblem(link.problemId, incidentId);
      if (incidents) {
        await refreshProblemOps(incidents);
      }
    } catch (err) {
      setOpError(err instanceof ApiError ? err.message : "Falha ao remover ligação.");
    } finally {
      setBusy(incidentId, false);
    }
  };

  const setAttachmentRowBusy = (incidentId: string, v: boolean) => {
    setAttachmentBusy((prev) => ({ ...prev, [incidentId]: v }));
  };

  const handleAttachmentSelected = async (incidentId: string, file: File | null) => {
    if (!file) return;
    setOpError(null);
    if (!isAllowedAttachmentType(file.type)) {
      setOpError("Tipo de anexo não permitido. Use PNG, JPG, PDF ou TXT.");
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setOpError("Anexo excede 1 MiB.");
      return;
    }
    setAttachmentRowBusy(incidentId, true);
    try {
      const contentBase64 = await readFileAsBase64(file);
      await addIncidentAttachment(incidentId, {
        fileName: file.name,
        mimeType: file.type,
        contentBase64,
      });
      if (incidents) {
        await refreshAttachments(incidents);
      }
    } catch (err) {
      setOpError(err instanceof ApiError ? err.message : "Falha ao anexar ficheiro.");
    } finally {
      setAttachmentRowBusy(incidentId, false);
    }
  };

  const handleCreateProblemAndLink = async (e: FormEvent) => {
    e.preventDefault();
    setNpError(null);
    const t = npTitle.trim();
    const d = npDescription.trim();
    if (!npIncidentId || !t || !d) {
      setNpError("Escolha o incidente e preencha título e descrição do problema.");
      return;
    }
    setNpLoading(true);
    try {
      const created = await createProblem({ title: t, description: d });
      await linkIncidentToProblem(created.id, npIncidentId);
      setNpTitle("");
      setNpDescription("");
      setNpIncidentId("");
      if (incidents) {
        await refreshProblemOps(incidents);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setNpError(err.message);
      } else {
        setNpError("Não foi possível criar o problema ou associar.");
      }
    } finally {
      setNpLoading(false);
    }
  };

  return (
    <>
      <section className="panel">
        <h2 style={{ marginTop: 0, fontSize: "1.25rem" }}>Abrir incidente</h2>
        <p className="hint">
          Envio para o incident-service via BFF (<code>POST /incidents/incidents</code>). O requisitante é o utilizador autenticado.
        </p>
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
            Serviço afetado <span className="hint">(opcional)</span>
            <input
              value={serviceAffected}
              onChange={(ev) => setServiceAffected(ev.target.value)}
              maxLength={255}
              placeholder="ex.: API de pagamentos"
              disabled={createLoading}
            />
          </label>
          <button type="submit" disabled={createLoading}>
            {createLoading ? "A registar…" : "Registar incidente"}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Incidentes</h2>
          <button type="button" className="btn-secondary" disabled={listLoading} onClick={() => void loadIncidents()}>
            {listLoading ? "A atualizar…" : "Atualizar lista"}
          </button>
        </div>
        <p className="hint">
          Lista via <code>GET /incidents/incidents</code>. <strong>RF-7.1:</strong> associe cada incidente a um problema existente ou crie um problema em baixo.
        </p>
        {catalogHint ? <p className="hint">{catalogHint}</p> : null}
        {linksHint ? <p className="hint">{linksHint}</p> : null}
        {attachmentsHint ? <p className="hint">{attachmentsHint}</p> : null}
        {opError ? <div className="banner-error">{opError}</div> : null}
        {listError ? <div className="banner-error">{listError}</div> : null}
        {listLoading ? <p>A carregar incidentes…</p> : null}
        {!listLoading && incidents !== null && incidents.length === 0 && !listError ? (
          <p className="hint">Nenhum incidente encontrado.</p>
        ) : null}
        {!listLoading && incidents !== null && incidents.length > 0 ? (
          <div className="table-wrap">
            <table className="incidents">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Estado</th>
                  <th>Criticidade</th>
                  <th>Serviço</th>
                  <th>Problema (RF-7.1)</th>
                  <th>Anexos</th>
                  <th>Ligar</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((row) => {
                  const link = linkByIncidentId.get(row.id);
                  const busy = rowBusy[row.id];
                  const attachmentCount = attachmentsByIncident[row.id]?.length ?? 0;
                  return (
                    <tr key={row.id}>
                      <td>{row.title}</td>
                      <td>{row.status}</td>
                      <td>{row.criticality}</td>
                      <td>{row.serviceAffected ?? "—"}</td>
                      <td>{link ? link.problemTitle : "—"}</td>
                      <td>
                        <div className="attachment-cell">
                          <span>{attachmentCount}</span>
                          <label className="btn-secondary file-button">
                            {attachmentBusy[row.id] ? "A anexar…" : "Anexar"}
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
                      <td className="table-actions">
                        <select
                          value={selectedProblemByIncident[row.id] ?? ""}
                          onChange={(ev) =>
                            setSelectedProblemByIncident((prev) => ({
                              ...prev,
                              [row.id]: ev.target.value,
                            }))
                          }
                          disabled={busy || problemCatalog.length === 0}
                          aria-label={`Escolher problema para ${row.title}`}
                        >
                          <option value="">— problema —</option>
                          {problemCatalog.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={
                            busy ||
                            !selectedProblemByIncident[row.id] ||
                            selectedProblemByIncident[row.id] === link?.problemId
                          }
                          onClick={() => void handleAssociate(row.id)}
                        >
                          Associar
                        </button>
                        {link ? (
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={busy}
                            onClick={() => void handleUnlink(row.id)}
                          >
                            Remover
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {!listLoading && incidents !== null && incidents.length > 0 ? (
          <div className="panel nested-panel">
            <h3 style={{ marginTop: 0, fontSize: "1.05rem" }}>Novo problema e associação</h3>
            <p className="hint">
              Cria um registo em <code>problem-change-service</code> e liga-o ao incidente escolhido (<code>POST /problem-change/problems</code> + vínculo).
            </p>
            {npError ? <div className="banner-error">{npError}</div> : null}
            <form className="form" onSubmit={(ev) => void handleCreateProblemAndLink(ev)}>
              <label>
                Incidente a associar
                <select
                  value={npIncidentId}
                  onChange={(ev) => setNpIncidentId(ev.target.value)}
                  disabled={npLoading}
                  required
                >
                  <option value="">— Escolha —</option>
                  {incidents.map((i) => (
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
              <button type="submit" disabled={npLoading}>
                {npLoading ? "A criar…" : "Criar problema e associar"}
              </button>
            </form>
          </div>
        ) : null}
      </section>
    </>
  );
}
