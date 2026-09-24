export function getUtcMidnightTimestamp(): string {
  const now = new Date();
  const utcMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  );
  return utcMidnight.toISOString().replace(/(\.\d{3})Z$/, '$1000Z');
}

export function toSubqueryDateTimeIso(d: Date): string {
  return d.toISOString().replace(/(\.\d{3})Z$/, '$1000Z');
}

export function getStartTimestampDaysAgo(days: number): string {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return toSubqueryDateTimeIso(start);
}
