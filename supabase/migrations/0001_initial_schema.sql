-- ============================================================
-- FIFLP Fútbol Base — Esquema inicial (Supabase / PostgreSQL)
-- Consolidado a partir del modelo probado de WaterMetro, adaptado
-- a fútbol base (categorías f8/f11, sesiones con tipo, competiciones).
-- Aplicar A MANO en Supabase → SQL Editor.
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- 1. TABLAS
-- ═══════════════════════════════════════════════════════════

-- Clubs (multi-tenant)
CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perfiles (extiende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'player')),
  club_id UUID REFERENCES public.clubs(id),
  category_ids UUID[] DEFAULT '{}',
  avatar_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorías de fútbol base
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  "order" INTEGER DEFAULT 0,
  formato TEXT CHECK (formato IN ('f8', 'f11')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipos (plantillas)
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  color TEXT,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jugadores
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  first_last_name TEXT,
  second_last_name TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  birth_date DATE,
  dni TEXT,
  dni_expiry DATE,
  phone TEXT,
  email TEXT,
  gender TEXT CHECK (gender IN ('male', 'female')),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  avatar_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cuerpo técnico
CREATE TABLE IF NOT EXISTS public.technical_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  dni TEXT,
  birth_date DATE,
  dni_expiry DATE,
  phone TEXT,
  role TEXT,
  active BOOLEAN DEFAULT TRUE,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vínculo coach ↔ equipos (un coach puede tener varios equipos)
CREATE TABLE IF NOT EXISTS public.technical_staff_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.technical_staff(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  UNIQUE (staff_id, team_id)
);

-- Permisos de entrenador
CREATE TABLE IF NOT EXISTS public.coach_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  manage_players BOOLEAN DEFAULT TRUE,
  manage_sessions BOOLEAN DEFAULT TRUE,
  view_performance BOOLEAN DEFAULT TRUE,
  access_trash BOOLEAN DEFAULT FALSE,
  manage_teams BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sesiones (entrenamiento / partido / otro)
CREATE TABLE IF NOT EXISTS public.test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  coach_id UUID NOT NULL REFERENCES public.profiles(id),
  date DATE NOT NULL,
  time_start TIME,
  time_end TIME,
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  type TEXT DEFAULT 'training' CHECK (type IN ('training', 'match', 'other')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pruebas incluidas en una sesión
CREATE TABLE IF NOT EXISTS public.session_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.test_sessions(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,
  "order" INTEGER DEFAULT 0
);

-- Resultados individuales
CREATE TABLE IF NOT EXISTS public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.test_sessions(id) ON DELETE CASCADE,
  session_test_id UUID NOT NULL REFERENCES public.session_tests(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  attempt INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipos rivales
CREATE TABLE IF NOT EXISTS public.opponent_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  competition TEXT,
  color TEXT,
  venue TEXT,
  address TEXT,
  maps_url TEXT,
  notes TEXT,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Competiciones (calendario)
CREATE TABLE IF NOT EXISTS public.competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  season TEXT,
  type TEXT CHECK (type IN ('liga', 'copa', 'torneo')),
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partidos (calendario de competición)
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  competition_id UUID REFERENCES public.competitions(id) ON DELETE SET NULL,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  opponent TEXT,
  opponent_id UUID REFERENCES public.opponent_teams(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time TIME,
  is_home BOOLEAN DEFAULT TRUE,
  venue TEXT,
  address TEXT,
  drive_link TEXT,
  maps_url TEXT,
  notes TEXT,
  local_score INTEGER,
  away_score INTEGER,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'played', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Vídeos educativos
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  month TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Objetivos por prueba y equipo
CREATE TABLE IF NOT EXISTS public.test_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,
  target_value DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- 2. ÍNDICES
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_profiles_club ON public.profiles(club_id);
CREATE INDEX IF NOT EXISTS idx_players_club ON public.players(club_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON public.players(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_club ON public.teams(club_id);
CREATE INDEX IF NOT EXISTS idx_sessions_club ON public.test_sessions(club_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.test_sessions(date);
CREATE INDEX IF NOT EXISTS idx_session_tests_session ON public.session_tests(session_id);
CREATE INDEX IF NOT EXISTS idx_results_session ON public.test_results(session_id);
CREATE INDEX IF NOT EXISTS idx_results_player ON public.test_results(player_id);
CREATE INDEX IF NOT EXISTS idx_results_type ON public.test_results(test_type);

-- ═══════════════════════════════════════════════════════════
-- 3. FUNCIONES DE AUTORIZACIÓN (schema privado)
-- ═══════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE uid uuid;
BEGIN
  SELECT auth.uid() INTO uid;
  IF uid IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND role = 'admin');
END;
$$;

CREATE OR REPLACE FUNCTION private.in_club(target_club_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE uid uuid;
BEGIN
  SELECT auth.uid() INTO uid;
  IF uid IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND club_id = target_club_id);
END;
$$;

CREATE OR REPLACE FUNCTION private.can_manage_club(target_club_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE uid uuid;
BEGIN
  SELECT auth.uid() INTO uid;
  IF uid IS NULL THEN RETURN false; END IF;
  IF private.is_admin() THEN RETURN true; END IF;
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND club_id = target_club_id AND role IN ('coach', 'admin'));
END;
$$;

CREATE OR REPLACE FUNCTION private.can_access_session(target_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE c uuid;
BEGIN
  SELECT club_id INTO c FROM public.test_sessions WHERE id = target_session_id;
  IF c IS NULL THEN RETURN false; END IF;
  RETURN private.is_admin() OR private.in_club(c);
END;
$$;

CREATE OR REPLACE FUNCTION private.can_manage_session(target_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE c uuid;
BEGIN
  SELECT club_id INTO c FROM public.test_sessions WHERE id = target_session_id;
  IF c IS NULL THEN RETURN false; END IF;
  RETURN private.can_manage_club(c);
END;
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.in_club(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_manage_club(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_access_session(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_manage_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.in_club(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_manage_club(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_access_session(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_manage_session(uuid) TO authenticated, service_role;

-- ═══════════════════════════════════════════════════════════
-- 4. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_staff_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opponent_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_targets ENABLE ROW LEVEL SECURITY;

-- clubs
CREATE POLICY rls_clubs_select ON public.clubs FOR SELECT TO authenticated USING (private.in_club(id) OR private.is_admin());
CREATE POLICY rls_clubs_manage ON public.clubs FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

-- profiles
CREATE POLICY rls_profiles_select ON public.profiles FOR SELECT TO authenticated USING (private.is_admin() OR id = auth.uid());
CREATE POLICY rls_profiles_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (private.is_admin());
CREATE POLICY rls_profiles_update ON public.profiles FOR UPDATE TO authenticated USING (private.is_admin() OR id = auth.uid()) WITH CHECK (private.is_admin() OR id = auth.uid());
CREATE POLICY rls_profiles_delete ON public.profiles FOR DELETE TO authenticated USING (private.is_admin());

-- categorías
CREATE POLICY rls_categories_select ON public.categories FOR SELECT TO authenticated USING (private.in_club(club_id) OR private.is_admin());
CREATE POLICY rls_categories_manage ON public.categories FOR ALL TO authenticated USING (private.can_manage_club(club_id)) WITH CHECK (private.can_manage_club(club_id));

-- equipos
CREATE POLICY rls_teams_select ON public.teams FOR SELECT TO authenticated USING (private.in_club(club_id) OR private.is_admin());
CREATE POLICY rls_teams_manage ON public.teams FOR ALL TO authenticated USING (private.can_manage_club(club_id)) WITH CHECK (private.can_manage_club(club_id));

-- jugadores
CREATE POLICY rls_players_select ON public.players FOR SELECT TO authenticated USING (private.in_club(club_id) OR private.is_admin());
CREATE POLICY rls_players_manage ON public.players FOR ALL TO authenticated USING (private.can_manage_club(club_id)) WITH CHECK (private.can_manage_club(club_id));

-- cuerpo técnico
CREATE POLICY rls_technical_staff_select ON public.technical_staff FOR SELECT TO authenticated USING (private.in_club(club_id) OR private.is_admin());
CREATE POLICY rls_technical_staff_manage ON public.technical_staff FOR ALL TO authenticated USING (private.can_manage_club(club_id)) WITH CHECK (private.can_manage_club(club_id));

-- vínculo coach/equipos
CREATE POLICY rls_technical_staff_teams_select ON public.technical_staff_teams FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.technical_staff ts WHERE ts.id = staff_id AND (private.in_club(ts.club_id) OR private.is_admin())));
CREATE POLICY rls_technical_staff_teams_manage ON public.technical_staff_teams FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.technical_staff ts WHERE ts.id = staff_id AND private.can_manage_club(ts.club_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.technical_staff ts WHERE ts.id = staff_id AND private.can_manage_club(ts.club_id)));

-- permisos de entrenador
CREATE POLICY rls_coach_permissions_select ON public.coach_permissions FOR SELECT TO authenticated USING (private.in_club(club_id) OR private.is_admin());
CREATE POLICY rls_coach_permissions_manage ON public.coach_permissions FOR ALL TO authenticated USING (private.can_manage_club(club_id)) WITH CHECK (private.can_manage_club(club_id));

-- sesiones
CREATE POLICY rls_test_sessions_select ON public.test_sessions FOR SELECT TO authenticated USING (private.in_club(club_id) OR private.is_admin());
CREATE POLICY rls_test_sessions_manage ON public.test_sessions FOR ALL TO authenticated USING (private.can_manage_club(club_id)) WITH CHECK (private.can_manage_club(club_id));

-- pruebas de sesión
CREATE POLICY rls_session_tests_select ON public.session_tests FOR SELECT TO authenticated USING (private.can_access_session(session_id));
CREATE POLICY rls_session_tests_manage ON public.session_tests FOR ALL TO authenticated USING (private.can_manage_session(session_id)) WITH CHECK (private.can_manage_session(session_id));

-- resultados
CREATE POLICY rls_test_results_select ON public.test_results FOR SELECT TO authenticated USING (private.can_access_session(session_id));
CREATE POLICY rls_test_results_manage ON public.test_results FOR ALL TO authenticated USING (private.can_manage_session(session_id)) WITH CHECK (private.can_manage_session(session_id));

-- rivales
CREATE POLICY rls_opponent_teams_select ON public.opponent_teams FOR SELECT TO authenticated USING (private.in_club(club_id) OR private.is_admin());
CREATE POLICY rls_opponent_teams_manage ON public.opponent_teams FOR ALL TO authenticated USING (private.can_manage_club(club_id)) WITH CHECK (private.can_manage_club(club_id));

-- competiciones
CREATE POLICY rls_competitions_select ON public.competitions FOR SELECT TO authenticated USING (private.in_club(club_id) OR private.is_admin());
CREATE POLICY rls_competitions_manage ON public.competitions FOR ALL TO authenticated USING (private.can_manage_club(club_id)) WITH CHECK (private.can_manage_club(club_id));

-- partidos
CREATE POLICY rls_matches_select ON public.matches FOR SELECT TO authenticated USING (private.in_club(club_id) OR private.is_admin());
CREATE POLICY rls_matches_manage ON public.matches FOR ALL TO authenticated USING (private.can_manage_club(club_id)) WITH CHECK (private.can_manage_club(club_id));

-- vídeos
CREATE POLICY rls_videos_select ON public.videos FOR SELECT TO authenticated USING (private.in_club(club_id) OR private.is_admin());
CREATE POLICY rls_videos_manage ON public.videos FOR ALL TO authenticated USING (private.can_manage_club(club_id)) WITH CHECK (private.can_manage_club(club_id));

-- objetivos
CREATE POLICY rls_test_targets_select ON public.test_targets FOR SELECT TO authenticated USING (private.in_club(club_id) OR private.is_admin());
CREATE POLICY rls_test_targets_manage ON public.test_targets FOR ALL TO authenticated USING (private.can_manage_club(club_id)) WITH CHECK (private.can_manage_club(club_id));

-- ═══════════════════════════════════════════════════════════
-- 5. LECTURA PÚBLICA (informes compartibles sin login)
-- ═══════════════════════════════════════════════════════════

CREATE POLICY rls_public_teams ON public.teams FOR SELECT TO anon USING (true);
CREATE POLICY rls_public_players ON public.players FOR SELECT TO anon USING (true);
CREATE POLICY rls_public_test_sessions ON public.test_sessions FOR SELECT TO anon USING (true);
CREATE POLICY rls_public_session_tests ON public.session_tests FOR SELECT TO anon USING (true);
CREATE POLICY rls_public_test_results ON public.test_results FOR SELECT TO anon USING (true);
CREATE POLICY rls_public_categories ON public.categories FOR SELECT TO anon USING (true);

-- ═══════════════════════════════════════════════════════════
-- 6. GRANTS
-- ═══════════════════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;

-- Lecturas públicas (anon)
GRANT SELECT ON public.teams TO anon;
GRANT SELECT ON public.players TO anon;
GRANT SELECT ON public.test_sessions TO anon;
GRANT SELECT ON public.session_tests TO anon;
GRANT SELECT ON public.test_results TO anon;
GRANT SELECT ON public.categories TO anon;

-- ═══════════════════════════════════════════════════════════
-- 7. TRIGGER DE ALTA (primer usuario = admin + club)
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_club_id UUID;
  display_name TEXT;
  requested_role TEXT;
BEGIN
  display_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), NEW.email);
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'player');

  IF NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) THEN
    INSERT INTO public.clubs (name) VALUES (display_name || ' Club') RETURNING id INTO new_club_id;
    INSERT INTO public.profiles (id, email, full_name, role, club_id)
    VALUES (NEW.id, NEW.email, display_name, 'admin', new_club_id);
  ELSE
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, display_name, CASE WHEN requested_role = 'coach' THEN 'coach' ELSE 'player' END);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Un usuario no puede cambiarse su rol ni moverse de club desde el navegador.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url, category_ids, active, "order") ON public.profiles TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- 8. REALTIME
-- ═══════════════════════════════════════════════════════════

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.test_sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.test_results;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
