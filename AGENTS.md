# AGENTS.md — FIFLP Fútbol Base

## Reglas
1. Trabajar siempre en `main`, sin ramas. Commit + push = deploy (cuando haya Vercel).
2. NO romper código que ya funciona; solo añadir/ajustar lo pedido.
3. Validar SIEMPRE con `tsc` y `build` antes de commitear.
4. NO mezclar proyectos: FIFLP-FutbolBase (fútbol) y WaterMetrics (waterpolo) son proyectos INDEPENDIENTES (repos y Supabases distintos). Al trabajar en uno, NO tocar el otro (ni código, ni Supabase, ni git, ni .env).
5. No commitear `pr_body.md`; commitear rutas concretas.

## Proyecto
- App de seguimiento de rendimiento para **fútbol base** (FIFLP, Las Palmas), extrapolada de WaterMetro.
- Stack: React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Supabase + Dexie + Recharts + vite-plugin-pwa.

## IDs fijos
- Supabase URL: `https://upfruyvprzczviyrzyez.supabase.co`
- Project ref: `upfruyvprzczviyrzyez`
- Repo: `https://github.com/josepear/FIFLP-FutbolBase`
- Ruta local: `/Volumes/RAID/Repos/apps/FIFLP-FutbolBase`
- Web (Vercel): pendiente de crear.

## Comandos (desde `cd /Volumes/RAID/Repos/apps/MetroWater`)
El tool de terminal usa `cd` a MetroWater (root reconocido). Para operar en este repo usar rutas `../FIFLP-FutbolBase/...` y `git -C ../FIFLP-FutbolBase`.

- tsc: `../FIFLP-FutbolBase/node_modules/.bin/tsc -p ../FIFLP-FutbolBase/tsconfig.app.json --noEmit`
- build: `npm --prefix ../FIFLP-FutbolBase run build`
- dev: `npm --prefix ../FIFLP-FutbolBase run dev` (puerto **5174**)
- supabase CLI: usar SIEMPRE `--workdir ../FIFLP-FutbolBase` (nunca `link`/`db push` sin `--workdir`).

## Estructura
```
src/
  App.tsx            → routing por tabs (localStorage 'ffb-tab')
  lib/               → types.ts (TEST_DEFINITIONS fútbol), db.ts (FutbolBaseDB), sync.ts, supabase.ts, utils.ts, stats.ts, hydrate.ts
  hooks/             → useAuth.tsx, useStopwatch.ts, useTabIntroScroll.ts
  components/        → Layout, Avatar, ErrorBoundary, Stopwatch, TestIcon, LiveTestView, ui/*
  pages/             → LoginPage, DashboardPage, SessionPage, PlayersPage, AdminPage
supabase/migrations/ → 0001_initial_schema.sql (ya aplicada en Supabase)
```

## Estado
- Fase 1 completa: capa transversal + esqueleto UI + migración SQL aplicada.
- Fase 2 en curso: Sesiones (crear + LiveTestView), Admin (equipos/categorías), Players (jugadores).
- Pendiente: Rendimiento (radar/evolución), Calendario (competiciones/partidos), informes, Edge Functions de usuarios.

## Gotchas
- `TestIcon` soporta emoji (`iconType: 'emoji'`); las pruebas usan emojis.
- `category_id` está deprecado (usar `team_id`); es opcional en los tipos.
- `0` es un valor válido en resultados (no usar `> 0`).
- El primer usuario creado en Supabase se convierte en admin y crea su club (trigger `handle_new_user`).
- Orden de equipos: usar `sortByOrder(teams)`.
