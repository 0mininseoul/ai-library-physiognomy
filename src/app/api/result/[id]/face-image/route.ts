import { NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("library_sessions")
    .select("face_image_path, status")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data?.face_image_path || data.status !== "complete") {
    return new Response(null, { status: 404, headers: noStoreHeaders() });
  }

  return new Response(null, { status: 410, headers: noStoreHeaders() });
}

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
  };
}
