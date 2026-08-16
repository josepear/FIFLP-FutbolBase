import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, saveOffline } from '../lib/db';
import type { Player, Team } from '../lib/types';
import { generateId, playerSortKey, sortByOrder } from '../lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar } from '../components/Avatar';
import { Plus } from 'lucide-react';

export function PlayersPage() {
  const { profile } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!profile?.club_id) return;
    db.players.where('club_id').equals(profile.club_id).toArray().then(p => setPlayers([...p].sort((a, b) => playerSortKey(a).localeCompare(playerSortKey(b)))));
    db.teams.where('club_id').equals(profile.club_id).toArray().then(t => setTeams(sortByOrder(t)));
  }, [profile?.club_id]);

  async function addPlayer() {
    if (!profile?.club_id || !fullName.trim()) return;
    await saveOffline('players', {
      id: generateId(),
      club_id: profile.club_id,
      full_name: fullName.trim(),
      team_id: teamId || undefined,
      birth_date: birthDate || undefined,
      phone: phone || undefined,
      active: true,
      created_at: new Date().toISOString(),
    });
    setFullName('');
    setTeamId('');
    setBirthDate('');
    setPhone('');
    setShowForm(false);
    db.players.where('club_id').equals(profile.club_id).toArray().then(p => setPlayers([...p].sort((a, b) => playerSortKey(a).localeCompare(playerSortKey(b)))));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Jugadores</h1>
        <Button onClick={() => setShowForm(!showForm)} size="sm"><Plus size={16} /> Añadir jugador</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <div>
              <Label>Nombre completo</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nombre y apellidos" />
            </div>
            <div>
              <Label>Equipo</Label>
              <select value={teamId} onChange={e => setTeamId(e.target.value)} className="w-full mt-1 p-2 rounded-md border border-border bg-card text-foreground">
                <option value="">Sin equipo</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Fecha de nacimiento</Label>
              <Input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Teléfono" />
            </div>
            <Button onClick={addPlayer} disabled={!fullName.trim()} className="w-full">Guardar jugador</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {players.map(p => {
          const team = teams.find(t => t.id === p.team_id);
          return (
            <Card key={p.id}>
              <CardContent className="py-3 flex items-center gap-3">
                <Avatar name={p.full_name} photoUrl={p.avatar_url} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground truncate">{p.full_name}</div>
                  <div className="text-sm text-muted-foreground truncate">{team?.name || 'Sin equipo'}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {players.length === 0 && <p className="text-muted-foreground text-center py-8 col-span-full">No hay jugadores todavía.</p>}
      </div>
    </div>
  );
}
