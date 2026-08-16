import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, saveOffline } from '../lib/db';
import { supabase } from '../lib/supabase';
import { TEST_DEFINITIONS, type Team, type Category, type TestType, type Profile } from '../lib/types';
import { generateId, sortByOrder } from '../lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TestIcon } from '../components/TestIcon';
import { Plus, Power } from 'lucide-react';

export function AdminPage() {
  const { profile } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teamName, setTeamName] = useState('');
  const [teamCategory, setTeamCategory] = useState('');
  const [teamColor, setTeamColor] = useState('#3b82f6');
  const [catName, setCatName] = useState('');
  const [catFormato, setCatFormato] = useState<'f8' | 'f11'>('f8');
  const [objectives, setObjectives] = useState<Record<string, string>>({});

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<'coach' | 'player'>('coach');
  const [userError, setUserError] = useState('');

  useEffect(() => {
    if (!profile?.club_id) return;
    db.teams.where('club_id').equals(profile.club_id).toArray().then(t => setTeams(sortByOrder(t)));
    db.categories.where('club_id').equals(profile.club_id).toArray().then(c => setCategories(sortByOrder(c)));
    db.testTargets.where('club_id').equals(profile.club_id).toArray().then(ts => {
      const m: Record<string, string> = {};
      for (const t of ts) if (!t.team_id) m[t.test_type] = String(t.target_value);
      setObjectives(m);
    });
    loadProfiles();
  }, [profile?.club_id]);

  async function loadProfiles() {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    setProfiles((data as Profile[]) || []);
  }

  async function addTeam() {
    if (!profile?.club_id || !teamName.trim()) return;
    await saveOffline('teams', {
      id: generateId(),
      club_id: profile.club_id,
      name: teamName.trim(),
      category_id: teamCategory || undefined,
      color: teamColor,
      order: teams.length,
      created_at: new Date().toISOString(),
    });
    setTeamName('');
    setTeamCategory('');
    db.teams.where('club_id').equals(profile.club_id).toArray().then(t => setTeams(sortByOrder(t)));
  }

  async function addCategory() {
    if (!profile?.club_id || !catName.trim()) return;
    await saveOffline('categories', {
      id: generateId(),
      club_id: profile.club_id,
      name: catName.trim(),
      order: categories.length,
      formato: catFormato,
    });
    setCatName('');
    db.categories.where('club_id').equals(profile.club_id).toArray().then(c => setCategories(sortByOrder(c)));
  }

  async function saveObjectives() {
    if (!profile?.club_id) return;
    const clubId = profile.club_id;
    const existing = await db.testTargets.where('club_id').equals(clubId).toArray();
    for (const t of existing) {
      if (t.team_id) continue;
      await db.testTargets.delete(t.id);
      await db.pendingSync.add({ id: generateId(), table: 'testTargets', action: 'delete', data: { id: t.id }, created_at: new Date().toISOString() });
    }
    for (const [testType, raw] of Object.entries(objectives)) {
      if (raw === undefined || raw === '') continue;
      const num = Number(raw);
      if (Number.isNaN(num)) continue;
      await saveOffline('testTargets', {
        id: generateId(),
        club_id: clubId,
        test_type: testType as TestType,
        target_value: num,
        created_at: new Date().toISOString(),
      });
    }
  }

  async function addUser() {
    if (!profile?.club_id || !userEmail.trim() || !userPassword || !userName.trim()) return;
    setUserError('');
    const { data, error } = await supabase.auth.signUp({
      email: userEmail.trim(),
      password: userPassword,
      options: { data: { full_name: userName.trim(), role: userRole, club_id: profile.club_id } },
    });
    if (error) { setUserError(error.message); return; }
    const userId = data.user?.id;
    if (userRole === 'coach' && userId) {
      await supabase.from('coach_permissions').insert({
        profile_id: userId,
        club_id: profile.club_id,
        manage_players: true,
        manage_sessions: true,
        view_performance: true,
        access_trash: false,
        manage_teams: false,
      });
      await supabase.from('technical_staff').insert({
        club_id: profile.club_id,
        profile_id: userId,
        full_name: userName.trim(),
      });
    }
    setUserEmail('');
    setUserPassword('');
    setUserName('');
    loadProfiles();
  }

  async function toggleActive(p: Profile) {
    await supabase.from('profiles').update({ active: !p.active }).eq('id', p.id);
    loadProfiles();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Administración</h1>

      <Card>
        <CardContent className="space-y-4 py-4">
          <h2 className="font-semibold text-foreground">Usuarios</h2>
          <div className="space-y-2">
            {profiles.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{p.full_name || p.email}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                </div>
                <Badge variant="secondary">{p.role}</Badge>
                <button onClick={() => toggleActive(p)} className={'p-1.5 rounded-md ' + (p.active === false ? 'text-muted-foreground' : 'text-green-500')} title={p.active === false ? 'Activar' : 'Desactivar'}>
                  <Power size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} placeholder="Email" />
            <Input type="password" value={userPassword} onChange={e => setUserPassword(e.target.value)} placeholder="Contraseña (mín 6)" />
            <Input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Nombre completo" />
            <select value={userRole} onChange={e => setUserRole(e.target.value as 'coach' | 'player')} className="p-2 rounded-md border border-border bg-card text-foreground">
              <option value="coach">Entrenador</option>
              <option value="player">Jugador</option>
            </select>
          </div>
          {userError && <div className="text-sm text-red-400 bg-red-950 p-2">{userError}</div>}
          <Button onClick={addUser} disabled={!userEmail.trim() || !userPassword || !userName.trim()} className="w-full"><Plus size={16} /> Añadir usuario</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 py-4">
          <h2 className="font-semibold text-foreground">Categorías</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <span key={c.id} className="px-2 py-1 rounded-md border border-border text-xs text-foreground">{c.name}{c.formato ? ' (' + c.formato + ')' : ''}</span>
            ))}
            {categories.length === 0 && <span className="text-sm text-muted-foreground">Sin categorías.</span>}
          </div>
          <div className="flex gap-2">
            <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Nombre (ej. Alevín)" />
            <select value={catFormato} onChange={e => setCatFormato(e.target.value as 'f8' | 'f11')} className="p-2 rounded-md border border-border bg-card text-foreground">
              <option value="f8">F-8</option>
              <option value="f11">F-11</option>
            </select>
            <Button onClick={addCategory} size="sm"><Plus size={16} /> Añadir</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 py-4">
          <h2 className="font-semibold text-foreground">Equipos</h2>
          <div className="space-y-2">
            {teams.map(t => {
              const cat = categories.find(c => c.id === t.category_id);
              return (
                <div key={t.id} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  <span className="flex-1 text-sm text-foreground">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{cat?.name || ''}</span>
                </div>
              );
            })}
            {teams.length === 0 && <span className="text-sm text-muted-foreground">Sin equipos.</span>}
          </div>
          <div className="flex gap-2">
            <Input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Nombre (ej. Alevín A)" />
            <select value={teamCategory} onChange={e => setTeamCategory(e.target.value)} className="p-2 rounded-md border border-border bg-card text-foreground">
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="color" value={teamColor} onChange={e => setTeamColor(e.target.value)} className="w-10 h-10 rounded-md border border-border bg-card" />
            <Button onClick={addTeam} size="sm"><Plus size={16} /> Añadir</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 py-4">
          <h2 className="font-semibold text-foreground">Objetivos (araña de rendimiento)</h2>
          <p className="text-xs text-muted-foreground">Marca el objetivo de cada prueba para todo el club. El anillo exterior de la araña = objetivo.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.keys(TEST_DEFINITIONS) as TestType[]).map(t => {
              const def = TEST_DEFINITIONS[t];
              return (
                <div key={t} className="flex items-center gap-2">
                  <TestIcon type={t} size={18} />
                  <span className="flex-1 text-sm text-foreground truncate">{def.name}</span>
                  <Input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={objectives[t] ?? ''}
                    onChange={e => setObjectives(prev => ({ ...prev, [t]: e.target.value }))}
                    placeholder="—"
                    className="w-20"
                  />
                  <span className="text-xs text-muted-foreground w-10">{def.unit}</span>
                </div>
              );
            })}
          </div>
          <Button onClick={saveObjectives} className="w-full">Guardar objetivos</Button>
        </CardContent>
      </Card>
    </div>
  );
}
