import Dexie, { type Table } from 'dexie';
import type { TestSession, SessionTest, TestResult, Player, Category, Team, SeasonMatch, OpponentTeam, Video, TestTarget } from './types';
import { generateId } from './utils';

export class FutbolBaseDB extends Dexie {
  sessions!: Table<TestSession, string>;
  sessionTests!: Table<SessionTest, string>;
  testResults!: Table<TestResult, string>;
  players!: Table<Player, string>;
  categories!: Table<Category, string>;
  teams!: Table<Team, string>;
  matches!: Table<SeasonMatch, string>;
  opponents!: Table<OpponentTeam, string>;
  videos!: Table<Video, string>;
  testTargets!: Table<TestTarget, string>;
  pendingSync!: Table<{ id: string; table: string; action: 'insert' | 'update' | 'delete'; data: any; created_at: string }, string>;

  constructor() {
    super('FutbolBaseDB');
    this.version(1).stores({
      sessions: 'id, club_id, team_id, coach_id, date, status',
      sessionTests: 'id, session_id, test_type',
      testResults: 'id, session_id, session_test_id, player_id, test_type, synced, [session_test_id+player_id]',
      players: 'id, club_id, team_id, full_name, first_name, last_name, phone, dni',
      categories: 'id, club_id, name',
      teams: 'id, club_id, category_id',
      matches: 'id, club_id, team_id, date',
      opponents: 'id, club_id, name',
      videos: 'id, club_id, month',
      testTargets: 'id, club_id, team_id, test_type',
      pendingSync: '++id, table, action',
    });
  }
}

export const db = new FutbolBaseDB();

export async function saveOffline<T extends { id: string }>(
  table: keyof Pick<FutbolBaseDB, 'sessions' | 'sessionTests' | 'testResults' | 'players' | 'categories' | 'teams' | 'matches' | 'opponents' | 'videos'>,
  data: T
) {
  if (table === 'categories') {
    await db.categories.put(data as unknown as Category);
  } else if (table === 'players') {
    await db.players.put(data as unknown as Player);
  } else if (table === 'sessions') {
    await db.sessions.put(data as unknown as TestSession);
  } else if (table === 'sessionTests') {
    await db.sessionTests.put(data as unknown as SessionTest);
  } else if (table === 'testResults') {
    await db.testResults.put(data as unknown as TestResult);
  } else if (table === 'teams') {
    await db.teams.put(data as unknown as Team);
  } else if (table === 'matches') {
    await db.matches.put(data as unknown as SeasonMatch);
  } else if (table === 'opponents') {
    await db.opponents.put(data as unknown as OpponentTeam);
  } else if (table === 'videos') {
    await db.videos.put(data as unknown as Video);
  }
  await db.pendingSync.add({
    id: generateId(),
    table,
    action: 'insert',
    data: JSON.parse(JSON.stringify(data)),
    created_at: new Date().toISOString(),
  });
}

export async function getPendingSyncCount(): Promise<number> {
  return await db.pendingSync.count();
}

export async function clearSyncQueue() {
  await db.pendingSync.clear();
}
