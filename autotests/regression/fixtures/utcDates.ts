// The regression browser runs in UTC, so displayed dates are derived in UTC.
export function utcParts(seconds: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(seconds * 1000));
  return Object.fromEntries(parts.map((p) => [p.type, p.value])) as Record<string, string>;
}

// "dd MMM yyyy"
export function utcDay(seconds: number) {
  const { day, month, year } = utcParts(seconds);
  return `${day} ${month} ${year}`;
}

// "h:mm a"
export function utcTime(seconds: number) {
  return new Date(seconds * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}

// GMX Account transfer list: "Today", "Yesterday" or "MMM dd, yyyy".
export function transferListDate(seconds: number) {
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  if (day(seconds * 1000) === day(Date.now())) return "Today";
  if (day(seconds * 1000) === day(Date.now() - 86_400_000)) return "Yesterday";
  const { day: dd, month, year } = utcParts(seconds);
  return `${month} ${dd}, ${year}`;
}
