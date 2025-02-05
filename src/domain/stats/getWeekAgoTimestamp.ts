export function getWeekAgoTimestamp(): number {
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return Math.floor(last7Days.getTime() / 1000);
}
