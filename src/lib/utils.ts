import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export function getParentCategory(teamName: string, teamCategory?: string): string {
  if (teamCategory) return teamCategory;
  const t = teamName.trim();
  for (const cat of ['Prebenjamín', 'Prebenjamin', 'Benjamín', 'Benjamin', 'Alevín', 'Alevin', 'Infantil', 'Cadete', 'Juvenil', 'Sénior', 'Senior', 'Veteranos']) {
    if (t.toLowerCase().startsWith(cat.toLowerCase())) return cat;
  }
  return t;
}

export function getCategoryCardColor(_catName: string, _teamCategory?: string): string {
  return 'var(--primary)';
}

export function getCategoryHex(_catName: string, _teamCategory?: string): string {
  return 'var(--primary)';
}

export function getCategoryBgHex(catName: string, teamCategory?: string): string {
  return getCategoryCardColor(catName, teamCategory);
}

export function getCategoryColorClass(catName: string, teamCategory?: string): string {
  return getCategoryCardColor(catName, teamCategory);
}

export function getCategoryBgClass(_catName: string, _teamCategory?: string): string {
  return 'bg-primary';
}

export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  const patterns = [
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m) return m[1];
  }
  return null;
}

export function waPhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 9) digits = '34' + digits;
  return digits;
}

export function waMeLink(phone: string, text: string): string {
  return 'https://wa.me/' + waPhone(phone) + '?text=' + encodeURIComponent(text);
}

export function playerSortKey(p: { last_name?: string | null; first_name?: string | null; first_last_name?: string | null; second_last_name?: string | null; full_name: string }): string {
  const lastParts = p.last_name ? p.last_name.trim().split(/\s+/) : [];
  const firstLast = p.first_last_name || lastParts[0] || '';
  const secondLast = p.second_last_name || lastParts.slice(1).join(' ') || '';
  const first = p.first_name || p.full_name || '';
  return (firstLast + ' ' + secondLast + ' ' + first).trim().toLowerCase();
}

export function playerListLabel(p: { last_name?: string | null; first_name?: string | null; first_last_name?: string | null; second_last_name?: string | null; full_name: string }): string {
  const last = [p.first_last_name, p.second_last_name].filter(Boolean).join(' ') || p.last_name || '';
  const first = p.first_name || '';
  return first && last ? last + ', ' + first : p.full_name;
}

export function sortByOrder<T extends { order?: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
}

export function sortResultsByDate<T extends { session_id: string; created_at?: string }>(
  results: T[],
  sessionDates: Record<string, string>,
): T[] {
  return [...results].sort((a, b) => {
    const da = sessionDates[a.session_id] || a.created_at || '';
    const dbb = sessionDates[b.session_id] || b.created_at || '';
    return new Date(da).getTime() - new Date(dbb).getTime();
  });
}
