const DAY_MS = 24 * 60 * 60 * 1000;
const RESULT_RETENTION_DAYS = 30;

export function imageVisibleUntil(createdAt: Date): Date {
  return new Date(createdAt.getTime() + RESULT_RETENTION_DAYS * DAY_MS);
}

export function sessionExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + RESULT_RETENTION_DAYS * DAY_MS);
}

export function isFaceImageVisible(createdAt: Date, now = new Date()): boolean {
  return now.getTime() < imageVisibleUntil(createdAt).getTime();
}
