import { NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { isFaceImageVisible } from "@/lib/privacy/retention";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("library_sessions")
    .select("id, created_at, image_visible_until, face_image_path, display_name, result_json, status")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return Response.json({ error: "result_fetch_failed" }, { status: 500 });
  if (!data || data.status !== "complete" || !data.result_json) return Response.json({ error: "not_found" }, { status: 404 });

  let faceImageUrl: string | null = null;
  const visibleUntil = data.image_visible_until ? new Date(data.image_visible_until) : null;
  const isVisible = visibleUntil ? visibleUntil.getTime() > Date.now() : isFaceImageVisible(new Date(data.created_at));

  if (data.face_image_path && isVisible) {
    faceImageUrl = `/api/result/${data.id}/face-image`;
  }

  return Response.json(
    {
      id: data.id,
      createdAt: data.created_at,
      displayName: data.display_name,
      result: data.result_json,
      faceImageUrl,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
