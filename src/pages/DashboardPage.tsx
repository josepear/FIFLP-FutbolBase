import { useAuth } from '../hooks/useAuth';

export function DashboardPage() {
  const { profile } = useAuth();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Inicio</h1>
      <p className="text-muted-foreground">
        {profile?.full_name ? 'Bienvenido, ' + profile.full_name + '.' : 'Bienvenido.'} El proyecto FIFLP Fútbol Base está en construcción.
      </p>
      <div className="p-4 rounded-lg border border-border bg-card text-sm text-muted-foreground">
        Rol: {profile?.role}
      </div>
    </div>
  );
}
