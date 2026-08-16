import { useEffect, useState } from 'react';
import { db, saveOffline } from '../lib/db';
import { TEST_DEFINITIONS, type Player, type TestSession, type SessionTest } from '../lib/types';
import { generateId, playerSortKey } from '../lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TestIcon } from './TestIcon';
import { X } from 'lucide-react';

interface Props {
  session: TestSession;
  onClose: () => void;
}

export function LiveTestView({ session, onClose }: Props) {
  const [sessionTests, setSessionTests] = useState<SessionTest[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.sessionTests.where('session_id').equals(session.id).toArray().then(setSessionTests);
    if (session.team_id) {
      db.players.where('team_id').equals(session.team_id).toArray().then(p => setPlayers([...p].sort((a, b) => playerSortKey(a).localeCompare(playerSortKey(b)))));
    } else {
      db.players.where('club_id').equals(session.club_id).toArray().then(p => setPlayers([...p].sort((a, b) => playerSortKey(a).localeCompare(playerSortKey(b)))));
    }
  }, [session.id, session.team_id, session.club_id]);

  async function saveResults() {
    setSaving(true);
    for (const st of sessionTests) {
      for (const p of players) {
        const key = p.id + ':' + st.test_type;
        const raw = values[key];
        if (raw === undefined || raw === '') continue;
        const num = Number(raw);
        if (Number.isNaN(num)) continue;
        await saveOffline('testResults', {
          id: generateId(),
          session_id: session.id,
          session_test_id: st.id,
          player_id: p.id,
          test_type: st.test_type,
          value: num,
          created_at: new Date().toISOString(),
          synced: false,
        });
      }
    }
    setSaving(false);
    onClose();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">{session.date}</h2>
          <p className="text-sm text-muted-foreground">Introduce los resultados de cada prueba.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}><X size={18} /></Button>
      </div>

      {sessionTests.map(st => {
        const def = TEST_DEFINITIONS[st.test_type];
        return (
          <Card key={st.id}>
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <TestIcon type={st.test_type} size={20} />
                {def.name}
                <span className="text-xs text-muted-foreground font-normal">({def.unit})</span>
              </div>
              {players.map(p => {
                const key = p.id + ':' + st.test_type;
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="flex-1 text-sm text-foreground truncate">{p.full_name}</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={values[key] ?? ''}
                      onChange={e => setValues(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-24"
                      placeholder="—"
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      <Button onClick={saveResults} disabled={saving || sessionTests.length === 0 || players.length === 0} className="w-full">
        {saving ? 'Guardando…' : 'Guardar resultados'}
      </Button>
    </div>
  );
}
