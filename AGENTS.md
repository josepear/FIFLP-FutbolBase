# AGENTS.md — FIFLP Fútbol Base

## Reglas
1. Trabajar siempre en `main`, sin ramas. Commit + push = deploy.
2. NO romper código que ya funciona; solo añadir/ajustar lo pedido.
3. Validar SIEMPRE con `tsc` y `build` antes de commitear.
4. NO mezclar proyectos: FIFLP-FutbolBase (fútbol) y WaterMetrics (waterpolo) son proyectos INDEPENDIENTES (repos y Supabases distintos). Al trabajar en uno, NO tocar el otro (ni código, ni Supabase, ni git, ni .env).
5. No commitear `pr_body.md`; commitear rutas concretas, no `git add -A`.

## Proyecto
- App de seguimiento de rendimiento para **fútbol base** (FIFLP, Las Palmas), extrapolada de WaterMetro.
- Stack: React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Supabase + Dexie + Recharts + vite-plugin-pwa.

## IDs fijos
- Supabase URL: `https://upfruyvprzczviyrzyez.supabase.co`
- Project ref: `upfruyvprzczviyrzyez`
- Repo: `https://github.com/josepear/FIFLP-FutbolBase`
- Ruta local: `/Volumes/RAID/Repos/apps/FIFLP-FutbolBase`
- Web: `https://fiflp-futbolbase.pages.dev` (Cloudflare Pages)

## Comandos (desde `cd /Volumes/RAID/Repos/apps/MetroWater`)
El tool de terminal usa `cd` a MetroWater (root reconocido). Para operar en este repo usar rutas `../FIFLP-FutbolBase/...` y `git -C ../FIFLP-FutbolBase`.

- tsc: `../FIFLP-FutbolBase/node_modules/.bin/tsc -p ../FIFLP-FutbolBase/tsconfig.app.json --noEmit`
- build: `npm --prefix ../FIFLP-FutbolBase run build`
- dev: `npm --prefix ../FIFLP-FutbolBase run dev` (puerto **5174**)
- supabase CLI: usar SIEMPRE `--workdir ../FIFLP-FutbolBase` (nunca `link`/`db push` sin `--workdir`).

## Deploy (Cloudflare Pages)
- Commit + push a `main` → Cloudflare Pages auto-deploy a `https://fiflp-futbolbase.pages.dev`.
- Config de Pages: build `npm run build`, output `dist`, root vacío. Variables de entorno (en pestaña **string**, NO secret): `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Migraciones SQL: se aplican a mano en Supabase → SQL Editor (proyecto `upfruyvprzczviyrzyez`). Aplicadas: `0001`, `0002`, `0003`.
- Edge Functions: `supabase functions deploy <nombre> --project-ref upfruyvprzczviyrzyez --workdir ../FIFLP-FutbolBase`.

## Estructura
```
src/
  App.tsx            → routing por tabs (localStorage 'ffb-tab') + lazy-load de páginas (code splitting)
  lib/               → types.ts (TEST_DEFINITIONS fútbol), db.ts (FutbolBaseDB), sync.ts, supabase.ts, utils.ts, stats.ts, hydrate.ts
  hooks/             → useAuth.tsx, useStopwatch.ts, useTabIntroScroll.ts
  components/        → Layout, Avatar, ErrorBoundary, Stopwatch, TestIcon, RadarChart, LiveTestView, ui/*
  pages/             → LoginPage, DashboardPage, SessionPage, PlayersPage, PerformancePage, CalendarPage, ReportsPage, AdminPage
                       + vistas públicas: PlayerPublicView (#p/), TeamPublicView (#e/), SessionReportView (#i/)
supabase/migrations/ → 0001_initial_schema.sql, 0002_seed_data.sql, 0003_handle_new_user_club.sql
supabase/functions/  → admin-create-user, admin-update-user, admin-delete-user
```

## Estado
- F1 (scaffold + transversal), F2 (pruebas + sesiones + LiveTestView + objetivos), F3 (rendimiento + informes + vistas públicas), F4 (calendario de competiciones/partidos): **completas**.
- F5 (valoración cualitativa rating + eventos de partido): **opcional, no hecha**.
- Code splitting ya aplicado (build divide en chunks).

## Gotchas
- `TestIcon` soporta emoji (`iconType: 'emoji'`); las pruebas usan emojis.
- `category_id` está deprecado (usar `team_id`); es opcional en los tipos.
- `0` es un valor válido en resultados (no usar `> 0`).
- El primer usuario creado en Supabase se convierte en admin y crea su club (trigger `handle_new_user`).
- Orden de equipos: usar `sortByOrder(teams)`.
- `test_results` NO tiene columna `club_id` (solo `session_id`, `player_id`...); el realtime de esa tabla no se puede filtrar por club sin tocar el esquema.

## Costes / Egress (Supabase) — leído antes de tocar sync
- **El egress es a nivel de ORGANIZACIÓN**, no de proyecto. WaterMetrics (`pbnslqmilrlxilocakql`) y FIFLP-FutbolBase (`upfruyvprzczviyrzyez`) están en la misma org y **comparten** los 5 GB/mes del plan Free. El contador del dashboard (Usage) suma ambos.
- **Bug que disparó el egress (ya corregido, commit `6b23e3a` aquí y `c4f4dbf2` en waterpolo):** `startAutoSync` hacía `pullRemoteData()` (descarga de TODAS las tablas) cada 30 s, + realtime que re-descargaba todo por cada evento.
- **Fix aplicado (mantener SIEMPRE):** separar push de pull en `src/lib/sync.ts`:
  - `pushPendingChanges()` cada **30 s** (subir pendientes, barato).
  - `pullRemoteData()` cada **10 min** (descargar todo, caro en egress).
  - Realtime con **debounce** + **canal único** (`ensureRealtime`/`removeRealtime` en `useAuth.tsx`).
  - NO volver a un único `setInterval` de 30 s que haga push+pull juntos.
- **Qué pasa al superar el límite Free** (según doc oficial Spend Cap): NO se cobra el exceso, pero el recurso (egress) se **desactiva hasta el siguiente ciclo de facturación**; la app puede dejar de leer datos de Supabase. Los datos NO se pierden.
- El dato de egress refresca **cada ~1 h**; las pestañas abiertas antes de un deploy de sync siguen gastando hasta recargarse.
