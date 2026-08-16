import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/db';
import { TEST_DEFINITIONS, type Team, type Player, type TestSession, type TestResult, type TestTarget, type TestType } from '../lib/types';
import { sortByOrder, playerSortKey } from '../lib/utils';
import { formatValue, unitLabel } from '../lib/stats';
import { RadarChart, type RadarAxis } from '../components/RadarChart';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function scoreFor(testType: TestType, value: number, target: number): number {
  const def = TEST_DEFINITIONS[testType];
  if (target <= 0) return 0;
  if (def.higherIsBetter) return Math.min(100, (value / target) * 100);
  if (value <= 0) return 0;
  return Math.min(100, (target / value) * 100);
}

export function PerformancePage() {
  const { profile } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [targets, setTargets] = useState<TestTarget[]>([]);
  const [teamId, setTeamId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [selectedTest, setSelectedTest] = useState<TestType | null>(null);

  useEffect(() => {
    if (!profile?.club_id) return;
    db.teams.where('club_id').equals(profile.club_id).toArray().then(t => setTeams(sortByOrder(t)));
    db.testTargets.where('club_id').equals(profile.club_id).toArray().then(setTargets);
    db.sessions.where('club_id').equals(profile.club_id).toArray().then(setSessions);
  }, [profile?.club_id]);

  useEffect(() => {
    setPlayers([]);
    setPlayerId('');
    if (!teamId) return;
    db.players.where('team_id').equals(teamId).toArray().then(p => setPlayers([...p].sort((a, b) => playerSortKey(a).localeCompare(playerSortKey(b)))));
  }, [teamId]);

  useEffect(() => {
    setResults([]);
    if (!playerId) return;
    db.testResults.where('player_id').equals(playerId).toArray().then(setResults);
  }, [playerId]);

  const sessionDates = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of sessions) m[s.id] = s.date;
    return m;
  }, [sessions]);

  const byTest = useMemo(() => {
    const m = new Map<TestType, TestResult[]>();
    for (const r of results) {
      const arr = m.get(r.test_type) || [];
      arr.push(r);
      m.set(r.test_type, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => (sessionDates[a.session_id] || '').localeCompare(sessionDates[b.session_id] || ''));
    }
    return m;
  }, [results, sessionDates]);

  const radarAxes: RadarAxis[] = useMemo(() => {
    const axes: RadarAxis[] = [];
    for (const [testType, arr] of byTest) {
      const def = TEST_DEFINITIONS[testType];
      const target = targets.find(t => t.test_type === testType && (!t.team_id || t.team_id === teamId));
      if (!target) continue;
      const latest = arr[arr.length - 1];
      const label = def.name.length > 14 ? def.name.slice(0, 14) + '…' : def.name;
      axes.push({
        label,
        value: scoreFor(testType, latest.value, target.target_value),
        max: 100,
        display: formatValue(latest.value) + ' ' + unitLabel(testType),
      });
    }
    return axes;
  }, [byTest, targets, teamId]);

  const evolutionData = useMemo(() => {
    if (!selectedTest) return [];
    const arr = byTest.get(selectedTest) || [];
    return arr.map(r => ({ date: (sessionDates[r.session_id] || '').slice(5), value: r.value }));
  }, [selectedTest, byTest, sessionDates]);

  const playerTests = useMemo(() => Array.from(byTest.keys()), [byTest]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Rendimiento</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Equipo</Label>
          <select value={teamId} onChange={e => setTeamId(e.target.value)} className="w-full mt-1 p-2 rounded-md border border-border bg-card text-foreground">
            <option value="">Selecciona equipo…</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Jugador</Label>
          <select value={playerId} onChange={e => { setPlayerId(e.target.value); setSelectedTest(null); }} className="w-full mt-1 p-2 rounded-md border border-border bg-card text-foreground" disabled={!teamId}>
            <option value="">Selecciona jugador…</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
      </div>

      {playerId && (
        <>
          <Card>
            <CardContent className="py-4">
              <h2 className="font-semibold text-foreground mb-2">Araña vs objetivo</h2>
              <RadarChart axes={radarAxes} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4 space-y-3">
              <h2 className="font-semibold text-foreground">Evolución por prueba</h2>
              <div className="flex flex-wrap gap-1.5">
                {playerTests.map(t => {
                  const def = TEST_DEFINITIONS[t];
                  const active = selectedTest === t;
                  return (
                    <button key={t} onClick={() => setSelectedTest(t)} className={'px-2 py-1 rounded-md border text-xs ' + (active ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground')}>
                      {def.name}
                    </button>
                  );
                })}
              </div>
              {selectedTest && evolutionData.length > 0 && (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {selectedTest && evolutionData.length === 0 && <p className="text-sm text-muted-foreground">Sin datos para esta prueba.</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
