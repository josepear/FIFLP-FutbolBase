// ============================================================
// Tipos de la aplicación FIFLP Fútbol Base
// ============================================================

export type UserRole = 'admin' | 'coach' | 'player';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  club_id?: string;
  category_ids?: string[];
  avatar_url?: string;
  active?: boolean;
  created_at: string;
}

export interface CoachPermissions {
  id: string;
  profile_id: string;
  club_id: string;
  manage_players: boolean;
  manage_sessions: boolean;
  view_performance: boolean;
  access_trash: boolean;
  manage_teams: boolean;
}

// Categorías de fútbol base (Prebenjamín, Benjamín, Alevín, Infantil, Cadete, Juvenil, Sénior...)
export interface Category {
  id: string;
  name: string;
  club_id: string;
  description?: string;
  order?: number;
  formato?: 'f8' | 'f11';
}

// Equipos: plantillas concretas (p. ej. Alevín A, Alevín B) con categoría asignada
export interface Team {
  id: string;
  name: string;
  club_id: string;
  category_id?: string;
  color?: string;
  order?: number;
  created_at?: string;
}

// Cuerpo técnico: entrenadores y staff
export interface TechnicalStaff {
  id: string;
  club_id: string;
  profile_id?: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  team_id?: string;
  team_ids?: string[];
  category_id?: string;
  dni?: string;
  birth_date?: string;
  dni_expiry?: string;
  phone?: string;
  role?: string;
  active?: boolean;
  order?: number;
  created_at?: string;
}

// Tipos de pruebas (fútbol base)
export type TestType =
  | 'sprint_10m'
  | 'sprint_20m'
  | 'sprint_30m'
  | 'agilidad_5_10_5'
  | 'salto_vertical_cmj'
  | 'salto_horizontal'
  | 'lanzamiento_balon_medicinal'
  | 'course_navette'
  | 'cooper'
  | 'pases_precision'
  | 'tiro_porteria_zonas'
  | 'conduccion_dribbling';

export interface TestDefinition {
  id: TestType;
  name: string;
  unit: 'count' | 'seconds' | 'meters' | 'hits' | 'cm' | 'level' | 'points';
  description: string;
  instructions: string;
  higherIsBetter: boolean;
  hasTimer: boolean;
  maxAttempts?: number;
  icon: string;
  iconType?: 'emoji' | 'svg';
  multiPlayer?: boolean;
}

export const TEST_DEFINITIONS: Record<TestType, TestDefinition> = {
  sprint_10m: {
    id: 'sprint_10m',
    name: 'Sprint 10m',
    unit: 'seconds',
    description: 'Velocidad de arranque en 10 metros',
    instructions: 'El jugador recorre 10 metros a máxima velocidad desde parado. Se cronometra el tiempo. Mide velocidad de arranque y explosividad.',
    higherIsBetter: false,
    hasTimer: true,
    icon: '⚡',
    iconType: 'emoji',
  },
  sprint_20m: {
    id: 'sprint_20m',
    name: 'Sprint 20m',
    unit: 'seconds',
    description: 'Velocidad en 20 metros',
    instructions: 'El jugador recorre 20 metros a máxima velocidad desde parado. Se cronometra el tiempo. Mide aceleración y velocidad.',
    higherIsBetter: false,
    hasTimer: true,
    icon: '⚡',
    iconType: 'emoji',
  },
  sprint_30m: {
    id: 'sprint_30m',
    name: 'Sprint 30m',
    unit: 'seconds',
    description: 'Velocidad máxima en 30 metros',
    instructions: 'El jugador recorre 30 metros a máxima velocidad. Se cronometra el tiempo. Mide velocidad punta.',
    higherIsBetter: false,
    hasTimer: true,
    icon: '⚡',
    iconType: 'emoji',
  },
  agilidad_5_10_5: {
    id: 'agilidad_5_10_5',
    name: 'Agilidad 5-10-5',
    unit: 'seconds',
    description: 'Test de agilidad con cambios de dirección (5-10-5)',
    instructions: 'El jugador sale de la línea central, toca la línea a 5 metros, vuelve a 10 metros y regresa al centro. Se cronometra el tiempo total. Mide agilidad y cambio de dirección.',
    higherIsBetter: false,
    hasTimer: true,
    icon: '🔀',
    iconType: 'emoji',
  },
  salto_vertical_cmj: {
    id: 'salto_vertical_cmj',
    name: 'Salto Vertical (CMJ)',
    unit: 'cm',
    description: 'Altura de salto vertical desde parado',
    instructions: 'El jugador, desde parado, realiza un salto vertical máximo (countermovement jump). Se mide la altura alcanzada en centímetros. Mide potencia de tren inferior.',
    higherIsBetter: true,
    hasTimer: false,
    icon: '🦘',
    iconType: 'emoji',
  },
  salto_horizontal: {
    id: 'salto_horizontal',
    name: 'Salto Horizontal',
    unit: 'cm',
    description: 'Distancia de salto horizontal desde parado',
    instructions: 'El jugador salta hacia delante desde parado con los pies juntos. Se mide la distancia en centímetros. Mide potencia explosiva de piernas.',
    higherIsBetter: true,
    hasTimer: false,
    icon: '🦘',
    iconType: 'emoji',
  },
  lanzamiento_balon_medicinal: {
    id: 'lanzamiento_balon_medicinal',
    name: 'Lanzamiento Balón Medicinal',
    unit: 'meters',
    description: 'Distancia de lanzamiento del balón medicinal',
    instructions: 'El jugador lanza un balón medicinal desde el pecho o por encima de la cabeza. Se mide la distancia en metros. Mide fuerza del tren superior.',
    higherIsBetter: true,
    hasTimer: false,
    icon: '🏋️',
    iconType: 'emoji',
  },
  course_navette: {
    id: 'course_navette',
    name: 'Course Navette',
    unit: 'level',
    description: 'Test de ida y vuelta progresivo (resistencia aeróbica)',
    instructions: 'El jugador corre entre dos líneas separadas 20 metros al ritmo de las señales sonoras, que se aceleran progresivamente. Se registra el último nivel alcanzado. Mide resistencia aeróbica.',
    higherIsBetter: true,
    hasTimer: true,
    icon: '🔁',
    iconType: 'emoji',
  },
  cooper: {
    id: 'cooper',
    name: 'Test de Cooper',
    unit: 'meters',
    description: 'Distancia recorrida en 12 minutos',
    instructions: 'El jugador corre durante 12 minutos intentando recorrer la máxima distancia. Se mide la distancia total en metros. Mide resistencia aeróbica.',
    higherIsBetter: true,
    hasTimer: true,
    icon: '🏃',
    iconType: 'emoji',
  },
  pases_precision: {
    id: 'pases_precision',
    name: 'Pases de Precisión',
    unit: 'hits',
    description: 'Pases acertados a una diana (10 intentos)',
    instructions: 'El jugador realiza 10 pases a una diana situada a una distancia adecuada a su categoría. Se cuenta cada pase que impacta en el objetivo. Mide precisión de pase.',
    higherIsBetter: true,
    hasTimer: false,
    maxAttempts: 10,
    icon: '🎯',
    iconType: 'emoji',
  },
  tiro_porteria_zonas: {
    id: 'tiro_porteria_zonas',
    name: 'Tiro a Portería por Zonas',
    unit: 'points',
    description: 'Puntuación al disparar a zonas de la portería',
    instructions: 'La portería se divide en zonas con distinta puntuación. El jugador realiza varios disparos y se suman los puntos según la zona donde impacta. Mide precisión y definición.',
    higherIsBetter: true,
    hasTimer: false,
    icon: '⚽',
    iconType: 'emoji',
  },
  conduccion_dribbling: {
    id: 'conduccion_dribbling',
    name: 'Conducción / Dribbling',
    unit: 'seconds',
    description: 'Tiempo en recorrer un circuito con balón',
    instructions: 'El jugador recorre un circuito de conos conduciendo el balón lo más rápido posible. Se cronometra el tiempo. Mide control de balón y velocidad de conducción.',
    higherIsBetter: false,
    hasTimer: true,
    icon: '🌀',
    iconType: 'emoji',
  },
};

// Sesión (entrenamiento o partido)
export interface TestSession {
  id: string;
  club_id: string;
  category_id: string; // deprecated, use team_id
  team_id?: string;
  coach_id: string;
  date: string;
  time_start?: string;
  time_end?: string;
  notes?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  type?: 'training' | 'match' | 'other';
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

// Pruebas incluidas en una sesión
export interface SessionTest {
  id: string;
  session_id: string;
  test_type: TestType;
  order: number;
}

// Jugador
export interface Player {
  id: string;
  club_id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  first_last_name?: string;
  second_last_name?: string;
  category_id: string; // deprecated, use team_id
  team_id?: string;
  birth_date?: string;
  dni?: string;
  dni_expiry?: string;
  phone?: string;
  email?: string;
  gender?: 'male' | 'female';
  profile_id?: string; // enlace a la cuenta de acceso (Profile/auth)
  avatar_url?: string;
  active: boolean;
  deleted_at?: string;
  created_at: string;
}

// Resultado de una prueba para un jugador
export interface TestResult {
  id: string;
  session_id: string;
  session_test_id: string;
  player_id: string;
  test_type: TestType;
  value: number; // El valor medido
  attempt?: number; // Nº de intento (si aplica)
  notes?: string;
  created_at: string;
  synced: boolean;
}

// Objetivo de una prueba para un equipo (referencia para la araña)
export interface TestTarget {
  id: string;
  club_id: string;
  team_id?: string;
  test_type: TestType;
  target_value: number;
  created_at: string;
  updated_at?: string;
}

// Equipo rival (competición)
export interface OpponentTeam {
  id: string;
  club_id: string;
  name: string;
  competition?: string;
  color?: string;
  venue?: string;
  address?: string;
  maps_url?: string;
  notes?: string;
  order?: number;
  created_at?: string;
  deleted_at?: string;
}

// Partido (calendario de competición)
export interface SeasonMatch {
  id: string;
  club_id: string;
  team_id: string;
  opponent: string;
  opponent_id?: string;
  date: string;
  time?: string;
  is_home: boolean;
  venue?: string;
  address?: string;
  drive_link?: string;
  maps_url?: string;
  notes?: string;
  local_score?: number;
  away_score?: number;
  status?: 'scheduled' | 'played' | 'cancelled';
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Vídeo educativo (YouTube)
export interface Video {
  id: string;
  club_id: string;
  title: string;
  youtube_url: string;
  month: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}

// Para la UI del cronómetro
export interface StopwatchState {
  isRunning: boolean;
  elapsed: number; // ms
  startTime: number | null;
  splits: number[];
}

// Estadísticas de jugador
export interface PlayerStats {
  player_id: string;
  player_name: string;
  test_type: TestType;
  best_value: number;
  worst_value: number;
  avg_value: number;
  total_tests: number;
  last_value: number;
  trend: 'up' | 'down' | 'stable';
  improvement_pct: number;
}
