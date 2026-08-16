// Crea un usuario desde el panel de administración SIN cambiar la sesión del admin.
// Solo un admin autenticado del club puede usarla. service_role nunca sale de Supabase.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "http://localhost:5174",
  "https://fiflp-futbolbase.pages.dev",
]);

function corsHeaders(origin: string | null) {
  return {
    ...(origin && allowedOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const json = (body: unknown, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405, origin);

  const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!accessToken || !supabaseUrl || !serviceRoleKey) {
    return json({ error: "Falta la configuración necesaria" }, 500, origin);
  }

  const { email, password, fullName, role } = await request.json() as { email?: string; password?: string; fullName?: string; role?: string };
  if (!email || !password || !fullName || !role) {
    return json({ error: "Faltan datos (email, contraseña, nombre o rol)" }, 400, origin);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Email no válido" }, 400, origin);
  }
  if (password.length < 6) {
    return json({ error: "La contraseña debe tener al menos 6 caracteres" }, 400, origin);
  }
  if (!["admin", "coach", "player"].includes(role)) {
    return json({ error: "Rol no válido" }, 400, origin);
  }

  const auth = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerAuth } = await auth.auth.getUser(accessToken);
  if (!callerAuth.user) return json({ error: "Tu sesión ha caducado. Entra de nuevo." }, 401, origin);

  const { data: caller } = await auth.from("profiles").select("role, club_id").eq("id", callerAuth.user.id).maybeSingle();
  if (!caller || caller.role !== "admin") return json({ error: "Solo un administrador puede crear usuarios." }, 403, origin);

  const { data: created, error: createErr } = await auth.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role, club_id: caller.club_id },
  });
  if (createErr) return json({ error: createErr.message }, 400, origin);

  const userId = created.user?.id;
  if (userId) {
    // Asegurar role y club en el perfil (el trigger fuerza coach/player por defecto)
    await auth.from("profiles").update({ role, club_id: caller.club_id }).eq("id", userId);
    if (role === "coach") {
      await auth.from("coach_permissions").insert({
        profile_id: userId,
        club_id: caller.club_id,
        manage_players: true,
        manage_sessions: true,
        view_performance: true,
        access_trash: false,
        manage_teams: false,
      });
      await auth.from("technical_staff").insert({
        club_id: caller.club_id,
        profile_id: userId,
        full_name: fullName,
      });
    }
  }

  return json({ ok: true, userId }, 200, origin);
});
