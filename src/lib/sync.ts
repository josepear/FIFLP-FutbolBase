// ============================================================
// Motor de sincronización: Local (Dexie) ↔ Remoto (Supabase)
// Sincronización automática + manual
// ============================================================

import { supabase } from './supabase';
import { db, type FutbolBaseDB } from './db';
import type { TestResult, TestSession, SessionTest, Player, Category, Team, SeasonMatch, OpponentTeam, Video, TestTarget, Competition } from './types';

type SyncableTable = keyof Pick<FutbolBaseDB, 'sessions' | 'sessionTests' | 'testResults' | 'players' | 'categories' | 'teams' | 'matches' | 'opponents' | 'videos' | 'testTargets' | 'competitions'>;

const TABLE_MAP: Record<SyncableTable, string> = {
  sessions: 'test_sessions',
  sessionTests: 'session_tests',
  testResults: 'test_results',
  players: 'players',
  categories: 'categories',
  teams: 'teams',
  matches: 'matches',
  opponents: 'opponent_teams',
  videos: 'videos',
  testTargets: 'test_targets',
  competitions: 'competitions',
};

// Descarga TODAS las filas de una tabla con filtro .in(), paginando
// porque PostgREST devuelve como máximo 1000 filas por petición.
async function fetchAllIn(
  table: 'session_tests' | 'test_results',
  values: string[],
): Promise<{ data: any[] | null; error: any }> {
  if (values.length === 0) return { data: [], error: null };
  const all: any[] = [];
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const res = await supabase
      .from(table)
      .select('*')
      .in('session_id', values)
      .range(from, from + pageSize - 1);
    if (res.error) return { data: null, error: res.error };
    const rows = (res.data || []) as any[];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return { data: all, error: null };
}

// Sincronizar datos pendientes locales → remoto
export async function pushPendingChanges(): Promise<number> {
  const pending = await db.pendingSync.toArray();
  if (pending.length === 0) return 0;

  let synced = 0;
  const toDelete: any[] = [];
  for (const item of pending) {
    try {
      const remoteTable = TABLE_MAP[item.table as SyncableTable];
      if (!remoteTable) continue;

      const { id, ...rest } = item.data;

      // Limpiar campos que no existen en Supabase o rompen FK
      const clean: any = { ...rest };
      delete clean.synced;
      if (remoteTable === 'test_sessions') {
        clean.team_id = clean.team_id || clean.category_id;
        delete clean.category_id;
      }

      if (item.action === 'insert') {
        const { error } = await supabase.from(remoteTable).upsert({ id, ...clean });
        if (!error) { synced++; toDelete.push(item); }
        else {
          console.warn('Sync insert error:', remoteTable, error.message);
          // Delete records that will never sync (data errors, FK violations, missing columns, etc.)
          const fatal = error.message.includes('Could not find the')
            || error.message.includes('violates foreign key')
            || error.message.includes('violates row-level security')
            || error.message.includes('invalid input syntax')
            || error.code === '22P02'  // invalid_text_representation (UUID, etc.)
            || error.code === '23505'; // unique_violation
          if (fatal) toDelete.push(item);
        }
      } else if (item.action === 'update') {
        const { error } = await supabase.from(remoteTable).update(clean).eq('id', id);
        if (!error) { synced++; toDelete.push(item); }
        else {
          console.warn('Sync update error:', remoteTable, error.message);
          const fatal = error.message.includes('Could not find the')
            || error.message.includes('violates foreign key')
            || error.message.includes('violates row-level security')
            || error.message.includes('invalid input syntax')
            || error.code === '22P02'
            || error.code === '23505';
          if (fatal) toDelete.push(item);
        }
      } else if (item.action === 'delete') {
        const { error } = await supabase.from(remoteTable).delete().eq('id', id);
        if (!error) { synced++; toDelete.push(item); }
        else {
          console.warn('Sync delete error:', remoteTable, error.message);
          if (error.message.includes('Could not find the') || error.message.includes('violates foreign key')) {
            toDelete.push(item);
          }
        }
      }
    } catch (e) {
      console.warn('Sync error:', e);
    }
  }

  // Solo borrar los que se sincronizaron correctamente
  for (const item of toDelete) {
    await db.pendingSync.delete(item.id);
  }
  return synced;
}

// Descargar datos remotos → local
export async function pullRemoteData(clubId: string): Promise<void> {
  try {
    // Obtener todo. Cada tabla se evalúa por separado para que un fallo
    // en una no bloquee la sincronización del resto (resiliencia).
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const [categoriesRes, playersRes, sessionsRes, teamsRes, matchesRes, opponentsRes, videosRes, testTargetsRes, competitionsRes] = await Promise.all([
      supabase.from('categories').select('*').eq('club_id', clubId),
      supabase.from('players').select('*').eq('club_id', clubId).is('deleted_at', null),
      supabase.from('test_sessions').select('*').eq('club_id', clubId).gte('date', oneYearAgo.toISOString().split('T')[0]),
      supabase.from('teams').select('*').eq('club_id', clubId),
      supabase.from('matches').select('*').eq('club_id', clubId).is('deleted_at', null),
      supabase.from('opponent_teams').select('*').eq('club_id', clubId).is('deleted_at', null),
      supabase.from('videos').select('*').eq('club_id', clubId).is('deleted_at', null),
      supabase.from('test_targets').select('*').eq('club_id', clubId),
      supabase.from('competitions').select('*').eq('club_id', clubId),
    ]);

    // Log individual para diagnóstico (qué tabla falla y con qué código)
    if (categoriesRes.error) console.error('[Pull] categories:', categoriesRes.error.message, categoriesRes.error.code);
    if (playersRes.error) console.error('[Pull] players:', playersRes.error.message, playersRes.error.code);
    if (sessionsRes.error) console.error('[Pull] test_sessions:', sessionsRes.error.message, sessionsRes.error.code);
    if (teamsRes.error) console.error('[Pull] teams:', teamsRes.error.message, teamsRes.error.code);
    if (matchesRes.error) console.error('[Pull] matches:', matchesRes.error.message, matchesRes.error.code);
    if (opponentsRes.error) console.error('[Pull] opponent_teams:', opponentsRes.error.message, opponentsRes.error.code);
    if (videosRes.error) console.error('[Pull] videos:', videosRes.error.message, videosRes.error.code);
    if (testTargetsRes.error) console.error('[Pull] test_targets:', testTargetsRes.error.message, testTargetsRes.error.code);
    if (competitionsRes.error) console.error('[Pull] competitions:', competitionsRes.error.message, competitionsRes.error.code);

    // Guardar cada tabla solo si llegó bien (no borramos la local si falló)
    if (!categoriesRes.error) {
      await db.categories.clear();
      await db.categories.bulkPut((categoriesRes.data || []) as Category[]);
    }
    if (!playersRes.error) {
      await db.players.clear();
      await db.players.bulkPut((playersRes.data || []) as Player[]);
    }
    if (!sessionsRes.error) {
      await db.sessions.clear();
      await db.sessions.bulkPut((sessionsRes.data || []) as TestSession[]);
    }
    if (!teamsRes.error) {
      await db.teams.clear();
      await db.teams.bulkPut((teamsRes.data || []) as Team[]);
    }
    if (!matchesRes.error) {
      await db.matches.clear();
      await db.matches.bulkPut((matchesRes.data || []) as SeasonMatch[]);
    }
    if (!opponentsRes.error) {
      await db.opponents.clear();
      await db.opponents.bulkPut((opponentsRes.data || []) as OpponentTeam[]);
    }
    if (!videosRes.error) {
      await db.videos.clear();
      await db.videos.bulkPut((videosRes.data || []) as Video[]);
    }
    if (!testTargetsRes.error) {
      await db.testTargets.clear();
      await db.testTargets.bulkPut((testTargetsRes.data || []) as TestTarget[]);
    }
    if (!competitionsRes.error) {
      await db.competitions.clear();
      await db.competitions.bulkPut((competitionsRes.data || []) as Competition[]);
    }

    // session_tests y test_results dependen de sessions; solo si sessions llegó bien
    if (!sessionsRes.error && (sessionsRes.data || []).length > 0) {
      const sessionIds = (sessionsRes.data || []).map((s: any) => s.id);
      const [stRes, trRes] = await Promise.all([
        fetchAllIn('session_tests', sessionIds),
        fetchAllIn('test_results', sessionIds),
      ]);
      if (stRes.error) console.error('[Pull] session_tests:', stRes.error.message, stRes.error.code);
      if (trRes.error) console.error('[Pull] test_results:', trRes.error.message, trRes.error.code);
      if (!stRes.error) {
        await db.sessionTests.clear();
        if (stRes.data) await db.sessionTests.bulkPut(stRes.data as SessionTest[]);
      }
      if (!trRes.error) {
        await db.testResults.clear();
        if (trRes.data) await db.testResults.bulkPut(trRes.data as TestResult[]);
      }
    }
  } catch (e) {
    console.warn('Pull error:', e);
  }
}

// Sincronización completa
export async function fullSync(clubId: string): Promise<{ pushed: number; pulled: boolean }> {
  const pushed = await pushPendingChanges();
  await pullRemoteData(clubId);
  return { pushed, pulled: true };
}

// Auto-sync: separamos push (barato) de pull (caro en egress).
// - push: sube lo pendiente con frecuencia (poco tráfico).
// - pull: descarga todas las tablas con poca frecuencia (lo que gasta egress).
let autoPullTimer: ReturnType<typeof setInterval> | null = null;
let autoPushTimer: ReturnType<typeof setInterval> | null = null;

const PUSH_INTERVAL_MS = 30000;   // 30 s: subir pendientes pronto
const PULL_INTERVAL_MS = 600000;  // 10 min: descargar todo (ahorra egress)

export function startAutoSync(clubId: string) {
  if (autoPullTimer || autoPushTimer) return;
  // Limpiar registros pendingSync con IDs inválidos (legacy)
  db.pendingSync.filter(item => {
    const id = item.data?.id;
    return typeof id === 'string' && id.length > 36; // UUIDs válidos tienen 36 chars
  }).delete().catch(() => {});
  // Primera sincronización inmediata
  fullSync(clubId);
  autoPushTimer = setInterval(async () => {
    await pushPendingChanges();
  }, PUSH_INTERVAL_MS);
  autoPullTimer = setInterval(async () => {
    await pullRemoteData(clubId);
  }, PULL_INTERVAL_MS);
}

export function stopAutoSync() {
  if (autoPullTimer) {
    clearInterval(autoPullTimer);
    autoPullTimer = null;
  }
  if (autoPushTimer) {
    clearInterval(autoPushTimer);
    autoPushTimer = null;
  }
}
