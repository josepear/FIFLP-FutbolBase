import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TEST_DEFINITIONS, type Player, type Team, type TestResult } from '../lib/types';
import { formatValue, unitLabel } from '../lib/stats';
import { TestIcon } from '../components/TestIcon';
import { Card, CardContent } from '@/components/ui/card';

export function PlayerPublicView({ playerId }: { playerId: string }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [sessionDates, setSessionDates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: p } = await supabase.from('players').select('*').eq('id', playerId).single();
      if (!active) return;
      setPlayer((p as Player) || null);
      if (p) {
        const tid = (p as any).team_id;
        const [{ data: tr }, { data: t }] = await Promise.all([
          supabase.from('test_results').select('*').eq('player_id', playerId),
          tid ? supabase.from('teams').select('*').eq('id', tid).single() : Promise.resolve({ data: null }),
        ]);
        setResults((tr as TestResult[]) || []);
        setTeam((t as Team) || null);
        const ids = [...new Set(((tr as TestResult[]) || []).map(r => r.session_id))];
        if (ids.length) {
          const { data: ss } = await supabase.from('test_sessions').select('id, date').in('id', ids);
          const m: Record<string, string> = {};
          for (const s of (ss as any[]) || []) m[s.id] = s.date;
          setSessionDates(m);
        }
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [playerId]);

  const latest = useMemo(() => {
    const m = new Map<string, TestResult>();
    for (const r of results) {
      const prev = m.get(r.test_type);
      if (!prev || (sessionDates[r.session_id] || '') > (sessionDates[prev.session_id] || '')) m.set(r.test_type, r);
    }
    return m;
  }, [results, sessionDates]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando…</div>;
  if (!player) return <div className="p-8 text-center text-muted-foreground">Jugador no encontrado.</div>;

  return (
    <div className="mx-auto max-w-xl px-4 py-8 space-y-5">
      <header className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{player.full_name}</h1>
        <p className="text-sm text-muted-foreground">{team?.name || 'Equipo'}</p>
      </header>

      <Card>
        <CardContent className="py-4 space-y-2">
          <h2 className="font-semibold text-foreground">Últimos resultados</h2>
          <div className="divide-y divide-border">
            {[...latest.entries()].map(([testType, r]) => {
              const def = TEST_DEFINITIONS[testType as keyof typeof TEST_DEFINITIONS];
              return (
                <div key={testType} className="flex items-center gap-2 py-2">
                  <TestIcon type={testType as keyof typeof TEST_DEFINITIONS} size={20} />
                  <span className="flex-1 text-sm text-foreground">{def.name}</span>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {formatValue(r.value) + ' ' + unitLabel(testType as keyof typeof TEST_DEFINITIONS)}
                  </span>
                </div>
              );
            })}
            {latest.size === 0 && <p className="text-sm text-muted-foreground py-2">Sin resultados todavía.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
