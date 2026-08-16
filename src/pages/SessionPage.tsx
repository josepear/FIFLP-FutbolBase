import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, saveOffline } from '../lib/db';
import { TEST_DEFINITIONS, type TestSession, type Team, type TestType } from '../lib/types';
import { generateId, sortByOrder } from '../lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TestIcon } from '../components/TestIcon';
import { Plus } from 'lucide-react';

export function SessionPage() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [teamId, setTeamId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedTests, setSelectedTests] = useState<TestType[]>([]);

  useEffect(() => {
    if (!profile?.club_id) return;
    db.sessions.where('club_id').equals(profile.club_id).toArray().then(setSessions);
    db.teams.where('club_id').equals(profile.club_id).toArray().then(t => setTeams(sortByOrder(t)));
  }, [profile?.club_id]);

  async function createSession() {
    if (!profile?.club_id || !teamId || selectedTests.length === 0) return;
    const sessionId = generateId();
    const now = new Date().toISOString();
    await saveOffline('sessions', {
      id: sessionId,
      club_id: profile.club_id,
      team_id: teamId,
      coach_id: profile.id,
      date,
      status: 'draft',
      created_at: now,
      updated_at: now,
    });
    for (const testType of selectedTests) {
      await saveOffline('sessionTests', {
        id: generateId(),
        session_id: sessionId,
        test_type: testType,
        order: 0,
      });
    }
    setShowForm(false);
    setSelectedTests([]);
    setTeamId('');
    db.sessions.where('club_id').equals(profile.club_id).toArray().then(setSessions);
  }

  function toggleTest(t: TestType) {
    setSelectedTests(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Sesiones</h1>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus size={16} /> Nueva sesión
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="space-y-4 py-4">
            <div>
              <Label>Equipo</Label>
              <select
                value={teamId}
                onChange={e => setTeamId(e.target.value)}
                className="w-full mt-1 p-2 rounded-md border border-border bg-card text-foreground"
              >
                <option value="">Selecciona equipo…</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Pruebas</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(Object.keys(TEST_DEFINITIONS) as TestType[]).map(t => {
                  const def = TEST_DEFINITIONS[t];
                  const active = selectedTests.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTest(t)}
                      className={'flex items-center gap-1 px-2 py-1 rounded-md border text-xs ' + (active ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground')}
                    >
                      <TestIcon type={t} size={16} /> {def.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <Button onClick={createSession} disabled={!teamId || selectedTests.length === 0} className="w-full">
              Crear sesión
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {sessions.map(s => {
          const team = teams.find(t => t.id === s.team_id);
          return (
            <Card key={s.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-foreground">{s.date}</div>
                  <div className="text-sm text-muted-foreground">{team?.name || 'Sin equipo'}</div>
                </div>
                <Badge variant="secondary">{s.status}</Badge>
              </CardContent>
            </Card>
          );
        })}
        {sessions.length === 0 && <p className="text-muted-foreground text-center py-8">No hay sesiones todavía.</p>}
      </div>
    </div>
  );
}
