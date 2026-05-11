import { NextRequest } from "next/server";
import { imageVisibleUntil } from "@/lib/privacy/retention";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("library_sessions")
    .select("created_at, image_visible_until, face_image_path, status")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data?.face_image_path || data.status !== "complete") {
    return new Response(null, { status: 404, headers: noStoreHeaders() });
  }

  const visibleUntil = data.image_visible_until ? new Date(data.image_visible_until) : imageVisibleUntil(new Date(data.created_at));
  if (visibleUntil.getTime() <= Date.now()) {
    return new Response(null, { status: 410, headers: noStoreHeaders() });
  }

  const signed = await supabase.storage.from("face-images").createSignedUrl(data.face_image_path, 60 * 10);
  if (!signed.data?.signedUrl) {
    return new Response(null, { status: 404, headers: noStoreHeaders() });
  }

  return new Response(null, {
    status: 302,
    headers: {
      ...noStoreHeaders(),
      Location: signed.data.signedUrl,
    },
  });
}

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
  };
}
