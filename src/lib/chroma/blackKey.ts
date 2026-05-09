export type ChromaImageData = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export function applyConnectedBlackKeyToImageData(imageData: ChromaImageData) {
  const { width, height, data } = imageData;
  const pixelCount = width * height;
  const keyCandidate = new Uint8Array(pixelCount);
  const background = new Uint8Array(pixelCount);
  const stack: number[] = [];

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const offset = pixelIndex * 4;
    const red = data[offset] ?? 0;
    const green = data[offset + 1] ?? 0;
    const blue = data[offset + 2] ?? 0;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const colorSpread = max - min;

    if (max < 30 || (max < 70 && colorSpread < 22)) keyCandidate[pixelIndex] = 1;
  }

  for (let x = 0; x < width; x += 1) {
    pushBackgroundCandidate(x, 0);
    pushBackgroundCandidate(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    pushBackgroundCandidate(0, y);
    pushBackgroundCandidate(width - 1, y);
  }

  while (stack.length > 0) {
    const pixelIndex = stack.pop();
    if (pixelIndex === undefined) break;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    pushBackgroundCandidate(x - 1, y);
    pushBackgroundCandidate(x + 1, y);
    pushBackgroundCandidate(x, y - 1);
    pushBackgroundCandidate(x, y + 1);
  }

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const offset = pixelIndex * 4;

    if (background[pixelIndex]) {
      data[offset + 3] = 0;
      continue;
    }

    const edgeDistance = distanceToBackground(pixelIndex, 3);
    if (edgeDistance === null) continue;

    const red = data[offset] ?? 0;
    const green = data[offset + 1] ?? 0;
    const blue = data[offset + 2] ?? 0;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const lowSaturation = max - min < 50;
    const brightHalo = max > 185 && lowSaturation;

    if (!brightHalo) continue;

    const alpha = data[offset + 3] ?? 255;
    if (edgeDistance <= 1 && max > 215) {
      data[offset + 3] = 0;
    } else if (edgeDistance <= 2) {
      data[offset + 3] = Math.round(alpha * 0.22);
    } else {
      data[offset + 3] = Math.round(alpha * 0.5);
    }
  }

  function pushBackgroundCandidate(x: number, y: number) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pixelIndex = y * width + x;
    if (!keyCandidate[pixelIndex] || background[pixelIndex]) return;
    background[pixelIndex] = 1;
    stack.push(pixelIndex);
  }

  function distanceToBackground(pixelIndex: number, radius: number) {
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const neighborIndex = ny * width + nx;
        if (!background[neighborIndex]) continue;
        bestDistance = Math.min(bestDistance, Math.max(Math.abs(dx), Math.abs(dy)));
      }
    }

    return Number.isFinite(bestDistance) ? bestDistance : null;
  }
}
