import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { isFaceImageVisible } from "@/lib/privacy/retention";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

  await trackBookQrOpen(req, supabase, data.id).catch((error) => {
    console.warn("[api/result] QR tracking failed", error);
  });

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

async function trackBookQrOpen(req: NextRequest, supabase: ReturnType<typeof getServerSupabase>, sessionId: string) {
  const source = req.nextUrl.searchParams.get("src");
  if (source !== "book_qr") return;

  const userAgent = req.headers.get("user-agent") ?? "";
  const isMobile = isMobileUserAgent(userAgent);
  const { error } = await supabase.from("service_events").insert({
    session_id: sessionId,
    event_name: "book_qr_result_open",
    payload: {
      source,
      view: req.nextUrl.searchParams.get("m") === "1" ? "mobile_result" : "result",
      isMobile,
      deviceType: isMobile ? "mobile" : "desktop",
      userAgentHash: sha256(userAgent),
    },
  });

  if (error) throw error;
}

function isMobileUserAgent(userAgent: string) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(userAgent);
}

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}
