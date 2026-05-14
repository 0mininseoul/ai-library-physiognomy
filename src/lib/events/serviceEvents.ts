export const SERVICE_EVENT_NAMES = ["name_input_started", "analysis_session_created", "result_reanalysis_requested"] as const;

export type ServiceEventName = (typeof SERVICE_EVENT_NAMES)[number];

export type NormalizedServiceEventBody = {
  eventName: ServiceEventName;
  sessionId: string | null;
  payload: Record<string, string | boolean>;
};

const SAFE_PAYLOAD_KEYS = ["clientSessionId", "page"] as const;

export function normalizeServiceEventBody(input: unknown): NormalizedServiceEventBody | null {
  if (!input || typeof input !== "object") return null;

  const candidate = input as {
    eventName?: unknown;
    sessionId?: unknown;
    payload?: unknown;
  };
  if (!isServiceEventName(candidate.eventName)) return null;

  return {
    eventName: candidate.eventName,
    sessionId: typeof candidate.sessionId === "string" && candidate.sessionId.trim() ? candidate.sessionId.trim() : null,
    payload: safePayload(candidate.payload),
  };
}

function isServiceEventName(value: unknown): value is ServiceEventName {
  return typeof value === "string" && SERVICE_EVENT_NAMES.includes(value as ServiceEventName);
}

function safePayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return {};
  const source = payload as Record<string, unknown>;
  const result: Record<string, string | boolean> = {};

  for (const key of SAFE_PAYLOAD_KEYS) {
    const value = source[key];
    if (typeof value === "string") result[key] = value.slice(0, 160);
    if (typeof value === "boolean") result[key] = value;
  }

  return result;
}
