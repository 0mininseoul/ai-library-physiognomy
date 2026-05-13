import { NextRequest } from "next/server";
import { isAdminRequest, unauthorized } from "@/lib/admin/basicAuth";
import { buildAdminMetrics, type AdminEventRow, type AdminSessionRow } from "@/lib/admin/metrics";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();

  const supabase = getServerSupabase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [sessionsResult, eventsResult] = await Promise.all([
    supabase
      .from("library_sessions")
      .select("created_at, favorite_category, reading_type_code, result_json, display_name, student_id")
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("service_events")
      .select("created_at, event_name, payload")
      .eq("event_name", "book_qr_result_open")
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false }),
  ]);

  if (sessionsResult.error || eventsResult.error) return Response.json({ error: "admin_metrics_failed" }, { status: 500 });

  return Response.json(buildAdminMetrics((sessionsResult.data ?? []) as AdminSessionRow[], (eventsResult.data ?? []) as AdminEventRow[]));
}
