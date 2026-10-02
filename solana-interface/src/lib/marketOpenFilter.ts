import { tz } from "@date-fns/tz";
import { format, getDay } from "date-fns";
import Holidays from "date-holidays";

import type { Bar } from "charting_library";
import type { TradingViewResolution } from "config/tradingview";

// Based on gmx-solana-interface-twy/app/src/utils/tvChart/marketOpenFilter.ts (stock weekends + NYSE holidays only)

const NY_TZ = tz("America/New_York");
const UTC_TZ = tz("UTC");

const NYSE_PUBLIC_HOLIDAY_NAMES = new Set([
  "New Year's Day",
  "Martin Luther King Jr. Day",
  "Washington's Birthday",
  "Memorial Day",
  "Juneteenth",
  "Independence Day",
  "Labor Day",
  "Thanksgiving Day",
  "Christmas Day",
]);

const SUBSTITUTE_SUFFIX = " (substitute day)";

const DAILY_RESOLUTION = "1D";
const MULTI_DAY_RESOLUTIONS = new Set<string>(["1W", "1M"]);

const usHolidayProvider = new Holidays("US");
const nyseHolidayCache = new Map<number, Set<string>>();

function getNyseHolidaySet(year: number): Set<string> {
  const cached = nyseHolidayCache.get(year);
  if (cached) return cached;

  const holidays = new Set<string>();
  const yearHolidays = usHolidayProvider.getHolidays(year);

  for (const holiday of yearHolidays) {
    if (holiday.type !== "public") continue;

    // Observed dates (e.g. Friday before a Saturday holiday) are named "<name> (substitute day)"
    const baseName = holiday.name.endsWith(SUBSTITUTE_SUFFIX)
      ? holiday.name.slice(0, -SUBSTITUTE_SUFFIX.length)
      : holiday.name;
    if (!NYSE_PUBLIC_HOLIDAY_NAMES.has(baseName)) continue;

    // holiday.date is the local US calendar date, e.g. "2026-12-25 00:00:00"
    const dateKey = holiday.date.slice(0, 10);

    // NYSE does not close on Dec 31 when New Year's Day falls on a Saturday
    if (baseName === "New Year's Day" && dateKey.slice(5, 7) === "12") continue;
    // Juneteenth became an NYSE holiday in 2022
    if (baseName === "Juneteenth" && year < 2022) continue;

    holidays.add(dateKey);
  }

  const easterSunday = yearHolidays.find((holiday) => holiday.name === "Easter Sunday");
  if (easterSunday) {
    const [y, m, d] = easterSunday.date.slice(0, 10).split("-").map(Number);
    holidays.add(format(Date.UTC(y, m - 1, d - 2), "yyyy-MM-dd", { in: UTC_TZ }));
  }

  nyseHolidayCache.set(year, holidays);
  return holidays;
}

function isStockTradingDay(timeMs: number, zone: typeof NY_TZ): boolean {
  const day = getDay(timeMs, { in: zone });
  if (day === 0 || day === 6) return false;

  const dateKey = format(timeMs, "yyyy-MM-dd", { in: zone });
  return !getNyseHolidaySet(Number(dateKey.slice(0, 4))).has(dateKey);
}

/**
 * Removes stock bars that fall on weekends or NYSE holidays.
 * Daily bars are keyed by their UTC date, intraday bars by their New York date.
 * Weekly and monthly bars are kept as-is.
 */
export function filterStockBarsByTradingDays(bars: Bar[], resolution: TradingViewResolution): Bar[] {
  const resolutionKey = String(resolution);
  if (MULTI_DAY_RESOLUTIONS.has(resolutionKey)) return bars;

  const zone = resolutionKey === DAILY_RESOLUTION ? UTC_TZ : NY_TZ;
  return bars.filter((bar) => isStockTradingDay(bar.time, zone));
}
