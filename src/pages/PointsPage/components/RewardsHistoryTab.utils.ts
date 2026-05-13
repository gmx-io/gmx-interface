import { ONE_YEAR_SECONDS, SECONDS_IN_DAY } from "lib/dates";

export function formatEpochLabel(epochTimestamp: number, epochDuration: number, locale?: string): string {
  const safeEpochDuration = Math.max(epochDuration, 1);
  const start = new Date(epochTimestamp * 1000);
  const wholeDays = safeEpochDuration / SECONDS_IN_DAY;

  if (Number.isInteger(wholeDays) && wholeDays >= 1) {
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + wholeDays - 1);

    if (wholeDays === 1) {
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }).format(start);
    }

    if (safeEpochDuration < ONE_YEAR_SECONDS) {
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }).formatRange(start, endDate);
    }

    return new Intl.DateTimeFormat(locale, {
      month: "short",
      year: "numeric",
    }).formatRange(start, endDate);
  }

  const endInclusive = new Date((epochTimestamp + safeEpochDuration - 1) * 1000);

  if (safeEpochDuration < SECONDS_IN_DAY) {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).formatRange(start, endInclusive);
  }

  if (safeEpochDuration < ONE_YEAR_SECONDS) {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).formatRange(start, endInclusive);
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
  }).formatRange(start, endInclusive);
}
