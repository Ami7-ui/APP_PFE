import React, { useState, useEffect } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AuditPage from './pages/AuditPage';
import ConfigurationPage from './pages/ConfigurationPage';
import CiblesPage from './pages/CiblesPage';
import ScriptsPage from './pages/ScriptsPage';
import UsersPage from './pages/UsersPage';

// NOUVEAU : On importe la nouvelle page de l'Assistant IA
import AiAssistantPage from './pages/AiAssistantPage'; 

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("Logged error:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: '#fca5a5', background: '#030816', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ color: '#ef4444' }}>⚠️ Erreur d'exécution React</h1>
          <p style={{ marginTop: 20, marginBottom: 10, fontWeight: 'bold' }}>Message d'erreur :</p>
          <pre style={{ background: '#0f172a', padding: 20, borderRadius: 8, border: '1px solid #ef444450', overflow: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const PAGE_COMPONENTS = {
  dashboard:     DashboardPage,
  audit:         AuditPage,
  configuration: ConfigurationPage,
  cibles:        CiblesPage,
  scripts:       ScriptsPage,
  users:         UsersPage,
  assistant_ia:  AiAssistantPage, // NOUVEAU : On ajoute la route pour l'IA
};

export default function App() {
  const [user, setUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('og_user')) || null; }
    catch { return null; }
  });
  const [page, setPage] = useState('dashboard');

  useEffect(() => {
    if (user) localStorage.setItem('og_user', JSON.stringify(user));
    else      localStorage.removeItem('og_user');
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    setPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setPage('dashboard');
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const PageComponent = PAGE_COMPONENTS[page] || DashboardPage;

  return (
    <ErrorBoundary>
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      <div style={{ height: 4, background: 'linear-gradient(90deg, #0ea5e9, #8b5cf6)', opacity: 0.5 }}></div>
      <div style={{ display: 'flex', flex: 1 }}>
      <Sidebar user={user} page={page} onNavigate={setPage} onLogout={handleLogout} />
      <main className="page-content" style={{ flex: 1, padding: '20px', backgroundColor: '#0c0d0d' }}>
        <PageComponent user={user} onNavigate={setPage} />
      </main>
      </div>
    </div>
    </ErrorBoundary>
  );
}