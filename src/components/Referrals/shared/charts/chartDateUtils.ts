import { ONE_YEAR_SECONDS, SECONDS_IN_DAY } from "lib/dates";

export function getDateFormat(timestamps: number[], isSmall: boolean): "HH:mm" | "dd/MM" | "MM/yyyy" {
  if (isSmall) return "HH:mm";
  if (timestamps.length < 2) return "dd/MM";
  const spanSeconds = timestamps[timestamps.length - 1] - timestamps[0];
  return spanSeconds > ONE_YEAR_SECONDS ? "MM/yyyy" : "dd/MM";
}

export function formatTooltipDate(timestamp: number, bucketSizeSeconds: number, locale: string): string {
  if (bucketSizeSeconds > SECONDS_IN_DAY) {
    const start = new Date(timestamp * 1000);
    const end = new Date((timestamp + bucketSizeSeconds) * 1000);
    const startStr = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(start);
    const endStr = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(end);
    return `${startStr} - ${endStr}`;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(bucketSizeSeconds < SECONDS_IN_DAY && { hour: "numeric", minute: "2-digit" }),
  }).format(new Date(timestamp * 1000));
}
