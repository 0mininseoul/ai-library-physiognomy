import type { ServiceEventName } from "@/lib/events/serviceEvents";

type TrackServiceEventOptions = {
  sessionId?: string | null;
  payload?: Record<string, string | boolean>;
  beacon?: boolean;
};

export async function trackServiceEvent(eventName: ServiceEventName, options: TrackServiceEventOptions = {}) {
  if (typeof window === "undefined") return false;

  const body = JSON.stringify({
    eventName,
    sessionId: options.sessionId ?? null,
    payload: options.payload ?? {},
  });

  if (options.beacon && "sendBeacon" in navigator) {
    const sent = navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    if (sent) return true;
  }

  try {
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function createClientSessionId() {
  const cryptoApi = typeof crypto !== "undefined" ? crypto : null;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
