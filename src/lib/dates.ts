import { addMinutes, format as formatDateFn, set as setTime } from "date-fns";
import { useMemo } from "react";

export function formatDateTime(time: number) {
  return formatDateFn(time * 1000, "dd MMM yyyy, h:mm a");
}

export function formatDate(time: number) {
  return formatDateFn(time * 1000, "dd MMM yyyy");
}

export function formatTVDate(date: Date) {
  // https://github.com/date-fns/date-fns/issues/1401#issuecomment-578580199
  return formatDateFn(addMinutes(date, date.getTimezoneOffset()), "dd MMM yyyy");
}

export function formatTVTime(date: Date) {
  return formatDateFn(addMinutes(date, date.getTimezoneOffset()), "h:mm a");
}

export function getTimeRemaining(time: number) {
  const now = parseInt(String(Date.now() / 1000));
  if (time < now) {
    return "0h 0m";
  }
  const diff = time - now;
  const hours = parseInt(String(diff / (60 * 60)));
  const minutes = parseInt(String((diff - hours * 60 * 60) / 60));
  return `${hours}h ${minutes}m`;
}

export function isValidTimestamp(timestamp: any) {
  return new Date(timestamp).getTime() > 0;
}

export function getTimestampByDaysAgo(daysAgo: number) {
  return Math.floor(Date.now() / 1000 / 86400) * 86400 - daysAgo * 24 * 60 * 60;
}

function toSeconds(date: Date) {
  return Math.round(date.getTime() / 1000);
}

const START_OF_DAY_DURATION = {
  hours: 0,
  minutes: 0,
  seconds: 0,
  milliseconds: 0,
};

const INCLUDING_CURRENT_DAY_DURATION = {
  hours: 23,
  minutes: 59,
  seconds: 59,
  milliseconds: 999,
};

function normalizeDateRange(dateRange: [Date | undefined, Date | undefined]) {
  const fromTxTimestamp = dateRange[0] ? toSeconds(setTime(dateRange[0], START_OF_DAY_DURATION)) : undefined;
  const toTxTimestamp = dateRange[1] ? toSeconds(setTime(dateRange[1], INCLUDING_CURRENT_DAY_DURATION)) : undefined;

  return [fromTxTimestamp, toTxTimestamp];
}

/**
 * Normalizes timestamps to start of the day and end of the day respectively
 */
export function useNormalizeDateRange(dateRange: [Date | undefined, Date | undefined]) {
  const [fromTxTimestamp, toTxTimestamp] = useMemo(() => normalizeDateRange(dateRange), [dateRange]);
  return [fromTxTimestamp, toTxTimestamp];
}
