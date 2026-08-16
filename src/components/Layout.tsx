import { type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Home, Users, TrendingUp, CalendarDays, Settings, LogOut } from 'lucide-react';

interface Props {
  children: ReactNode;
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export function Layout({ children, currentTab, onTabChange }: Props) {
  const { profile, signOut } = useAuth();

  const tabs = [
    { id: 'dashboard', label: 'Inicio', icon: Home, roles: ['admin', 'coach', 'player'] },
    { id: 'players', label: 'Jugadores', icon: Users, roles: ['admin', 'coach'] },
    { id: 'performance', label: 'Rendimiento', icon: TrendingUp, roles: ['admin', 'coach'] },
    { id: 'calendar', label: 'Calendario', icon: CalendarDays, roles: ['admin', 'coach'] },
    { id: 'admin', label: 'Admin', icon: Settings, roles: ['admin'] },
  ];

  const filtered = tabs.filter(t => (profile ? t.roles.includes(profile.role) : false));

  return (
    <div className="flex flex-col h-dvh bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <span className="font-bold text-foreground">FIFLP Fútbol Base</span>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="truncate max-w-[160px]">{profile?.email}</span>
          <button onClick={() => signOut()} className="p-1.5 hover:text-foreground" title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="mx-auto px-4 w-full max-w-5xl pt-4">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <div className="flex justify-around max-w-2xl mx-auto">
          {filtered.map(tab => {
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={'flex flex-col items-center justify-end py-1.5 min-w-0 ' + (active ? 'text-primary' : 'text-muted-foreground')}
              >
                <tab.icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                <span className={'text-[10px] tracking-wider mt-0.5 ' + (active ? 'opacity-100' : 'opacity-0')}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
