import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/calculator";

describe("calculateSaju", () => {
  it("calculates date-only pillars for 2000-11-13 without relying on Gemini", () => {
    const result = calculateSaju("2000-11-13");

    expect(result.yearPillar.label).toBe("庚辰");
    expect(result.monthPillar.label).toBe("丁亥");
    expect(result.dayPillar.label).toBe("乙亥");
    expect(result.dayMaster.label).toBe("乙木");
    expect(result.dayMaster.element).toBe("wood");
    expect(result.dominantElements[0]).toBe("water");
    expect(result.elementCounts.water).toBeGreaterThan(result.elementCounts.earth);
  });

  it("marks the result as date-only precision because birth time is not collected", () => {
    const result = calculateSaju("2000-11-13");

    expect(result.precision).toBe("date_only");
    expect(result.hourPillar).toBeNull();
  });
});
