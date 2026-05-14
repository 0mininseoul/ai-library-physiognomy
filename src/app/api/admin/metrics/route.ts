import { NextRequest } from "next/server";
import { isAdminRequest, unauthorized } from "@/lib/admin/basicAuth";
import { buildAdminMetrics, getBoothMetricWindow, type AdminBookRow, type AdminEventRow, type AdminSessionRow } from "@/lib/admin/metrics";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();

  const supabase = getServerSupabase();
  const metricWindow = getBoothMetricWindow();

  const [sessionsResult, eventsResult] = await Promise.all([
    supabase
      .from("library_sessions")
      .select("id, created_at, favorite_category, need_focus, reading_type_code, result_json, recommended_book_ids, name, display_name, student_id, birth_date, gender")
      .gte("created_at", metricWindow.startIso)
      .lt("created_at", metricWindow.endIso)
      .order("created_at", { ascending: false }),
    supabase
      .from("service_events")
      .select("created_at, event_name, session_id, payload")
      .gte("created_at", metricWindow.startIso)
      .order("created_at", { ascending: false }),
  ]);

  if (sessionsResult.error || eventsResult.error) return Response.json({ error: "admin_metrics_failed" }, { status: 500 });

  const sessions = (sessionsResult.data ?? []) as AdminSessionRow[];
  const bookRows = await fetchRecommendedBookRows(supabase, sessions);
  if (bookRows === null) return Response.json({ error: "admin_metrics_failed" }, { status: 500 });

  return Response.json(buildAdminMetrics(sessions, (eventsResult.data ?? []) as AdminEventRow[], bookRows));
}

async function fetchRecommendedBookRows(supabase: ReturnType<typeof getServerSupabase>, sessions: AdminSessionRow[]): Promise<AdminBookRow[] | null> {
  const recommendedDatabaseIds = unique(sessions.flatMap((session) => session.recommended_book_ids ?? []));
  const recommendedSourceIds = unique(sessions.flatMap((session) => session.result_json?.recommendations?.map((book) => book.bookId) ?? []));
  const rows: AdminBookRow[] = [];

  if (recommendedDatabaseIds.length) {
    const { data, error } = await supabase.from("books").select("id, source, source_id").in("id", recommendedDatabaseIds);
    if (error) return null;
    rows.push(...((data ?? []) as AdminBookRow[]));
  }

  if (recommendedSourceIds.length) {
    const { data, error } = await supabase.from("books").select("id, source, source_id").in("source_id", recommendedSourceIds);
    if (error) return null;
    rows.push(...((data ?? []) as AdminBookRow[]));
  }

  return Array.from(new Map(rows.map((row) => [row.id, row])).values());
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
