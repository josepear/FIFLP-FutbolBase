// Actualiza el email y/o la contraseña de un usuario desde el panel de administración.
// Solo un admin autenticado del MISMO club puede usarla. service_role nunca sale de Supabase.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "http://localhost:5174",
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

  const { userId, email, password } = await request.json() as { userId?: string; email?: string; password?: string };
  if (!userId || (!email && !password)) {
    return json({ error: "Indica un usuario y al menos email o contraseña" }, 400, origin);
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Email no válido" }, 400, origin);
  }
  if (password && password.length < 6) {
    return json({ error: "La contraseña debe tener al menos 6 caracteres" }, 400, origin);
  }

  const auth = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerAuth } = await auth.auth.getUser(accessToken);
  if (!callerAuth.user) return json({ error: "Tu sesión ha caducado. Entra de nuevo." }, 401, origin);

  const { data: caller } = await auth.from("profiles").select("role, club_id").eq("id", callerAuth.user.id).maybeSingle();
  if (!caller || caller.role !== "admin") return json({ error: "Solo un administrador puede editar usuarios." }, 403, origin);

  const { data: target } = await auth.from("profiles").select("id, club_id").eq("id", userId).maybeSingle();
  if (!target || target.club_id !== caller.club_id) return json({ error: "Usuario no encontrado o de otro club." }, 404, origin);

  if (email) {
    const { error: authErr } = await auth.auth.admin.updateUserById(userId, { email });
    if (authErr) return json({ error: authErr.message }, 400, origin);
    const { error: profileErr } = await auth.from("profiles").update({ email }).eq("id", userId);
    if (profileErr) return json({ error: profileErr.message }, 400, origin);
  }

  if (password) {
    const { error: authErr } = await auth.auth.admin.updateUserById(userId, { password });
    if (authErr) return json({ error: authErr.message }, 400, origin);
  }

  return json({ ok: true }, 200, origin);
});
