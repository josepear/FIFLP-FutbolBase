import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, saveOffline } from '../lib/db';
import type { Team, Category } from '../lib/types';
import { generateId, sortByOrder } from '../lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

  useEffect(() => {
    if (!profile?.club_id) return;
    db.teams.where('club_id').equals(profile.club_id).toArray().then(t => setTeams(sortByOrder(t)));
    db.categories.where('club_id').equals(profile.club_id).toArray().then(c => setCategories(sortByOrder(c)));
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
    </div>
  );
}
