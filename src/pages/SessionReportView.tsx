import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TEST_DEFINITIONS, type TestSession, type Team, type Player, type SessionTest, type TestResult } from '../lib/types';
import { formatValue, unitLabel } from '../lib/stats';
import { TestIcon } from '../components/TestIcon';
import { Card, CardContent } from '@/components/ui/card';

export function SessionReportView({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<TestSession | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessionTests, setSessionTests] = useState<SessionTest[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: s } = await supabase.from('test_sessions').select('*').eq('id', sessionId).single();
      if (!active) return;
      setSession((s as TestSession) || null);
      if (s) {
        const tid = (s as any).team_id;
        const [{ data: t }, { data: st }, { data: tr }] = await Promise.all([
          tid ? supabase.from('teams').select('*').eq('id', tid).single() : Promise.resolve({ data: null }),
          supabase.from('session_tests').select('*').eq('session_id', sessionId).order('order'),
          supabase.from('test_results').select('*').eq('session_id', sessionId),
        ]);
        setTeam((t as Team) || null);
        setSessionTests((st as SessionTest[]) || []);
        setResults((tr as TestResult[]) || []);
        if (tid) {
          const { data: p } = await supabase.from('players').select('*').eq('team_id', tid);
          setPlayers((p as Player[]) || []);
        }
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [sessionId]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando informe…</div>;
  if (!session) return <div className="p-8 text-center text-muted-foreground">Sesión no encontrada.</div>;

  const valueOf = (playerId: string, testType: string) => results.find(r => r.player_id === playerId && r.test_type === testType)?.value;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-5">
      <header className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{team?.name || 'Equipo'}</h1>
        <p className="text-sm text-muted-foreground">Informe de sesión · {session.date}</p>
      </header>

      {sessionTests.map(st => {
        const def = TEST_DEFINITIONS[st.test_type];
        const sorted = [...players].sort((a, b) => {
          const va = valueOf(a.id, st.test_type);
          const vb = valueOf(b.id, st.test_type);
          if (va === undefined && vb === undefined) return 0;
          if (va === undefined) return 1;
          if (vb === undefined) return -1;
          return def.higherIsBetter ? vb - va : va - vb;
        });
        return (
          <Card key={st.id}>
            <CardContent className="py-4 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <TestIcon type={st.test_type} size={20} />
                {def.name}
                <span className="text-xs text-muted-foreground font-normal">({def.unit})</span>
              </div>
              <div className="divide-y divide-border">
                {sorted.map((p, i) => {
                  const v = valueOf(p.id, st.test_type);
                  return (
                    <div key={p.id} className="flex items-center gap-2 py-1.5">
                      <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                      <span className="flex-1 text-sm text-foreground truncate">{p.full_name}</span>
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {v !== undefined ? formatValue(v) + ' ' + unitLabel(st.test_type) : '—'}
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
