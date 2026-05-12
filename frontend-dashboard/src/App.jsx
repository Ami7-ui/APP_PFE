import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ConfigurationPage from './pages/ConfigurationPage';
import CiblesPage from './pages/CiblesPage';
import ScriptsPage from './pages/ScriptsPage';
import UsersPage from './pages/UsersPage';
import AiAssistantPage from './pages/AiAssistantPage'; 
import ReportsHistoryPage from './pages/ReportsHistoryPage';
import SqlPhvPage from './pages/SqlPhvPage';
import useAppStore from './store/useAppStore';

const queryClient = new QueryClient({
  defaultOptions: {
      queries: {
        staleTime: 5000,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        retry: 1,
      },
  },
});

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("Logged error:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: '#fca5a5', background: 'var(--bg-main)', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ color: '#ef4444' }}>⚠️ Erreur d'exécution React</h1>
          <p style={{ marginTop: 20, marginBottom: 10, fontWeight: 'bold' }}>Message d'erreur :</p>
          <pre style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', padding: 20, borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.3)', overflow: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '10px 20px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.5)', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 0 15px rgba(239, 68, 68, 0.2)' }}>
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children }) => {
  const user = useAppStore((state) => state.user);
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  const { user, setUser } = useAppStore();

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
                <div style={{ height: 4, background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple), var(--accent-emerald))', boxShadow: '0 0 15px var(--glow-purple)', zIndex: 50 }}></div>
                <div style={{ display: 'flex', flex: 1 }}>
                  <Sidebar user={user} onLogout={handleLogout} />
                  <main className="page-content" style={{ flex: 1, padding: '20px', background: 'transparent', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', minWidth: 0 }}>
                    <Routes>
                      <Route path="/" element={<DashboardPage user={user} />} />
                      <Route path="/dashboard" element={<Navigate to="/" replace />} />
                      <Route path="/configuration" element={<ConfigurationPage user={user} />} />
                      <Route path="/cibles" element={<CiblesPage user={user} />} />
                      <Route path="/scripts" element={<ScriptsPage user={user} />} />
                      <Route path="/users" element={<UsersPage user={user} />} />
                      <Route path="/assistant-ia" element={<AiAssistantPage user={user} />} />
                      <Route path="/reports-history" element={<ReportsHistoryPage user={user} />} />
                      <Route path="/sql-phv" element={<SqlPhvPage user={user} />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}