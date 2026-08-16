-- ============================================================
-- FIFLP Fútbol Base — Eventos de partido (F5)
-- Aplicar A MANO en Supabase → SQL Editor (proyecto upfruyvprzczviyrzyez).
-- ============================================================

-- Eventos de partido: goles, asistencias, tarjetas y cambios.
CREATE TABLE IF NOT EXISTS public.match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('gol', 'asistencia', 'tarjeta_amarilla', 'tarjeta_roja', 'cambio_entra', 'cambio_sale')),
  minute INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_match_events_club ON public.match_events(club_id);
CREATE INDEX IF NOT EXISTS idx_match_events_match ON public.match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_events_player ON public.match_events(player_id);

-- RLS
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_match_events_select ON public.match_events;
CREATE POLICY rls_match_events_select ON public.match_events FOR SELECT TO authenticated USING (private.in_club(club_id) OR private.is_admin());

DROP POLICY IF EXISTS rls_match_events_manage ON public.match_events;
CREATE POLICY rls_match_events_manage ON public.match_events FOR ALL TO authenticated USING (private.can_manage_club(club_id)) WITH CHECK (private.can_manage_club(club_id));

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_events TO service_role;
