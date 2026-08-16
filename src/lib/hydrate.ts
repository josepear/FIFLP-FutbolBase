// ============================================================
// Espejo: Dexie siempre refleja Supabase (solo lectura)
// ============================================================

import { db } from './db';
import { supabase } from './supabase';

export async function refreshFromSupabase(clubId: string) {
  try {
    const [playersRes, sessionsRes, categoriesRes] = await Promise.all([
      supabase.from('players').select('*').eq('club_id', clubId).is('deleted_at', null),
      supabase.from('test_sessions').select('*').eq('club_id', clubId).is('deleted_at', null),
      supabase.from('categories').select('*').eq('club_id', clubId),
    ]);

    const players = playersRes.data || [];
    const sessions = sessionsRes.data || [];
    const categories = categoriesRes.data || [];

    let sessionTests: any[] = [];
    let testResults: any[] = [];
    if (sessions.length > 0) {
      const sessionIds = sessions.map((s: any) => s.id);
      const [stRes, trRes] = await Promise.all([
        supabase.from('session_tests').select('*').in('session_id', sessionIds),
        supabase.from('test_results').select('*').in('session_id', sessionIds),
      ]);
      sessionTests = stRes.data || [];
      testResults = trRes.data || [];
    }

    // Merge en Dexie (sin borrar lo local)
    await db.transaction('rw', db.players, db.sessions, db.categories, db.sessionTests, db.testResults, async () => {
      if (players.length) await db.players.bulkPut(players);
      if (sessions.length) await db.sessions.bulkPut(sessions);
      if (categories.length) await db.categories.bulkPut(categories);
      if (sessionTests.length) await db.sessionTests.bulkPut(sessionTests);
      if (testResults.length) await db.testResults.bulkPut(testResults);
    });
  } catch (e) {
    console.warn('[Refresh] Failed:', e);
  }
}
