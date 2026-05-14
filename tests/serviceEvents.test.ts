import { describe, expect, it } from "vitest";
import { normalizeServiceEventBody } from "@/lib/events/serviceEvents";

describe("service event normalization", () => {
  it("accepts booth tracking events and preserves only safe payload keys", () => {
    expect(
      normalizeServiceEventBody({
        eventName: "name_input_started",
        payload: {
          clientSessionId: "client-1",
          page: "/",
          name: "개인정보",
        },
      }),
    ).toEqual({
      eventName: "name_input_started",
      sessionId: null,
      payload: {
        clientSessionId: "client-1",
        page: "/",
      },
    });

    expect(
      normalizeServiceEventBody({
        eventName: "result_reanalysis_requested",
        sessionId: "session-1",
        payload: { clientSessionId: "client-1" },
      }),
    ).toEqual({
      eventName: "result_reanalysis_requested",
      sessionId: "session-1",
      payload: {
        clientSessionId: "client-1",
      },
    });
  });

  it("rejects unsupported events", () => {
    expect(normalizeServiceEventBody({ eventName: "unknown", payload: {} })).toBeNull();
  });
});
