import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export function getDaysPassedUTC(timestampSec: number | string): string {
  const t = dayjs.unix(Number(timestampSec)).utc();
  const now = dayjs().utc();

  const diffDays = now.diff(t, "day");
  return `${diffDays}`;
}

export function getWeeksPassedUTC(timestampSec: number | string): string {
  const t = dayjs.unix(Number(timestampSec)).utc();
  const now = dayjs().utc();

  const diffWeeks = now.diff(t, "week");
  return `${diffWeeks}`;
}
