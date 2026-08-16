import { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const SessionPage = lazy(() => import('./pages/SessionPage').then(m => ({ default: m.SessionPage })));
const PlayersPage = lazy(() => import('./pages/PlayersPage').then(m => ({ default: m.PlayersPage })));
const PerformancePage = lazy(() => import('./pages/PerformancePage').then(m => ({ default: m.PerformancePage })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then(m => ({ default: m.CalendarPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const SessionReportView = lazy(() => import('./pages/SessionReportView').then(m => ({ default: m.SessionReportView })));
const PlayerPublicView = lazy(() => import('./pages/PlayerPublicView').then(m => ({ default: m.PlayerPublicView })));
const TeamPublicView = lazy(() => import('./pages/TeamPublicView').then(m => ({ default: m.TeamPublicView })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));

type PublicView = { type: 'p' | 'e' | 'i'; id: string } | null;

function parseHash(): PublicView {
  const h = window.location.hash.substring(1);
  if (h.startsWith('p/')) return { type: 'p', id: h.replace('p/', '') };
  if (h.startsWith('e/')) return { type: 'e', id: h.replace('e/', '') };
  if (h.startsWith('i/')) return { type: 'i', id: h.replace('i/', '') };
  return null;
}

const Loading = () => (
  <div className="p-8 text-center text-muted-foreground">Cargando…</div>
);

function AppContent() {
  const { user, loading, blocked } = useAuth();
  const [currentTab, setCurrentTab] = useState(() => localStorage.getItem('ffb-tab') || 'dashboard');
  const [publicView, setPublicView] = useState<PublicView>(() => parseHash());

  function navigate(tab: string) {
    setCurrentTab(tab);
    localStorage.setItem('ffb-tab', tab);
  }

  useEffect(() => {
    const handler = (e: Event) => navigate((e as CustomEvent).detail);
    window.addEventListener('navigate', handler);
    return () => window.removeEventListener('navigate', handler);
  }, []);

  useEffect(() => {
    const handler = () => setPublicView(parseHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  if (publicView) {
    return (
      <Suspense fallback={<Loading />}>
        {publicView.type === 'p' ? <PlayerPublicView playerId={publicView.id} /> : publicView.type === 'e' ? <TeamPublicView teamId={publicView.id} /> : <SessionReportView sessionId={publicView.id} />}
      </Suspense>
    );
  }

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
      <Suspense fallback={<Loading />}>
        <ErrorBoundary>
          {currentTab === 'dashboard' && <DashboardPage />}
          {currentTab === 'session' && <SessionPage />}
          {currentTab === 'players' && <PlayersPage />}
          {currentTab === 'performance' && <PerformancePage />}
          {currentTab === 'calendar' && <CalendarPage />}
          {currentTab === 'reports' && <ReportsPage />}
          {currentTab === 'admin' && <AdminPage />}
        </ErrorBoundary>
      </Suspense>
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
