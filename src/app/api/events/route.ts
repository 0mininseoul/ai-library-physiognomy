import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { normalizeServiceEventBody } from "@/lib/events/serviceEvents";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const normalized = normalizeServiceEventBody(body);
  if (!normalized) return Response.json({ error: "unsupported_event" }, { status: 400 });

  const userAgent = req.headers.get("user-agent") ?? "";
  const isMobile = isMobileUserAgent(userAgent);
  const { error } = await getServerSupabase().from("service_events").insert({
    session_id: normalized.sessionId,
    event_name: normalized.eventName,
    payload: {
      ...normalized.payload,
      isMobile,
      deviceType: isMobile ? "mobile" : "desktop",
      userAgentHash: sha256(userAgent),
    },
  });

  if (error) return Response.json({ error: "event_insert_failed" }, { status: 500 });
  return Response.json({ ok: true }, { status: 201 });
}

function isMobileUserAgent(userAgent: string) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(userAgent);
}

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}
