import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AuthProvider, useAuth } from "./auth-context";
import { ApiError } from "./auth";
import { IncidentSection } from "./IncidentSection";
import { ProblemSection } from "./ProblemSection";
import { ChangeSection } from "./ChangeSection";
import { ServiceRequestSection } from "./ServiceRequestSection";
import { UserManagementSection } from "./UserManagementSection";
import { fetchIncidents, type IncidentListItem } from "./api/incidents";
import { fetchServiceRequests, type ServiceRequestListItem } from "./api/service-requests";
import {
  fetchIntegrationDlq,
  fetchIntegrationLogs,
  reprocessIntegrationDlq,
  type IntegrationDlqItem,
  type IntegrationLog,
} from "./api/integration";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/incidents", label: "Incidentes" },
  { to: "/requests", label: "Requisições" },
  { to: "/problems", label: "Problemas" },
  { to: "/changes", label: "Mudanças" },
  { to: "/users", label: "Usuários" },
  { to: "/system", label: "Sistema" },
];

const healthTargets = [
  { label: "BFF", path: "/health" },
  { label: "Identity", path: "/identity/health" },
  { label: "Incidents", path: "/incidents/health" },
  { label: "Requests", path: "/request/health" },
  { label: "Problem/Change", path: "/problem-change/health" },
  { label: "SLA", path: "/sla/health" },
  { label: "Escalation", path: "/escalation/health" },
  { label: "Notifications", path: "/notifications/health" },
  { label: "Audit", path: "/audit/health" },
  { label: "Reporting", path: "/reporting/health" },
  { label: "Integration", path: "/integration/health" },
];

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  return fallback;
}

function AuthCard({ mode }: { mode: "login" | "register" }) {
  const { isAuthenticated, signInWithGoogle, signInWithPassword, registerWithPassword } = useAuth();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [login, setLogin] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();
  const oauthError = new URLSearchParams(location.search).get("error");

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const isRegister = mode === "register";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setBusy(true);
    try {
      if (isRegister) {
        await registerWithPassword({
          name: name.trim(),
          email: email.trim(),
          ...(login.trim() ? { login: login.trim() } : {}),
          password,
          ...(department.trim() ? { department: department.trim() } : {}),
          ...(jobTitle.trim() ? { jobTitle: jobTitle.trim() } : {}),
        });
      } else {
        await signInWithPassword({ identifier: identifier.trim(), password });
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setFormError(errorMessage(err, isRegister ? "Não foi possível registar." : "Não foi possível entrar."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">
          <span className="brand-mark">PGIC</span>
          <div>
            <h1>{isRegister ? "Criar acesso" : "Entrar"}</h1>
            <p>Plataforma de Gestão de Incidentes Corporativos</p>
          </div>
        </div>
        {oauthError ? <div className="banner-error">{oauthError}</div> : null}
        {formError ? <div className="banner-error">{formError}</div> : null}
        <form className="form compact-form" onSubmit={(event) => void submit(event)}>
          {isRegister ? (
            <>
              <label>
                Nome completo
                <input value={name} onChange={(ev) => setName(ev.target.value)} disabled={busy} required />
              </label>
              <label>
                E-mail
                <input type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} disabled={busy} required />
              </label>
              <label>
                Login
                <input value={login} onChange={(ev) => setLogin(ev.target.value)} disabled={busy} placeholder="opcional" />
              </label>
              <div className="form-grid-2">
                <label>
                  Departamento
                  <input value={department} onChange={(ev) => setDepartment(ev.target.value)} disabled={busy} />
                </label>
                <label>
                  Cargo
                  <input value={jobTitle} onChange={(ev) => setJobTitle(ev.target.value)} disabled={busy} />
                </label>
              </div>
            </>
          ) : (
            <label>
              E-mail ou login
              <input value={identifier} onChange={(ev) => setIdentifier(ev.target.value)} disabled={busy} required autoFocus />
            </label>
          )}
          <label>
            Senha
            <input type="password" value={password} onChange={(ev) => setPassword(ev.target.value)} disabled={busy} minLength={8} required />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "Aguarde..." : isRegister ? "Registrar e entrar" : "Entrar"}
          </button>
        </form>
        <div className="auth-divider">ou</div>
        <button type="button" className="btn-secondary full-width" onClick={signInWithGoogle} disabled={busy}>
          Continuar com Google
        </button>
        <div className="auth-switch">
          {isRegister ? (
            <>
              Já tem acesso? <Link className="link" to="/login">Entrar</Link>
            </>
          ) : (
            <>
              Primeiro acesso? <Link className="link" to="/register">Registrar</Link>
            </>
          )}
        </div>
      </section>
      <aside className="auth-aside">
        <h2>Operação ITSM em uma tela</h2>
        <p>Incidentes, requisições, problemas, mudanças, integrações e visão executiva no mesmo fluxo autenticado.</p>
        <div className="auth-points">
          <span>RBAC</span>
          <span>Outbox</span>
          <span>RabbitMQ</span>
          <span>Auditoria</span>
        </div>
      </aside>
    </main>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">PGIC</span>
          <div>
            <strong>Incidentes</strong>
            <small>Corporate Ops</small>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/dashboard"}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="workspace">
        <header className="workspace-topbar">
          <div>
            <span className="eyebrow">Sessão ativa</span>
            <h1>{user?.name ?? "Usuário"}</h1>
          </div>
          <div className="user-chip">
            <span>{user?.role ?? "user"}</span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                void signOut().finally(() => navigate("/login", { replace: true }));
              }}
            >
              Sair
            </button>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}

function periodDurationMs(period: "24h" | "7d" | "30d"): number {
  if (period === "24h") return 24 * 60 * 60 * 1000;
  if (period === "7d") return 7 * 24 * 60 * 60 * 1000;
  return 30 * 24 * 60 * 60 * 1000;
}

function parseTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function completionTimestamp(incident: IncidentListItem): number | null {
  const primary = incident.status === "Closed" ? incident.closedAt : incident.resolvedAt;
  const secondary = incident.status === "Closed" ? incident.resolvedAt : incident.closedAt;
  return parseTimestamp(primary) ?? parseTimestamp(secondary) ?? parseTimestamp(incident.createdAt);
}

function DashboardHome() {
  const [incidents, setIncidents] = useState<IncidentListItem[] | null>(null);
  const [requests, setRequests] = useState<ServiceRequestListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("7d");
  const [criticalityFilter, setCriticalityFilter] = useState<"all" | "Low" | "Medium" | "High" | "Critical">("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [incidentRows, requestRows] = await Promise.all([
        fetchIncidents().catch(() => null),
        fetchServiceRequests().catch(() => null),
      ]);
      setIncidents(incidentRows);
      setRequests(requestRows);
      setLastUpdatedAt(new Date());
      if (!incidentRows && !requestRows) setError("Sem permissão ou serviços indisponíveis para carregar indicadores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const teamOptions = useMemo(() => {
    const values = new Set<string>();
    for (const row of incidents ?? []) {
      if (row.assignedTeamId && row.assignedTeamId.trim()) values.add(row.assignedTeamId.trim());
    }
    return Array.from(values).sort();
  }, [incidents]);

  const dimensionFilteredIncidents = useMemo(() => {
    const incidentRows = incidents ?? [];
    return incidentRows.filter((row) => {
      if (criticalityFilter !== "all" && row.criticality !== criticalityFilter) return false;
      if (teamFilter !== "all" && (row.assignedTeamId ?? "") !== teamFilter) return false;
      return true;
    });
  }, [incidents, criticalityFilter, teamFilter]);

  const periodFilteredIncidents = useMemo(() => {
    const periodStartMs = Date.now() - periodDurationMs(period);
    return dimensionFilteredIncidents.filter((row) => {
      if (!row.createdAt) return true;
      const createdAtMs = parseTimestamp(row.createdAt);
      if (createdAtMs === null) return true;
      return createdAtMs >= periodStartMs;
    });
  }, [dimensionFilteredIncidents, period]);

  const metrics = useMemo(() => {
    const requestRows = requests ?? [];
    const openStatuses = new Set(["Open", "InAnalysis", "InProgress", "PendingCustomer"]);
    const closedStatuses = new Set(["Resolved", "Closed"]);
    const now = Date.now();
    const periodStartMs = now - periodDurationMs(period);
    const riskThresholdMs = 4 * 60 * 60 * 1000;
    const openIncidents = dimensionFilteredIncidents.filter((i) => openStatuses.has(i.status));
    const slaAtRisk = openIncidents.filter((i) => {
      const createdAtMs = parseTimestamp(i.createdAt);
      if (createdAtMs === null) return false;
      return now - createdAtMs >= riskThresholdMs;
    });
    const completedInPeriod = dimensionFilteredIncidents.filter((i) => {
      if (!closedStatuses.has(i.status)) return false;
      const completedAtMs = completionTimestamp(i);
      return completedAtMs !== null && completedAtMs >= periodStartMs;
    });
    return {
      openIncidents: openIncidents.length,
      slaAtRisk: slaAtRisk.length,
      completedInPeriod: completedInPeriod.length,
      pendingRequests: requestRows.filter((r) => !["Completed", "Cancelled", "Rejected"].includes(r.status)).length,
    };
  }, [dimensionFilteredIncidents, period, requests]);

  const latestIncidents = periodFilteredIncidents.slice(0, 5);
  const latestRequests = (requests ?? []).slice(0, 5);

  return (
    <div className="content-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h2>Visão operacional</h2>
          <small className="hint">
            {lastUpdatedAt ? `Última atualização: ${lastUpdatedAt.toLocaleString()}` : "Última atualização: —"}
          </small>
        </div>
        <button type="button" className="btn-secondary" onClick={() => void load()} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </section>
      <section className="panel surface-panel">
        <div className="form-grid-2">
          <label>
            Período
            <select value={period} onChange={(ev) => setPeriod(ev.target.value as "24h" | "7d" | "30d")}>
              <option value="24h">Últimas 24h</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
            </select>
          </label>
          <label>
            Criticidade
            <select
              value={criticalityFilter}
              onChange={(ev) => setCriticalityFilter(ev.target.value as "all" | "Low" | "Medium" | "High" | "Critical")}
            >
              <option value="all">Todas</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </label>
        </div>
        <div className="form-grid-2">
          <label>
            Equipe
            <select value={teamFilter} onChange={(ev) => setTeamFilter(ev.target.value)}>
              <option value="all">Todas</option>
              {teamOptions.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </label>
          <div className="hint">
            Indicador "Em risco de SLA" usa heurística operacional: incidente aberto com mais de 4h desde criação.
          </div>
        </div>
      </section>
      {error ? <div className="banner-error">{error}</div> : null}
      <section className="stats-grid">
        <StatCard label="Incidentes abertos" value={metrics.openIncidents} detail="status operacionais" />
        <StatCard label="Em risco de SLA" value={metrics.slaAtRisk} detail="abertos há mais de 4h" />
        <StatCard label="Concluídos no período" value={metrics.completedInPeriod} detail="Resolved + Closed" />
        <StatCard label="Requisições ativas" value={metrics.pendingRequests} detail="em fluxo" />
      </section>
      <section className="dashboard-grid">
        <DashboardTable title="Incidentes recentes" empty="Sem incidentes visíveis">
          {latestIncidents.map((row) => (
            <tr key={row.id}>
              <td>{row.title}</td>
              <td>
                <span className={`status-badge status-${row.status.toLowerCase()}`}>
                  {row.status}
                </span>
              </td>
              <td>
                <span className={`criticality-badge criticality-${row.criticality.toLowerCase()}`}>
                  {row.criticality}
                </span>
              </td>
            </tr>
          ))}
        </DashboardTable>
        <DashboardTable title="Requisições recentes" empty="Sem requisições visíveis">
          {latestRequests.map((row) => (
            <tr key={row.id}>
              <td><span style={{ fontFamily: "monospace", color: "var(--primary-accent)" }}>{row.id.slice(0, 8)}</span></td>
              <td>
                <span className={`status-badge status-${row.status.toLowerCase()}`}>
                  {row.status}
                </span>
              </td>
              <td>{row.assignedTeamId ?? "-"}</td>
            </tr>
          ))}
        </DashboardTable>
      </section>
    </div>
  );
}

function DashboardTable({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="panel surface-panel">
      <h3>{title}</h3>
      {hasRows ? (
        <div className="table-wrap">
          <table className="incidents compact-table">
            <tbody>{children}</tbody>
          </table>
        </div>
      ) : (
        <p className="hint">{empty}</p>
      )}
    </section>
  );
}

function HealthBadge({ label, path }: { label: string; path: string }) {
  const [status, setStatus] = useState<"loading" | "ok" | "down">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(path, { credentials: "include" })
      .then((res) => {
        if (!cancelled) setStatus(res.ok ? "ok" : "down");
      })
      .catch(() => {
        if (!cancelled) setStatus("down");
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <article className={`health-card health-${status}`}>
      <span>{label}</span>
      <strong>{status === "loading" ? "..." : status === "ok" ? "OK" : "Falha"}</strong>
    </article>
  );
}

function SystemPage() {
  const [logs, setLogs] = useState<IntegrationLog[] | null>(null);
  const [dlq, setDlq] = useState<IntegrationDlqItem[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadIntegration = useCallback(async () => {
    setMessage(null);
    const [logRows, dlqRows] = await Promise.all([
      fetchIntegrationLogs().catch(() => null),
      fetchIntegrationDlq().catch(() => null),
    ]);
    setLogs(logRows);
    setDlq(dlqRows);
    if (!logRows && !dlqRows) setMessage("Sem permissão ou integration-service indisponível.");
  }, []);

  useEffect(() => {
    void loadIntegration();
  }, [loadIntegration]);

  const reprocess = async (id: string) => {
    setBusyId(id);
    setMessage(null);
    try {
      await reprocessIntegrationDlq(id);
      setMessage("Item reenfileirado na outbox.");
      await loadIntegration();
    } catch (err) {
      setMessage(errorMessage(err, "Falha ao reprocessar item da DLQ."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="content-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Sistema</span>
          <h2>Serviços e integrações</h2>
        </div>
        <a className="button-link" href="/reporting/report-definitions/export.csv">
          Exportar relatórios CSV
        </a>
      </section>
      <section className="health-grid">
        {healthTargets.map((target) => (
          <HealthBadge key={target.path} label={target.label} path={target.path} />
        ))}
      </section>
      {message ? <div className={message.includes("reenfileirado") ? "banner-success" : "banner-error"}>{message}</div> : null}
      <section className="dashboard-grid">
        <section className="panel surface-panel">
          <div className="section-head">
            <h3>Logs de integração</h3>
            <button type="button" className="btn-secondary" onClick={() => void loadIntegration()}>
              Atualizar
            </button>
          </div>
          {logs && logs.length > 0 ? (
            <div className="table-wrap">
              <table className="incidents compact-table">
                <thead>
                  <tr>
                    <th>Direção</th>
                    <th>Status</th>
                    <th>Endpoint</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className={`status-badge status-${row.direction.toLowerCase()}`}>
                          {row.direction}
                        </span>
                      </td>
                      <td>
                        <span className={row.httpStatus && row.httpStatus >= 400 ? "status-badge status-error" : "status-badge status-success"}>
                          {row.httpStatus ?? "-"}
                        </span>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{row.endpoint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="hint">Nenhum log visível.</p>
          )}
        </section>
        <section className="panel surface-panel">
          <h3>DLQ de integração</h3>
          {dlq && dlq.length > 0 ? (
            <div className="table-wrap">
              <table className="incidents compact-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Estado</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {dlq.map((row) => (
                    <tr key={row.id}>
                      <td><span style={{ fontWeight: 600 }}>{row.eventName}</span></td>
                      <td>
                        <span className={row.reprocessedAt ? "status-badge status-success" : "status-badge status-pending"}>
                          {row.reprocessedAt ? "Reprocessado" : "Pendente"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={Boolean(row.reprocessedAt) || busyId === row.id}
                          onClick={() => void reprocess(row.id)}
                        >
                          {busyId === row.id ? "Enviando..." : "Reprocessar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="hint">Nenhum item na DLQ.</p>
          )}
        </section>
      </section>
      <section className="panel surface-panel">
        <h3>Áreas administrativas disponíveis</h3>
        <div className="module-grid">
          <div><strong>Integrações</strong><span>Logs e DLQ via API protegida.</span></div>
          <div><strong>Auditoria</strong><span>Consulta pelo serviço de auditoria.</span></div>
          <div><strong>Reporting</strong><span>Definições e exportação CSV.</span></div>
          <div><strong>SLA/Escalonamento</strong><span>Políticas, calendários e regras.</span></div>
        </div>
      </section>
    </div>
  );
}

function ModulePage({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <div className="content-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
      </section>
      {children}
    </div>
  );
}

function ProtectedLayout({ children }: { children: ReactNode }) {
  const { status, isAuthenticated } = useAuth();

  if (status === "loading") {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <h1>Validando sessão</h1>
          <p>Aguarde...</p>
        </section>
      </main>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <AppShell>{children}</AppShell>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<AuthCard mode="login" />} />
      <Route path="/register" element={<AuthCard mode="register" />} />
      <Route path="/dashboard" element={<ProtectedLayout><DashboardHome /></ProtectedLayout>} />
      <Route path="/incidents" element={<ProtectedLayout><ModulePage title="Gestão de incidentes" eyebrow="RF-5"><IncidentSection /></ModulePage></ProtectedLayout>} />
      <Route path="/requests" element={<ProtectedLayout><ModulePage title="Catálogo e requisições" eyebrow="RF-6"><ServiceRequestSection /></ModulePage></ProtectedLayout>} />
      <Route path="/problems" element={<ProtectedLayout><ModulePage title="Problemas recorrentes" eyebrow="RF-7"><ProblemSection /></ModulePage></ProtectedLayout>} />
      <Route path="/changes" element={<ProtectedLayout><ModulePage title="Change management" eyebrow="RF-7.3"><ChangeSection /></ModulePage></ProtectedLayout>} />
      <Route path="/users" element={<ProtectedLayout><ModulePage title="Gestão de Acessos" eyebrow="Admin"><UserManagementSection /></ModulePage></ProtectedLayout>} />
      <Route path="/system" element={<ProtectedLayout><SystemPage /></ProtectedLayout>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
