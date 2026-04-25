export type TimeParts = { days: number; hours: number; minutes: number };

function toDate(input?: string | Date): Date | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

export function computeDeletionDeadline(
  deletedAt?: string | Date,
  ttlDays: number = 7,
): Date | null {
  const d = toDate(deletedAt);
  if (!d) return null;
  const deadline = new Date(d.getTime() + ttlDays * 24 * 60 * 60 * 1000);
  return deadline;
}

export function msUntilDeletion(
  deletedAt?: string | Date,
  now: Date = new Date(),
  ttlDays: number = 7,
): number | null {
  const deadline = computeDeletionDeadline(deletedAt, ttlDays);
  if (!deadline) return null;
  return deadline.getTime() - now.getTime();
}

export function shouldAutoDelete(
  deletedAt?: string | Date,
  now: Date = new Date(),
  ttlDays: number = 7,
): boolean {
  const ms = msUntilDeletion(deletedAt, now, ttlDays);
  if (ms === null) return false;
  return ms <= 0;
}

export function getTimeUntilDeletionParts(
  deletedAt?: string | Date,
  now: Date = new Date(),
  ttlDays: number = 7,
): { parts: TimeParts; expired: boolean } {
  const ms = msUntilDeletion(deletedAt, now, ttlDays);
  if (ms === null || ms <= 0) {
    return { parts: { days: 0, hours: 0, minutes: 0 }, expired: true };
  }
  let remaining = Math.floor(ms / 1000); // seconds
  const days = Math.floor(remaining / (24 * 3600));
  remaining -= days * 24 * 3600;
  const hours = Math.floor(remaining / 3600);
  remaining -= hours * 3600;
  const minutes = Math.floor(remaining / 60);
  return { parts: { days, hours, minutes }, expired: false };
}

// Formats time remaining into a localized string using i18n t function
export function formatTimeRemaining(
  t: (key: string, options?: any) => string,
  parts: TimeParts,
): string {
  const segs: string[] = [];
  if (parts.days > 0) {
    const key = parts.days === 1 ? "trash.time.days" : "trash.time.days_plural";
    segs.push(t(key, { count: parts.days }));
  }
  if (parts.hours > 0) {
    const key = parts.hours === 1 ? "trash.time.hours" : "trash.time.hours_plural";
    segs.push(t(key, { count: parts.hours }));
  }
  if (parts.minutes > 0 || segs.length === 0) {
    const key = parts.minutes === 1 ? "trash.time.minutes" : "trash.time.minutes_plural";
    segs.push(t(key, { count: parts.minutes }));
  }
  return segs.join(" ");
}
