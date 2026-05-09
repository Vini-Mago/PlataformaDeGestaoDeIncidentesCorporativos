import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError } from "./auth";
import {
  createServiceRequest,
  fetchCatalogItems,
  fetchServiceRequests,
  type CatalogItemSummary,
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

function shortId(id: string): string {
  if (id.length <= 12) {
    return id;
  }
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export function ServiceRequestSection() {
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

  const catalogById = useMemo(() => {
    const m = new Map<string, string>();
    catalogItems?.forEach((c) => m.set(c.id, c.name));
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

  return (
    <>
      <section className="panel">
        <h2 style={{ marginTop: 0, fontSize: "1.25rem" }}>Novo pedido de serviço</h2>
        <p className="hint">
          Escolha um item ativo do catálogo e envie para <code>POST /request/service-requests</code>. <strong>Dados adicionais</strong> são opcionais (objeto JSON).
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
                </option>
              ))}
            </select>
          </label>
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
          Lista via <code>GET /request/service-requests</code> (BFF → request-service). Com leitura apenas própria, só vê os seus pedidos.
        </p>
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
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td title={r.id}>{shortId(r.id)}</td>
                    <td title={r.catalogItemId}>
                      {catalogById.get(r.catalogItemId) ?? shortId(r.catalogItemId)}
                    </td>
                    <td>{r.status}</td>
                    <td title={r.requesterId}>{shortId(r.requesterId)}</td>
                    <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
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
