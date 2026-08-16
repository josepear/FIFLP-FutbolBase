import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/db';
import type { TestSession, Team } from '../lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';

export function ReportsPage() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!profile?.club_id) return;
    db.sessions.where('club_id').equals(profile.club_id).toArray().then(s => setSessions([...s].sort((a, b) => b.date.localeCompare(a.date))));
    db.teams.where('club_id').equals(profile.club_id).toArray().then(setTeams);
  }, [profile?.club_id]);

  async function copyLink(id: string) {
    const url = window.location.origin + '/#i/' + id;
    try { await navigator.clipboard.writeText(url); } catch {}
    setCopied(id);
    setTimeout(() => setCopied(''), 1500);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Informes</h1>
      <p className="text-sm text-muted-foreground">Comparte el informe de una sesión con un enlace.</p>
      <div className="space-y-2">
        {sessions.map(s => {
          const team = teams.find(t => t.id === s.team_id);
          return (
            <Card key={s.id}>
              <CardContent className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">{s.date}</div>
                  <div className="text-sm text-muted-foreground truncate">{team?.name || 'Sin equipo'}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => copyLink(s.id)}>
                  {copied === s.id ? 'Copiado' : <><Copy size={14} className="mr-1" /> Copiar enlace</>}
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {sessions.length === 0 && <p className="text-muted-foreground text-center py-8">No hay sesiones todavía.</p>}
      </div>
    </div>
  );
}
