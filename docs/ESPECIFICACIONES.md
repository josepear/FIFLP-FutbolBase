# ESPECIFICACIÓN — FIFLP Fútbol Base

> Aplicación de seguimiento de rendimiento para fútbol base. Proyecto hermano de WaterMetro (waterpolo), del que reutiliza la arquitectura multi-club, offline-first y de informes.

## 1. Resumen
- Producto: app para que entrenadores registren pruebas y sesiones (entrenamiento y competición), los jugadores vean su progreso y los padres/entrenadores reciban informes.
- PWA offline-first, multi-club, roles admin / coach / player.
- Se parte de WaterMetro: se reutiliza ~90% de la capa transversal y se sustituye la capa de dominio (pruebas de waterpolo por pruebas de fútbol).

## 2. Alcance v1
Incluye:
- Multi-club, autenticación, roles y permisos.
- Equipos, categorías (fútbol base), jugadores y cuerpo técnico.
- Sesiones de entrenamiento con pruebas físicas/técnicas (captura en vivo).
- Calendario de competición: competiciones + partidos (rival, fecha, local/visitante, resultado).
- Resultados con objetivo por prueba/categoría.
- Rendimiento en 3 niveles (Individual / Equipo / Temporada), radar por objetivo y evolución.
- Informes y vistas públicas (jugador, equipo, sesión/partido).
- Offline (Dexie) + sincronización.

No incluye en v1:
- GPS / wearables (importación de datos externos).
- Valoración cualitativa avanzada (se decide en Fase 5).
- Pasarela de pagos / facturación.

## 3. Stack
- React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui.
- Supabase (Auth + Postgres + Edge Functions + Realtime).
- Dexie (IndexedDB) como espejo offline + sync.
- Recharts (gráficas) + ECharts (solo heatmap, carga lazy).
- framer-motion, lucide-react, vite-plugin-pwa.

## 4. Modelo de datos
Reutilizado de WaterMetro, con añadidos específicos de fútbol.

### Reutilizado
- auth.users + profiles (id, email, full_name, first_name, last_name, role, club_id, active, order, avatar_url).
- coach_permissions (profile_id, club_id, manage_players, manage_sessions, view_performance, access_trash, manage_teams).
- technical_staff + technical_staff_teams (vínculo coach/equipos).
- players (club_id, first_name, last_name, full_name, team_id, phone, email, gender, birth_date, dni, dni_expiry, avatar_url, profile_id, order).
- teams (name, color, order) y categories (name, order, formato).
- test_sessions (club_id, team_id, coach_id, date, status, type) + session_tests + test_results (session_id, session_test_id, player_id, test_type, value, attempt, notes).

### Nuevo para fútbol
- competitions: id, club_id, name, season, type (liga / copa / torneo), order.
- matches: id, club_id, competition_id, team_id, opponent_team_id, date, time, home_away, local_score, away_score, status (scheduled / played / cancelled), notes.
- match_events (opcional, Fase 5): id, match_id, player_id, event_type (gol / asistencia / tarjeta / cambio), minute, notes.
- categories.formato: f8 | f11 (afecta a qué pruebas y objetivos se muestran).

## 5. Catálogo de pruebas (fútbol base)
Unidades disponibles: count, seconds, meters, hits, cm, level, points, rating.

### Velocidad y agilidad
- sprint_10m (seconds, menor mejor, crono)
- sprint_20m (seconds, menor mejor, crono)
- sprint_30m (seconds, menor mejor, crono)
- agilidad_5_10_5 (seconds, menor mejor, crono)

### Salto y potencia
- salto_vertical_cmj (cm, mayor mejor)
- salto_horizontal (cm, mayor mejor)
- lanzamiento_balon_medicinal (meters, mayor mejor)

### Resistencia
- course_navette (level, mayor mejor)
- cooper (meters en 12 min, mayor mejor, crono)

### Técnica y precisión (con balón)
- pases_precision (hits/10, mayor mejor, maxAttempts 10)
- tiro_porteria_zonas (points, mayor mejor)
- conduccion_dribbling (seconds, menor mejor, crono)
- control_orientado (rating 1-5, mayor mejor) — solo si se activa la valoración cualitativa

## 6. Objetivos por categoría (PROPUESTA inicial, Alevín como referencia)
Marcados como PROPUESTA: validar con el entrenador antes de usarlos.

| Prueba | Alevín (Sub-12/13) |
|---|---|
| sprint_20m | 3.8 s |
| salto_vertical_cmj | 28 cm |
| course_navette | nivel 7 |
| pases_precision | 7 / 10 |
| tiro_porteria_zonas | 6 puntos |

El resto de categorías (Prebenjamín, Benjamín, Infantil, Cadete, Juvenil, Sénior) se definen en una fase posterior, con los mismos criterios.

## 7. Pantallas y roles
- Login, Dashboard (inicio), Sesiones, Jugadores, Rendimiento, Informes, Calendario, Admin, Usuarios, Perfil, Papelera.
- Calendario: competiciones + partidos + sesiones en vista de calendario.
- Vistas públicas sin login: #p/{player}, #e/{team}, #i/{session o match}.

## 8. Fases del plan
- F0: especificación (este documento).
- F1: scaffold + capa transversal (auth, roles, equipos/categorías, jugadores).
- F2: catálogo de pruebas + sesiones + captura en vivo + objetivos.
- F3: rendimiento (radar / evolución / temporada) + informes.
- F4: calendario de competición + partidos.
- F5: valoración cualitativa + eventos de partido (opcional).

## 9. Decisiones abiertas
- ¿Valoración cualitativa (rating) en v1 o en F5?
- ¿Eventos de partido (goles/asistencias) en v1?
- Objetivos exactos por categoría (validar con entrenador).
- Nombre/marca final y colores por equipo.
