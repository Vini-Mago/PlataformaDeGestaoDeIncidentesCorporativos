import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError } from "./auth";
import {
  createIncident,
  fetchIncidents,
  type CreateIncidentPayload,
  type IncidentCriticality,
  type IncidentListItem,
} from "./api/incidents";

const CRITICALITIES: IncidentCriticality[] = ["Low", "Medium", "High", "Critical"];

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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criticality, setCriticality] = useState<IncidentCriticality>("Medium");
  const [serviceAffected, setServiceAffected] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const loadIncidents = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    setIncidents(null);
    try {
      const rows = await fetchIncidents();
      setIncidents(rows);
    } catch (err) {
      setIncidents(null);
      setListError(mapLoadError(err));
    } finally {
      setListLoading(false);
    }
  }, []);

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
          Lista via <code>GET /incidents/incidents</code>. Com permissão apenas de leitura própria, só vê os seus chamados.
        </p>
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
                </tr>
              </thead>
              <tbody>
                {incidents.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{row.status}</td>
                    <td>{row.criticality}</td>
                    <td>{row.serviceAffected ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </>
  );
}
