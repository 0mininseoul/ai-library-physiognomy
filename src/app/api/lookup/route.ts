import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { studentId?: string; birthDate?: string };
  const studentId = body.studentId?.trim();
  const birthDate = body.birthDate?.trim();

  if (!studentId || !birthDate) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("library_sessions")
    .select("id")
    .eq("student_id_lookup_hash", sha256(studentId))
    .eq("birth_date", birthDate)
    .eq("status", "complete")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return Response.json({ error: "lookup_failed" }, { status: 500 });
  if (!data) return Response.json({ error: "not_found" }, { status: 404 });

  return Response.json({ sessionId: data.id });
}

function sha256(input: string): string {
  return createHash("sha256").update(input.trim()).digest("hex");
}
