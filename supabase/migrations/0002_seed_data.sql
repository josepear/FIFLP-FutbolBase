-- ============================================================
-- 0002_seed_data.sql — Datos de ejemplo (Alevín + Infantil)
-- Categorías, equipos, jugadores, objetivos, sesiones y resultados
-- ============================================================

DO $$
DECLARE
  c_id uuid;
  a_id uuid;
  alevin_cat uuid;
  infantil_cat uuid;
  alevin_team uuid;
  infantil_team uuid;
BEGIN
  SELECT id INTO c_id FROM public.clubs ORDER BY created_at LIMIT 1;
  SELECT id INTO a_id FROM public.profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1;

  -- Categorías
  INSERT INTO public.categories (id, club_id, name, "order", formato) VALUES
    (gen_random_uuid(), c_id, 'Alevín', 1, 'f8'),
    (gen_random_uuid(), c_id, 'Infantil', 2, 'f11'),
    (gen_random_uuid(), c_id, 'Benjamín', 3, 'f8'),
    (gen_random_uuid(), c_id, 'Cadete', 4, 'f11');

  SELECT id INTO alevin_cat FROM public.categories WHERE club_id = c_id AND name = 'Alevín' LIMIT 1;
  SELECT id INTO infantil_cat FROM public.categories WHERE club_id = c_id AND name = 'Infantil' LIMIT 1;

  -- Equipos
  INSERT INTO public.teams (id, club_id, category_id, name, color, "order") VALUES
    (gen_random_uuid(), c_id, alevin_cat, 'Alevín A', '#ef4444', 1),
    (gen_random_uuid(), c_id, infantil_cat, 'Infantil A', '#3b82f6', 2);

  SELECT id INTO alevin_team FROM public.teams WHERE club_id = c_id AND name = 'Alevín A' LIMIT 1;
  SELECT id INTO infantil_team FROM public.teams WHERE club_id = c_id AND name = 'Infantil A' LIMIT 1;

  -- Jugadores
  INSERT INTO public.players (id, club_id, full_name, team_id, birth_date, active) VALUES
    (gen_random_uuid(), c_id, 'Hugo Rodríguez Santana', alevin_team, '2012-03-15', true),
    (gen_random_uuid(), c_id, 'Álvaro García Pérez', alevin_team, '2012-06-22', true),
    (gen_random_uuid(), c_id, 'Daniel Martín López', alevin_team, '2012-09-10', true),
    (gen_random_uuid(), c_id, 'Pablo Hernández Ruiz', alevin_team, '2013-01-18', true),
    (gen_random_uuid(), c_id, 'Alejandro Fernández Díaz', alevin_team, '2012-11-05', true),
    (gen_random_uuid(), c_id, 'Adrián Sánchez Gómez', alevin_team, '2013-04-30', true),
    (gen_random_uuid(), c_id, 'David González Castro', infantil_team, '2010-02-12', true),
    (gen_random_uuid(), c_id, 'Sergio Ramírez Ortega', infantil_team, '2010-05-25', true),
    (gen_random_uuid(), c_id, 'Iván Morales Cabrera', infantil_team, '2011-03-08', true),
    (gen_random_uuid(), c_id, 'Raúl Jiménez Molina', infantil_team, '2010-09-17', true),
    (gen_random_uuid(), c_id, 'Carlos Navarro Flores', infantil_team, '2011-07-01', true),
    (gen_random_uuid(), c_id, 'Rubén Ortega Peña', infantil_team, '2010-12-20', true);

  -- Objetivos (club-wide, araña)
  INSERT INTO public.test_targets (id, club_id, team_id, test_type, target_value) VALUES
    (gen_random_uuid(), c_id, NULL, 'sprint_10m', 1.9),
    (gen_random_uuid(), c_id, NULL, 'sprint_20m', 3.6),
    (gen_random_uuid(), c_id, NULL, 'sprint_30m', 5.2),
    (gen_random_uuid(), c_id, NULL, 'agilidad_5_10_5', 5.5),
    (gen_random_uuid(), c_id, NULL, 'salto_vertical_cmj', 28),
    (gen_random_uuid(), c_id, NULL, 'salto_horizontal', 150),
    (gen_random_uuid(), c_id, NULL, 'lanzamiento_balon_medicinal', 5),
    (gen_random_uuid(), c_id, NULL, 'course_navette', 7),
    (gen_random_uuid(), c_id, NULL, 'cooper', 2200),
    (gen_random_uuid(), c_id, NULL, 'pases_precision', 7),
    (gen_random_uuid(), c_id, NULL, 'tiro_porteria_zonas', 6),
    (gen_random_uuid(), c_id, NULL, 'conduccion_dribbling', 14);

  -- Sesiones
  INSERT INTO public.test_sessions (id, club_id, team_id, coach_id, date, status, type) VALUES
    (gen_random_uuid(), c_id, alevin_team, a_id, '2026-09-15', 'completed', 'training'),
    (gen_random_uuid(), c_id, infantil_team, a_id, '2026-10-20', 'completed', 'training');

  -- Pruebas de cada sesión
  INSERT INTO public.session_tests (id, session_id, test_type, "order")
  SELECT gen_random_uuid(), s.id, t.test_type, t.ord
  FROM (SELECT id FROM public.test_sessions WHERE club_id = c_id) s
  CROSS JOIN (VALUES ('sprint_20m', 1), ('salto_vertical_cmj', 2), ('pases_precision', 3), ('conduccion_dribbling', 4)) AS t(test_type, ord);

  -- Resultados (valores plausibles alrededor del objetivo)
  INSERT INTO public.test_results (id, session_id, session_test_id, player_id, test_type, value, created_at)
  SELECT gen_random_uuid(), st.session_id, st.id, p.id, st.test_type,
    CASE st.test_type
      WHEN 'sprint_20m' THEN round((3.3 + random()*1.2)::numeric, 2)::double precision
      WHEN 'salto_vertical_cmj' THEN round((20 + random()*20)::numeric, 1)::double precision
      WHEN 'pases_precision' THEN floor(random()*11)::double precision
      WHEN 'conduccion_dribbling' THEN round((11 + random()*7)::numeric, 2)::double precision
      ELSE 0
    END,
    now()
  FROM public.session_tests st
  JOIN public.test_sessions s ON s.id = st.session_id
  JOIN public.players p ON p.team_id = s.team_id
  WHERE s.club_id = c_id;
END $$;
