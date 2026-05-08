import { displayGivenName, hasFinalConsonant, particle, vocative } from "@/lib/korean/name";
import { describe, expect, it } from "vitest";

describe("displayGivenName", () => {
  it("removes the first Korean surname character for common 3-character names", () => {
    expect(displayGivenName("박영민")).toBe("영민");
    expect(displayGivenName("박건우")).toBe("건우");
  });

  it("keeps non-Korean or short names stable", () => {
    expect(displayGivenName("민")).toBe("민");
    expect(displayGivenName("Alex")).toBe("Alex");
  });
});

describe("particles", () => {
  it("detects final consonants", () => {
    expect(hasFinalConsonant("영민")).toBe(true);
    expect(hasFinalConsonant("건우")).toBe(false);
  });

  it("formats common particles naturally", () => {
    expect(particle("영민", "subject")).toBe("영민이");
    expect(particle("건우", "subject")).toBe("건우가");
    expect(particle("영민", "to")).toBe("영민이에게");
    expect(particle("건우", "to")).toBe("건우에게");
    expect(vocative("영민")).toBe("영민아");
    expect(vocative("건우")).toBe("건우야");
  });

  it("uses 로 for direction particles after ㄹ-final names", () => {
    expect(particle("서울", "direction")).toBe("서울로");
  });
});
