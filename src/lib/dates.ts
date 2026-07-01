import { t } from "@lingui/macro";
import { format as formatDateFn, isToday, isYesterday } from "date-fns";
import { useMemo, useState } from "react";

export type DateRange = [startDate: Date | undefined, endDate: Date | undefined];
export type SetDateRange = (dateRange: DateRange) => void;

export function formatDateTime(time: number) {
  return formatDateFn(time * 1000, "dd MMM yyyy, h:mm a");
}

export function formatDate(time: number) {
  return formatDateFn(time * 1000, "dd MMM yyyy");
}

function formatDateWithComma(time: number) {
  return formatDateFn(time * 1000, "MMM dd, yyyy");
}

export function formatRelativeDateWithComma(time: number) {
  if (isToday(time * 1000)) {
    return t`Today`;
  }

  if (isYesterday(time * 1000)) {
    return t`Yesterday`;
  }

  return formatDateWithComma(time);
}

export function formatTVDate(date: Date) {
  return formatDateFn(date, "dd MMM yyyy");
}

export function formatTVTime(date: Date) {
  return formatDateFn(date, "HH:mm");
}

export function isValidTimestamp(timestamp: any) {
  return new Date(timestamp).getTime() > 0;
}

export function getTimestampByDaysAgo(daysAgo: number) {
  return Math.floor(Date.now() / 1000 / 86400) * 86400 - daysAgo * 24 * 60 * 60;
}

export function getDaysAgo(timestamp: number) {
  const diff = Date.now() / 1000 - timestamp;
  return Math.floor(diff / 86400);
}

export function toUtcDayStart(date: Date) {
  const dateUtcSeconds = Math.trunc(date.getTime() / 1000);

  return Math.trunc(dateUtcSeconds / 86400) * 86400;
}

export function toUtcDayStartByCalendarDate(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 1000;
}

export function toUtcDayEndByCalendarDate(date: Date) {
  return toUtcDayStartByCalendarDate(date) + SECONDS_IN_DAY - 1;
}

export function normalizeDateRange<S extends Date | undefined, E extends Date | undefined>(
  start: S,
  end: E
): [S extends Date ? number : undefined, E extends Date ? number : undefined] {
  const fromTxTimestamp = start ? toUtcDayStartByCalendarDate(start) : undefined;
  const toTxTimestamp = end ? toUtcDayEndByCalendarDate(end) : undefined;

  return [fromTxTimestamp, toTxTimestamp] as [S extends Date ? number : undefined, E extends Date ? number : undefined];
}

/**
 * Normalizes the picked calendar dates to UTC day bounds (start of the first day, end of the last day),
 * matching the UTC daily buckets used by analytics data
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
  const [dateRange, setDateRange] = useState<DateRange>([undefined, undefined]);

  const startDate = dateRange[0];
  const endDate = dateRange[1];

  return [startDate, endDate, setDateRange] as const;
}

export const SECONDS_IN_DAY = 86400;
export const ONE_YEAR_SECONDS = SECONDS_IN_DAY * 365;

function floorTimestamp(timestamp: number, period: "day" | "hour") {
  const delimiter = period === "day" ? 86400 : 3600;
  return Math.floor(timestamp / delimiter) * delimiter;
}

function getTodayStart() {
  return floorTimestamp(Date.now() / 1000, "day");
}

function getYearStart() {
  return floorTimestamp(new Date(new Date().getUTCFullYear(), 0, 1, 0, 0, 0, 0).getTime() / 1000, "day");
}

export function getTimePeriodsInSeconds() {
  const todayStart = getTodayStart();
  const todayEnd = todayStart + SECONDS_IN_DAY;
  const yearStart = getYearStart();

  return {
    today: [todayStart, todayEnd],
    yesterday: [todayStart - 1 * SECONDS_IN_DAY, todayStart],
    week: [todayStart - 7 * SECONDS_IN_DAY, todayEnd],
    last14Days: [todayStart - 14 * SECONDS_IN_DAY, todayEnd],
    month: [todayStart - 30 * SECONDS_IN_DAY, todayEnd],
    year: [yearStart, todayEnd],
  };
}

export function getTimeframeLabel(timeframe: { from: number; to: number | undefined }, locale: string): string | null {
  if (!timeframe.to) return null;

  const fmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return fmt.formatRange(new Date(timeframe.from * 1000), new Date(timeframe.to * 1000));
}
