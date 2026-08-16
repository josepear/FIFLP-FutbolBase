import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, saveOffline } from '../lib/db';
import type { SeasonMatch, Team, Competition, Player, MatchEvent, MatchEventType } from '../lib/types';
import { generateId, sortByOrder, playerListLabel } from '../lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';

function fmtDate(iso: string): string {
  return iso.split('-').reverse().join('/');
}

const EVENT_LABELS: Record<MatchEventType, { label: string; icon: string }> = {
  gol: { label: 'Gol', icon: '⚽' },
  asistencia: { label: 'Asistencia', icon: '🎯' },
  tarjeta_amarilla: { label: 'Tarjeta amarilla', icon: '🟨' },
  tarjeta_roja: { label: 'Tarjeta roja', icon: '🟥' },
  cambio_entra: { label: 'Entra (cambio)', icon: '⬆️' },
  cambio_sale: { label: 'Sale (cambio)', icon: '⬇️' },
};

const EVENT_ORDER: MatchEventType[] = ['gol', 'asistencia', 'tarjeta_amarilla', 'tarjeta_roja', 'cambio_entra', 'cambio_sale'];

export function CalendarPage() {
  const { profile } = useAuth();
  const [matches, setMatches] = useState<SeasonMatch[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState('');
  const [opponent, setOpponent] = useState('');
  const [competitionId, setCompetitionId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [isHome, setIsHome] = useState(true);
  const [venue, setVenue] = useState('');
  const [localScore, setLocalScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [compName, setCompName] = useState('');
  const [compType, setCompType] = useState<'liga' | 'copa' | 'torneo'>('liga');

  // Formulario de evento
  const [eventType, setEventType] = useState<MatchEventType>('gol');
  const [eventPlayerId, setEventPlayerId] = useState('');
  const [eventMinute, setEventMinute] = useState('');

  useEffect(() => {
    if (!profile?.club_id) return;
    db.matches.where('club_id').equals(profile.club_id).toArray().then(m => setMatches([...m].sort((a, b) => a.date.localeCompare(b.date))));
    db.teams.where('club_id').equals(profile.club_id).toArray().then(t => setTeams(sortByOrder(t)));
    db.competitions.where('club_id').equals(profile.club_id).toArray().then(c => setCompetitions(sortByOrder(c)));
    db.players.where('club_id').equals(profile.club_id).toArray().then(p => setPlayers([...p].sort((a, b) => playerListLabel(a).localeCompare(playerListLabel(b)))));
    db.matchEvents.where('club_id').equals(profile.club_id).toArray().then(ev => setMatchEvents(ev));
  }, [profile?.club_id]);

  async function addMatch() {
    if (!profile?.club_id || !teamId || !opponent.trim() || !date) return;
    const now = new Date().toISOString();
    await saveOffline('matches', {
      id: generateId(),
      club_id: profile.club_id,
      team_id: teamId,
      competition_id: competitionId || undefined,
      opponent: opponent.trim(),
      date,
      time: time || undefined,
      is_home: isHome,
      venue: venue || undefined,
      local_score: localScore !== '' ? Number(localScore) : undefined,
      away_score: awayScore !== '' ? Number(awayScore) : undefined,
      status: (localScore !== '' || awayScore !== '') ? 'played' : 'scheduled',
      created_at: now,
      updated_at: now,
    });
    setShowForm(false);
    setTeamId('');
    setOpponent('');
    setCompetitionId('');
    setTime('');
    setVenue('');
    setLocalScore('');
    setAwayScore('');
    db.matches.where('club_id').equals(profile.club_id).toArray().then(m => setMatches([...m].sort((a, b) => a.date.localeCompare(b.date))));
  }

  async function addCompetition() {
    if (!profile?.club_id || !compName.trim()) return;
    await saveOffline('competitions', {
      id: generateId(),
      club_id: profile.club_id,
      name: compName.trim(),
      type: compType,
      order: competitions.length,
      created_at: new Date().toISOString(),
    });
    setCompName('');
    db.competitions.where('club_id').equals(profile.club_id).toArray().then(c => setCompetitions(sortByOrder(c)));
  }

  async function addMatchEvent(matchId: string) {
    if (!profile?.club_id || !eventType) return;
    await saveOffline('matchEvents', {
      id: generateId(),
      club_id: profile.club_id,
      match_id: matchId,
      player_id: eventPlayerId || undefined,
      event_type: eventType,
      minute: eventMinute !== '' ? Number(eventMinute) : undefined,
      created_at: new Date().toISOString(),
    });
    setEventType('gol');
    setEventPlayerId('');
    setEventMinute('');
    db.matchEvents.where('club_id').equals(profile.club_id).toArray().then(ev => setMatchEvents(ev));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Calendario</h1>
        <Button onClick={() => setShowForm(!showForm)} size="sm"><Plus size={16} /> Nuevo partido</Button>
      </div>

      <Card>
        <CardContent className="space-y-3 py-4">
          <h2 className="font-semibold text-foreground">Competiciones</h2>
          <div className="flex flex-wrap gap-2">
            {competitions.map(c => (
              <Badge key={c.id} variant="secondary">{c.name}{c.type ? ' (' + c.type + ')' : ''}</Badge>
            ))}
            {competitions.length === 0 && <span className="text-sm text-muted-foreground">Sin competiciones.</span>}
          </div>
          <div className="flex gap-2">
            <Input value={compName} onChange={e => setCompName(e.target.value)} placeholder="Nombre (ej. Liga Alevín)" />
            <select value={compType} onChange={e => setCompType(e.target.value as 'liga' | 'copa' | 'torneo')} className="p-2 rounded-md border border-border bg-card text-foreground">
              <option value="liga">Liga</option>
              <option value="copa">Copa</option>
              <option value="torneo">Torneo</option>
            </select>
            <Button onClick={addCompetition} size="sm"><Plus size={16} /> Añadir</Button>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Equipo</Label>
                <select value={teamId} onChange={e => setTeamId(e.target.value)} className="w-full mt-1 p-2 rounded-md border border-border bg-card text-foreground">
                  <option value="">Selecciona equipo…</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Rival</Label>
                <Input value={opponent} onChange={e => setOpponent(e.target.value)} placeholder="Nombre del rival" />
              </div>
              <div>
                <Label>Competición</Label>
                <select value={competitionId} onChange={e => setCompetitionId(e.target.value)} className="w-full mt-1 p-2 rounded-md border border-border bg-card text-foreground">
                  <option value="">Sin competición</option>
                  {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <Label>Hora</Label>
                <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
              </div>
              <div>
                <Label>Lugar</Label>
                <Input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Campo / pabellón" />
              </div>
              <div className="flex items-end gap-3 pb-1">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={isHome} onChange={e => setIsHome(e.target.checked)} className="w-4 h-4" />
                  Local
                </label>
                <div className="flex items-center gap-1">
                  <Input value={localScore} onChange={e => setLocalScore(e.target.value)} type="number" placeholder="Goles" className="w-20" />
                  <span className="text-muted-foreground">-</span>
                  <Input value={awayScore} onChange={e => setAwayScore(e.target.value)} type="number" placeholder="Goles" className="w-20" />
                </div>
              </div>
            </div>
            <Button onClick={addMatch} disabled={!teamId || !opponent.trim() || !date} className="w-full">Guardar partido</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {matches.map(m => {
          const team = teams.find(t => t.id === m.team_id);
          const comp = competitions.find(c => c.id === m.competition_id);
          const isExpanded = expandedMatchId === m.id;
          const events = matchEvents.filter(e => e.match_id === m.id).sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
          return (
            <Card key={m.id}>
              <CardContent className="py-3">
                <button
                  type="button"
                  className="w-full flex items-center gap-3 text-left"
                  onClick={() => setExpandedMatchId(isExpanded ? null : m.id)}
                >
                  <div className="w-14 shrink-0 text-center">
                    <div className="text-xs text-muted-foreground">{fmtDate(m.date).slice(0, 5)}</div>
                    <div className="text-xs text-muted-foreground">{m.time || ''}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground truncate">
                      {m.is_home ? team?.name || 'Equipo' : m.opponent} vs {m.is_home ? m.opponent : team?.name || 'Equipo'}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">{comp?.name || m.venue || ''}</div>
                  </div>
                  {m.status === 'played' ? (
                    <div className="font-bold text-foreground tabular-nums">{m.local_score ?? 0} - {m.away_score ?? 0}</div>
                  ) : (
                    <Badge variant="secondary">Programado</Badge>
                  )}
                  {isExpanded ? <ChevronUp size={16} className="shrink-0 text-muted-foreground" /> : <ChevronDown size={16} className="shrink-0 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="mt-3 space-y-3 border-t border-border pt-3">
                    <h3 className="text-sm font-semibold text-foreground">Eventos del partido</h3>

                    {events.length === 0 && (
                      <p className="text-sm text-muted-foreground">Sin eventos registrados todavía.</p>
                    )}

                    {events.map(ev => {
                      const meta = EVENT_LABELS[ev.event_type];
                      const player = players.find(p => p.id === ev.player_id);
                      return (
                        <div key={ev.id} className="flex items-center gap-2 text-sm">
                          <span>{meta.icon}</span>
                          <span className="font-medium text-foreground">{meta.label}</span>
                          {ev.minute !== undefined && <span className="text-muted-foreground tabular-nums">{ev.minute}'</span>}
                          {player && <span className="text-muted-foreground">— {playerListLabel(player)}</span>}
                        </div>
                      );
                    })}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <Label>Tipo</Label>
                        <select value={eventType} onChange={e => setEventType(e.target.value as MatchEventType)} className="w-full mt-1 p-2 rounded-md border border-border bg-card text-foreground">
                          {EVENT_ORDER.map(t => <option key={t} value={t}>{EVENT_LABELS[t].label}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label>Jugador</Label>
                        <select value={eventPlayerId} onChange={e => setEventPlayerId(e.target.value)} className="w-full mt-1 p-2 rounded-md border border-border bg-card text-foreground">
                          <option value="">Sin jugador</option>
                          {players.map(p => <option key={p.id} value={p.id}>{playerListLabel(p)}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label>Minuto</Label>
                        <Input type="number" value={eventMinute} onChange={e => setEventMinute(e.target.value)} placeholder="Ej. 23" />
                      </div>
                    </div>
                    <Button onClick={() => addMatchEvent(m.id)} disabled={!eventType} size="sm" variant="outline" className="w-full">
                      <Plus size={16} /> Añadir evento
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {matches.length === 0 && <p className="text-muted-foreground text-center py-8">No hay partidos todavía.</p>}
      </div>
    </div>
  );
}
