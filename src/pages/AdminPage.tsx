import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, saveOffline } from '../lib/db';
import { TEST_DEFINITIONS, type Team, type Category, type TestType } from '../lib/types';
import { generateId, sortByOrder } from '../lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TestIcon } from '../components/TestIcon';
import { Plus } from 'lucide-react';

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

  useEffect(() => {
    if (!profile?.club_id) return;
    db.teams.where('club_id').equals(profile.club_id).toArray().then(t => setTeams(sortByOrder(t)));
    db.categories.where('club_id').equals(profile.club_id).toArray().then(c => setCategories(sortByOrder(c)));
    db.testTargets.where('club_id').equals(profile.club_id).toArray().then(ts => {
      const m: Record<string, string> = {};
      for (const t of ts) if (!t.team_id) m[t.test_type] = String(t.target_value);
      setObjectives(m);
    });
  }, [profile?.club_id]);

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Administración</h1>

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
