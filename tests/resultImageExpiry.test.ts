import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getResult } from "@/app/api/result/[id]/route";
import { GET as getFaceImage } from "@/app/api/result/[id]/face-image/route";

const supabaseServerMock = vi.hoisted(() => ({
  getServerSupabase: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: supabaseServerMock.getServerSupabase,
}));

function mockSessionQuery(row: Record<string, unknown> | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });

  return { from, select, eq, maybeSingle };
}

describe("result face image visibility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-11T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    supabaseServerMock.getServerSupabase.mockReset();
  });

  it("does not expose a result page face image URL even before image_visible_until", async () => {
    const query = mockSessionQuery({
      id: "session-1",
      created_at: "2026-05-09T00:00:00.000Z",
      image_visible_until: "2026-06-08T00:00:00.000Z",
      face_image_path: "session-1/capture.jpg",
      display_name: "영민",
      result_json: { readingType: { code: "focus_reboot" } },
      status: "complete",
    });
    supabaseServerMock.getServerSupabase.mockReturnValue({ from: query.from });

    const response = await getResult(new NextRequest("http://localhost/api/result/session-1"), {
      params: { id: "session-1" },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.faceImageUrl).toBeNull();
  });

  it("does not create a signed face image URL even before image_visible_until", async () => {
    const query = mockSessionQuery({
      image_visible_until: "2026-06-08T00:00:00.000Z",
      face_image_path: "session-1/capture.jpg",
      status: "complete",
    });
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://storage.example.com/signed-face.jpg" },
      error: null,
    });
    supabaseServerMock.getServerSupabase.mockReturnValue({
      from: query.from,
      storage: { from: vi.fn().mockReturnValue({ createSignedUrl }) },
    });

    const response = await getFaceImage(new NextRequest("http://localhost/api/result/session-1/face-image"), {
      params: { id: "session-1" },
    });

    expect(response.status).toBe(410);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });
});
