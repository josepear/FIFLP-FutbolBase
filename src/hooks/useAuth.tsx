// ============================================================
// Hook de autenticación
// ============================================================

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { pullRemoteData, startAutoSync, stopAutoSync, pushPendingChanges } from '../lib/sync';
import type { Profile, UserRole, CoachPermissions } from '../lib/types';
import type { User } from '@supabase/supabase-js';

const DEFAULT_COACH_PERMS: CoachPermissions = {
  id: '',
  profile_id: '',
  club_id: '',
  manage_players: true,
  manage_sessions: true,
  view_performance: true,
  access_trash: false,
  manage_teams: false,
};

// Debounce para el pull disparado por realtime: agrupa ráfagas de cambios
// en una sola descarga (evita re-descargar todas las tablas por cada evento).
let realtimePullTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedPull(clubId: string) {
  if (realtimePullTimer) clearTimeout(realtimePullTimer);
  realtimePullTimer = setTimeout(() => {
    pullRemoteData(clubId).catch(() => {});
  }, 2000);
}

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

function ensureRealtime(clubId: string) {
  if (realtimeChannel) return; // ya suscrito (evita canales duplicados)
  realtimeChannel = supabase.channel('db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `club_id=eq.${clubId}` }, () => debouncedPull(clubId))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `club_id=eq.${clubId}` }, () => debouncedPull(clubId))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'test_sessions', filter: `club_id=eq.${clubId}` }, () => debouncedPull(clubId))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'test_results' }, () => debouncedPull(clubId))
    .subscribe();
}

function removeRealtime() {
  if (realtimeChannel) {
    realtimeChannel.unsubscribe().catch(() => {});
    realtimeChannel = null;
  }
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  permissions: CoachPermissions | null;
  coachTeamIds: string[] | null; // null = admin (todos), array = coach (sus equipos)
  loading: boolean;
  blocked: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  permissions: null,
  coachTeamIds: null,
  loading: true,
  blocked: false,
  signIn: async () => ({ error: 'Not initialized' }),
  signUp: async () => ({ error: 'Not initialized' }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<CoachPermissions | null>(null);
  const [coachTeamIds, setCoachTeamIds] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const readCache = <T,>(key: string): T | null => {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
    };
    const writeCache = (key: string, value: any) => {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    };

    setBlocked(false);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      // Si no hay red, usar el perfil cacheado
      const p = (data as Profile | null) || readCache<Profile>('ffb-profile');
      if (data) writeCache('ffb-profile', data);
      setProfile(p);

      // Usuario desactivado: se le bloquea el acceso (el histórico se mantiene)
      if (p?.active === false) {
        setBlocked(true);
        stopAutoSync();
        removeRealtime();
        await supabase.auth.signOut();
        setProfile(null);
        setLoading(false);
        return;
      }

      // Cargar permisos si es entrenador
      if (p?.role === 'coach') {
        const { data: permData } = await supabase
          .from('coach_permissions')
          .select('*')
          .eq('profile_id', userId)
          .single();
        const perms = (permData as CoachPermissions) || readCache<CoachPermissions>('ffb-perms') || { ...DEFAULT_COACH_PERMS, profile_id: userId, club_id: p.club_id || '' };
        if (permData) writeCache('ffb-perms', permData);
        setPermissions(perms);

        // Cargar equipos que entrena este coach
        const { data: staffData } = await supabase
          .from('technical_staff')
          .select('id, team_id')
          .eq('club_id', p.club_id)
          .eq('profile_id', userId);
        let staffEntry = staffData?.[0] || null;
        if (!staffEntry) {
          const { data: fallbackData } = await supabase
            .from('technical_staff')
            .select('id, team_id')
            .eq('club_id', p.club_id)
            .eq('full_name', p.full_name);
          staffEntry = fallbackData?.[0] || null;
        }

        if (staffEntry) {
          const teamIds: string[] = [];
          if (staffEntry.team_id) teamIds.push(staffEntry.team_id);
          const { data: extraTeams } = await supabase
            .from('technical_staff_teams')
            .select('team_id')
            .eq('staff_id', staffEntry.id);
          if (extraTeams) {
            extraTeams.forEach((t: any) => { if (t.team_id && !teamIds.includes(t.team_id)) teamIds.push(t.team_id); });
          }
          writeCache('ffb-coach-team-ids', teamIds);
          setCoachTeamIds(teamIds);
        } else {
          const cachedTeams = readCache<string[]>('ffb-coach-team-ids');
          setCoachTeamIds(cachedTeams || []);
        }
      } else {
        setPermissions(null);
        setCoachTeamIds(null);
      }
      
      // Sincronizar datos al iniciar sesión (solo si hay club)
      if (p?.club_id) {
        const clubId = p.club_id;
        await pushPendingChanges();       // subir lo que haya pendiente (no-op si offline)
        await pullRemoteData(clubId);     // ahora aborta si no hay red, mantiene Dexie
        startAutoSync(clubId);

        // Realtime: recibir cambios al instante
        ensureRealtime(clubId);
      }
    } catch (e) {
      // Fallback total: perfil cacheado
      const cached = readCache<Profile>('ffb-profile');
      if (cached) setProfile(cached);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }

  async function signUp(email: string, password: string, fullName: string, role: UserRole) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });
    if (error) return { error: error.message };

    // El trigger seguro de Supabase crea el perfil y el primer club.
    // No lo hacemos desde el navegador para que nadie pueda asignarse permisos de administrador.
    return {};
  }

  async function signOut() {
    stopAutoSync();
    removeRealtime();
    await supabase.auth.signOut();
    setProfile(null);
    setPermissions(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, permissions, coachTeamIds, loading, blocked, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
