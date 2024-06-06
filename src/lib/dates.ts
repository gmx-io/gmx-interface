import { addMinutes, format as formatDateFn, set as setTime } from "date-fns";
import { useMemo, useState } from "react";

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

export function toUtcDayStart(date: Date) {
  const dateUtcSeconds = Math.trunc(date.getTime() / 1000);

  return Math.trunc(dateUtcSeconds / 86400) * 86400;
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
  milliseconds: 0,
};

function normalizeDateRange(start: Date | undefined, end: Date | undefined): [number | undefined, number | undefined] {
  const fromTxTimestamp = start ? toSeconds(setTime(start, START_OF_DAY_DURATION)) : undefined;
  const toTxTimestamp = end ? toSeconds(setTime(end, INCLUDING_CURRENT_DAY_DURATION)) : undefined;

  return [fromTxTimestamp, toTxTimestamp];
}

/**
 * Normalizes timestamps to start of the day and end of the day respectively
 */
export function useNormalizeDateRange(
  start: Date | undefined,
  end: Date | undefined
): [number | undefined, number | undefined] {
  const [fromTxTimestamp, toTxTimestamp] = useMemo(() => normalizeDateRange(start, end), [start, end]);
  return [fromTxTimestamp, toTxTimestamp];
}

/**
 * By default, the date range is undefined
 */
export function useDateRange() {
  const [dateRange, setDateRange] = useState<[startDate: Date | undefined, endDate: Date | undefined]>([
    undefined,
    undefined,
  ]);

  const startDate = dateRange[0];
  const endDate = dateRange[1];

  return [startDate, endDate, setDateRange] as const;
}
