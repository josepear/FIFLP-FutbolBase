import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TEST_DEFINITIONS, type Team, type Player, type TestResult } from '../lib/types';
import { formatValue, unitLabel } from '../lib/stats';
import { TestIcon } from '../components/TestIcon';
import { Card, CardContent } from '@/components/ui/card';

export function TeamPublicView({ teamId }: { teamId: string }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const [{ data: t }, { data: p }] = await Promise.all([
        supabase.from('teams').select('*').eq('id', teamId).single(),
        supabase.from('players').select('*').eq('team_id', teamId),
      ]);
      if (!active) return;
      setTeam((t as Team) || null);
      const pl = (p as Player[]) || [];
      setPlayers(pl);
      if (pl.length) {
        const { data: r } = await supabase.from('test_results').select('*').in('player_id', pl.map(x => x.id));
        setResults((r as TestResult[]) || []);
      } else {
        setResults([]);
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [teamId]);

  const byTest = useMemo(() => {
    const m = new Map<string, { playerId: string; value: number }[]>();
    for (const r of results) {
      const def = TEST_DEFINITIONS[r.test_type];
      const arr = m.get(r.test_type) || [];
      const existing = arr.find(x => x.playerId === r.player_id);
      if (existing) {
        if (def.higherIsBetter ? r.value > existing.value : r.value < existing.value) existing.value = r.value;
      } else {
        arr.push({ playerId: r.player_id, value: r.value });
      }
      m.set(r.test_type, arr);
    }
    return m;
  }, [results]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando…</div>;
  if (!team) return <div className="p-8 text-center text-muted-foreground">Equipo no encontrado.</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-5">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
      </header>

      {[...byTest.entries()].map(([testType, rows]) => {
        const def = TEST_DEFINITIONS[testType as keyof typeof TEST_DEFINITIONS];
        const sorted = [...rows].sort((a, b) => (def.higherIsBetter ? b.value - a.value : a.value - b.value));
        return (
          <Card key={testType}>
            <CardContent className="py-4 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <TestIcon type={testType as keyof typeof TEST_DEFINITIONS} size={20} />
                {def.name}
              </div>
              <div className="divide-y divide-border">
                {sorted.map((row, i) => {
                  const p = players.find(pl => pl.id === row.playerId);
                  return (
                    <div key={row.playerId} className="flex items-center gap-2 py-1.5">
                      <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                      <span className="flex-1 text-sm text-foreground truncate">{p?.full_name || '—'}</span>
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {formatValue(row.value) + ' ' + unitLabel(testType as keyof typeof TEST_DEFINITIONS)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
