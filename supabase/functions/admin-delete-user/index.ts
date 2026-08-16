// Borra un usuario de forma limpia desde el panel de administración.
// Solo un admin autenticado del MISMO club puede usarla.
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

  const { userId } = await request.json() as { userId?: string };
  if (!userId) return json({ error: "Indica un usuario" }, 400, origin);

  const auth = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerAuth } = await auth.auth.getUser(accessToken);
  if (!callerAuth.user) return json({ error: "Tu sesión ha caducado. Entra de nuevo." }, 401, origin);

  const { data: caller } = await auth.from("profiles").select("role, club_id").eq("id", callerAuth.user.id).maybeSingle();
  if (!caller || caller.role !== "admin") return json({ error: "Solo un administrador puede borrar usuarios." }, 403, origin);

  const { data: target } = await auth.from("profiles").select("id, club_id, role").eq("id", userId).maybeSingle();
  if (!target || target.club_id !== caller.club_id) return json({ error: "Usuario no encontrado o de otro club." }, 404, origin);

  const { error: authErr } = await auth.auth.admin.deleteUser(userId);
  if (authErr) return json({ error: authErr.message }, 400, origin);

  await auth.from("profiles").delete().eq("id", userId);
  await auth.from("coach_permissions").delete().eq("profile_id", userId);

  const { data: staffRows } = await auth.from("technical_staff").select("id").eq("profile_id", userId);
  if (staffRows && staffRows.length > 0) {
    const staffIds = staffRows.map((s: any) => s.id);
    await auth.from("technical_staff_teams").delete().in("staff_id", staffIds);
    await auth.from("technical_staff").delete().eq("profile_id", userId);
  }

  if (target.role === "player") {
    await auth.from("players").update({ profile_id: null }).eq("profile_id", userId);
  }

  return json({ ok: true }, 200, origin);
});
