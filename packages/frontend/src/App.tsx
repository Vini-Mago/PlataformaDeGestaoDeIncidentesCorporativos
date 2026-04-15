import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth-context";

function AuthEntryPage() {
  const { isAuthenticated, signInWithGoogle } = useAuth();
  const location = useLocation();
  const errorMessage = new URLSearchParams(location.search).get("error");

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="container">
      <h1>Acesso corporativo</h1>
      <p>O acesso ao sistema é feito exclusivamente com conta Google corporativa.</p>
      {errorMessage ? <div className="error">{errorMessage}</div> : null}
      <button type="button" onClick={signInWithGoogle}>Entrar com Google</button>
      <div className="actions">
        <span>Primeiro acesso?</span>
        <Link className="link" to="/register">Continuar com Google</Link>
      </div>
    </main>
  );
}

function RegisterPage() {
  const { isAuthenticated, signInWithGoogle } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="container">
      <h1>Cadastro corporativo</h1>
      <p>Seu usuário é provisionado automaticamente após autenticação via Google OAuth.</p>
      <button type="button" onClick={signInWithGoogle}>Continuar com Google</button>
      <div className="actions">
        <span>Já autenticado antes?</span>
        <Link className="link" to="/login">Voltar para login</Link>
      </div>
    </main>
  );
}

function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="container">
      <div className="topbar">
        <h1>Área protegida</h1>
        <button
          onClick={() => {
            void signOut().finally(() => navigate("/login", { replace: true }));
          }}
        >
          Sair
        </button>
      </div>
      <p>Você está autenticado no backend.</p>
      <p><strong>Nome:</strong> {user.name}</p>
      <p><strong>E-mail:</strong> {user.email}</p>
      <p><strong>ID:</strong> {user.id}</p>
      <p><strong>Role:</strong> {user.role ?? "user"}</p>
    </main>
  );
}

function ProtectedRoute() {
  const { status, isAuthenticated } = useAuth();

  if (status === "loading") {
    return (
      <main className="container">
        <p>Validando sessão...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<AuthEntryPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<ProtectedRoute />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
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
