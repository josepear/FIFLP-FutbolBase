import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SessionPage } from './pages/SessionPage';
import { PlayersPage } from './pages/PlayersPage';
import { AdminPage } from './pages/AdminPage';
import { ErrorBoundary } from './components/ErrorBoundary';

function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-8 text-center">
      <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground">Sección en construcción.</p>
    </div>
  );
}

function AppContent() {
  const { user, loading, blocked } = useAuth();
  const [currentTab, setCurrentTab] = useState(() => localStorage.getItem('ffb-tab') || 'dashboard');

  function navigate(tab: string) {
    setCurrentTab(tab);
    localStorage.setItem('ffb-tab', tab);
  }

  useEffect(() => {
    const handler = (e: Event) => navigate((e as CustomEvent).detail);
    window.addEventListener('navigate', handler);
    return () => window.removeEventListener('navigate', handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background text-muted-foreground">
        Cargando…
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3 max-w-sm">
          <span className="text-4xl">🔒</span>
          <h1 className="text-xl font-bold text-foreground">Cuenta desactivada</h1>
          <p className="text-sm text-muted-foreground">Contacta con el administrador del club.</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <Layout currentTab={currentTab} onTabChange={navigate}>
      <ErrorBoundary>
        {currentTab === 'dashboard' && <DashboardPage />}
        {currentTab === 'session' && <SessionPage />}
        {currentTab === 'players' && <PlayersPage />}
        {currentTab === 'performance' && <Placeholder title="Rendimiento" />}
        {currentTab === 'calendar' && <Placeholder title="Calendario" />}
        {currentTab === 'admin' && <AdminPage />}
      </ErrorBoundary>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
