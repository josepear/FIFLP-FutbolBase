import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, saveOffline } from '../lib/db';
import { TEST_DEFINITIONS, type Player, type TestSession, type SessionTest } from '../lib/types';
import { generateId, playerSortKey } from '../lib/utils';
import { formatValue } from '../lib/stats';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar } from './Avatar';
import { TestIcon } from './TestIcon';
import { Stopwatch } from './Stopwatch';
import { X, ChevronLeft, ChevronRight, Check, UserMinus } from 'lucide-react';

function stepFor(unit: string): number {
  if (unit === 'meters') return 0.5;
  if (unit === 'seconds') return 0.1;
  return 1;
}

interface Props {
  session: TestSession;
  onClose: () => void;
}

export function LiveTestView({ session, onClose }: Props) {
  const [sessionTests, setSessionTests] = useState<SessionTest[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamColor, setTeamColor] = useState('var(--primary)');
  const [testIdx, setTestIdx] = useState(0);
  const [playerIdx, setPlayerIdx] = useState(0);
  const [values, setValues] = useState<Record<string, number>>({});
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.sessionTests.where('session_id').equals(session.id).toArray().then(setSessionTests);
    const q = session.team_id
      ? db.players.where('team_id').equals(session.team_id)
      : db.players.where('club_id').equals(session.club_id);
    q.toArray().then(p => setPlayers([...p].sort((a, b) => playerSortKey(a).localeCompare(playerSortKey(b)))));
    if (session.team_id) {
      db.teams.get(session.team_id).then(t => { if (t?.color) setTeamColor(t.color); });
    }
  }, [session.id, session.team_id, session.club_id]);

  const currentTest = sessionTests[testIdx];
  const currentDef = currentTest ? TEST_DEFINITIONS[currentTest.test_type] : null;
  const currentPlayer = players[playerIdx];

  const key = currentTest && currentPlayer ? currentPlayer.id + ':' + currentTest.test_type : '';
  const value = key ? values[key] : undefined;
  const isSkipped = currentPlayer ? skipped.has(currentPlayer.id) : false;

  const allDone = currentTest
    ? players.every(p => skipped.has(p.id) || values[p.id + ':' + currentTest.test_type] !== undefined)
    : false;

  function setValue(next: number) {
    if (!key) return;
    setValues(prev => ({ ...prev, [key]: Number(next.toFixed(2)) }));
    setSkipped(prev => { const s = new Set(prev); s.delete(currentPlayer.id); return s; });
  }

  function adjust(delta: number) {
    const step = currentDef ? stepFor(currentDef.unit) : 1;
    setValue((value ?? 0) + delta * step);
  }

  function handleTime(ms: number) {
    setValue(Math.round((ms / 1000) * 100) / 100);
  }

  function toggleSkip() {
    if (!currentPlayer) return;
    setSkipped(prev => {
      const s = new Set(prev);
      if (s.has(currentPlayer.id)) s.delete(currentPlayer.id); else s.add(currentPlayer.id);
      return s;
    });
  }

  function nextPlayer() {
    if (playerIdx < players.length - 1) setPlayerIdx(playerIdx + 1);
  }

  function prevPlayer() {
    if (playerIdx > 0) setPlayerIdx(playerIdx - 1);
  }

  function completeTest() {
    if (testIdx < sessionTests.length - 1) {
      setTestIdx(testIdx + 1);
      setPlayerIdx(0);
    } else {
      setFinished(true);
    }
  }

  async function saveAll() {
    setSaving(true);
    for (const st of sessionTests) {
      for (const p of players) {
        if (skipped.has(p.id)) continue;
        const v = values[p.id + ':' + st.test_type];
        if (v === undefined) continue;
        await saveOffline('testResults', {
          id: generateId(),
          session_id: session.id,
          session_test_id: st.id,
          player_id: p.id,
          test_type: st.test_type,
          value: v,
          created_at: new Date().toISOString(),
          synced: false,
        });
      }
    }
    setSaving(false);
    onClose();
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <X size={18} /> Cerrar
        </button>
        <span className="text-sm text-muted-foreground">Prueba {testIdx + 1} de {sessionTests.length}</span>
      </div>

      <AnimatePresence mode="wait">
        {finished ? (
          <motion.div
            key="finished"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-5 py-8"
          >
            <div className="mx-auto w-16 h-16 rounded-full bg-green-600/20 text-green-500 flex items-center justify-center">
              <Check size={32} />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Pruebas completadas</h2>
            <p className="text-muted-foreground">Se han registrado los resultados de la sesión del {session.date}.</p>
            <Button onClick={saveAll} disabled={saving} size="lg" className="w-full">
              {saving ? 'Guardando…' : 'Guardar resultados'}
            </Button>
          </motion.div>
        ) : currentTest && currentDef && currentPlayer ? (
          <motion.div
            key={testIdx + ':' + playerIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Cabecera de prueba */}
            <Card className="overflow-hidden">
              <CardContent className="text-center py-6 space-y-1.5">
                <div className="flex justify-center"><TestIcon type={currentTest.test_type} size={44} /></div>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest" style={{ color: teamColor }}>{currentDef.name}</h2>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{currentDef.unit}</span>
              </CardContent>
            </Card>

            {/* Jugador + entrada de valor */}
            <Card>
              <CardContent className="py-6 flex flex-col items-center gap-5">
                <div className="flex flex-col items-center gap-1.5">
                  <Avatar name={currentPlayer.full_name} photoUrl={currentPlayer.avatar_url} size={64} className={isSkipped ? 'opacity-40' : ''} />
                  <span className="font-bold text-foreground text-lg text-center">{currentPlayer.full_name}</span>
                </div>

                {currentDef.hasTimer ? (
                  <Stopwatch key={currentPlayer.id} onTimeRecorded={handleTime} compact />
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-5">
                      <button onClick={() => adjust(-1)} className="w-12 h-12 rounded-full border border-border text-2xl text-foreground hover:bg-secondary">−</button>
                      <div className="text-5xl font-black tabular-nums text-foreground min-w-[110px] text-center">
                        {value !== undefined ? formatValue(value) : '—'}
                      </div>
                      <button onClick={() => adjust(1)} className="w-12 h-12 rounded-full border border-border text-2xl text-foreground hover:bg-secondary">+</button>
                    </div>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={value !== undefined ? String(value) : ''}
                      onChange={e => { const n = Number(e.target.value); if (!Number.isNaN(n)) setValue(n); }}
                      placeholder="Introduce el valor"
                      className="w-40 text-center"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={prevPlayer} disabled={playerIdx === 0}><ChevronLeft size={16} /></Button>
                  <Button variant={isSkipped ? 'default' : 'outline'} size="sm" onClick={toggleSkip}>
                    <UserMinus size={15} className="mr-1" /> {isSkipped ? 'Presente' : 'Ausente'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={nextPlayer} disabled={playerIdx === players.length - 1}><ChevronRight size={16} /></Button>
                </div>
              </CardContent>
            </Card>

            {/* Indicador de jugadores */}
            <div className="flex flex-wrap justify-center gap-2">
              {players.map((p, i) => {
                const done = skipped.has(p.id) || values[p.id + ':' + currentTest.test_type] !== undefined;
                const active = i === playerIdx;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlayerIdx(i)}
                    className={'w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center border transition-colors ' +
                      (active ? 'border-primary text-primary' : done ? 'bg-green-600/20 text-green-500 border-transparent' : 'border-border text-muted-foreground')}
                  >
                    {(p.first_name?.[0] || p.full_name[0]).toUpperCase()}
                  </button>
                );
              })}
            </div>

            {allDone && (
              <Button onClick={completeTest} className="w-full" size="lg">
                {testIdx < sessionTests.length - 1 ? 'Siguiente prueba' : 'Terminar'} <ChevronRight size={18} className="ml-1" />
              </Button>
            )}
          </motion.div>
        ) : (
          <p className="text-muted-foreground text-center py-8">Esta sesión no tiene pruebas.</p>
        )}
      </AnimatePresence>
    </div>
  );
}
