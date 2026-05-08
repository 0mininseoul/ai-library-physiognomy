const DAY_MS = 24 * 60 * 60 * 1000;

export function imageVisibleUntil(createdAt: Date): Date {
  return new Date(createdAt.getTime() + DAY_MS);
}

export function sessionExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + 30 * DAY_MS);
}

export function isFaceImageVisible(createdAt: Date, now = new Date()): boolean {
  return now.getTime() < imageVisibleUntil(createdAt).getTime();
}
