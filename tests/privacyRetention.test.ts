import { describe, expect, it } from "vitest";
import {
  imageVisibleUntil,
  isFaceImageVisible,
  sessionExpiresAt,
} from "@/lib/privacy/retention";

describe("privacy retention", () => {
  const createdAt = new Date("2026-05-08T00:00:00.000Z");

  it("keeps face images visible during the 30 day result window", () => {
    expect(imageVisibleUntil(createdAt).toISOString()).toBe(
      "2026-06-07T00:00:00.000Z",
    );
    expect(
      isFaceImageVisible(createdAt, new Date("2026-06-06T23:59:59.000Z")),
    ).toBe(true);
    expect(
      isFaceImageVisible(createdAt, new Date("2026-06-07T00:00:01.000Z")),
    ).toBe(false);
  });

  it("expires sessions after 30 days", () => {
    expect(sessionExpiresAt(createdAt).toISOString()).toBe(
      "2026-06-07T00:00:00.000Z",
    );
  });
});
