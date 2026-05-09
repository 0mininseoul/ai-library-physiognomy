import { describe, expect, it } from "vitest";
import { applyConnectedBlackKeyToImageData } from "@/lib/chroma/blackKey";

function image(width: number, height: number, fill: [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = fill[0];
    data[index + 1] = fill[1];
    data[index + 2] = fill[2];
    data[index + 3] = fill[3];
  }
  return { width, height, data };
}

function setPixel(input: ReturnType<typeof image>, x: number, y: number, rgba: [number, number, number, number]) {
  const offset = (y * input.width + x) * 4;
  input.data[offset] = rgba[0];
  input.data[offset + 1] = rgba[1];
  input.data[offset + 2] = rgba[2];
  input.data[offset + 3] = rgba[3];
}

function alpha(input: ReturnType<typeof image>, x: number, y: number) {
  return input.data[(y * input.width + x) * 4 + 3];
}

describe("applyConnectedBlackKeyToImageData", () => {
  it("removes black background connected to the frame but preserves black details inside the cat", () => {
    const frame = image(5, 5, [214, 128, 48, 255]);

    for (let x = 0; x < 5; x += 1) {
      setPixel(frame, x, 0, [0, 0, 0, 255]);
      setPixel(frame, x, 4, [0, 0, 0, 255]);
    }
    for (let y = 0; y < 5; y += 1) {
      setPixel(frame, 0, y, [0, 0, 0, 255]);
      setPixel(frame, 4, y, [0, 0, 0, 255]);
    }
    setPixel(frame, 2, 2, [0, 0, 0, 255]);

    applyConnectedBlackKeyToImageData(frame);

    expect(alpha(frame, 0, 0)).toBe(0);
    expect(alpha(frame, 4, 2)).toBe(0);
    expect(alpha(frame, 2, 2)).toBe(255);
    expect(alpha(frame, 2, 1)).toBeGreaterThan(0);
  });
});
