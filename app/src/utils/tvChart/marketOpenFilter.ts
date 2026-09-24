import dayjs, { type Dayjs } from 'dayjs';
import Holidays from 'date-holidays';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import type { TokenType } from '@/selectors/token/types';
import type { FormattedCandle } from './dataProvider';

dayjs.extend(utc);
dayjs.extend(timezone);

const NY_TZ = 'America/New_York';

const ONE_DAY_SECONDS = 86_400;
const ONE_HOUR_SECONDS = 3_600;
const FOUR_HOUR_SECONDS = 14_400;

const STOCK_OPEN_MINUTES = 9 * 60 + 30;
const STOCK_CLOSE_MINUTES = 16 * 60;

const FOREX_WEEKLY_OPEN_MINUTES = 17 * 60;
const SPOT_WEEKLY_OPEN_MINUTES = 18 * 60;
const WEEKLY_CLOSE_MINUTES = 17 * 60;
const SPOT_BREAK_START_MINUTES = 17 * 60;
const SPOT_BREAK_END_MINUTES = 18 * 60;
const NYMEX_EARLY_CLOSE_MINUTES = 13 * 60;

const NYSE_PUBLIC_HOLIDAY_NAMES = new Set([
  "New Year's Day",
  'Martin Luther King Jr. Day',
  "Washington's Birthday",
  'Memorial Day',
  'Juneteenth',
  'Independence Day',
  'Labor Day',
  'Thanksgiving Day',
  'Christmas Day',
]);

const NYMEX_FULL_HOLIDAY_NAMES = new Set([
  "New Year's Day",
  'Martin Luther King Jr. Day',
  "Washington's Birthday",
  'Memorial Day',
  'Juneteenth',
  'Independence Day',
  'Labor Day',
  'Thanksgiving Day',
  'Christmas Day',
]);

const NYMEX_EARLY_CLOSE_HOLIDAY_NAMES = new Set([
  "New Year's Day",
  'Independence Day',
  'Thanksgiving Day',
  'Christmas Day',
]);

type MarketOpenOptions = {
  enforceIntradaySession?: boolean;
  barDurationSeconds?: number;
};

export class MarketOpenFilter {
  private tokenType: TokenType;
  private marketOpenCache = new Map<string, boolean>();
  private nyseHolidayCache = new Map<number, Set<string>>();
  private forexHolidayCache = new Map<number, Set<string>>();
  private commodityHolidayCache = new Map<number, Set<string>>();
  private spotHolidayCache = new Map<number, Set<string>>();
  private commodityEarlyCloseCache = new Map<number, Map<string, number>>();
  private readonly usHolidayProvider = new Holidays('US');

  constructor(tokenType: unknown = 'crypto') {
    this.tokenType = this.normalizeTokenType(tokenType);
  }

  setTokenType(tokenType: unknown): void {
    this.tokenType = this.normalizeTokenType(tokenType);
  }

  clearCache(): void {
    this.marketOpenCache.clear();
    this.nyseHolidayCache.clear();
    this.forexHolidayCache.clear();
    this.commodityHolidayCache.clear();
    this.spotHolidayCache.clear();
    this.commodityEarlyCloseCache.clear();
  }

  filterBarsByMarketHours(
    bars: FormattedCandle[],
    options?: MarketOpenOptions
  ): FormattedCandle[] {
    if (!bars.length || this.tokenType === 'crypto') {
      return bars;
    }

    return bars.filter((bar) => this.isMarketOpenAt(bar.time, options));
  }

  isMarketOpenAt(timestamp: number, options?: MarketOpenOptions): boolean {
    if (this.tokenType === 'crypto') {
      return true;
    }

    const ms = timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
    const barDurationSeconds = options?.barDurationSeconds ?? 60;
    const enforceIntradaySession = options?.enforceIntradaySession ?? true;
    const isDailyOrHigher =
      !enforceIntradaySession || barDurationSeconds >= ONE_DAY_SECONDS;

    const minuteBucket = Math.floor(ms / 60_000);
    const cacheKey = [
      this.tokenType,
      isDailyOrHigher ? 'daily-plus' : 'intraday',
      barDurationSeconds,
      minuteBucket,
    ].join(':');
    const cached = this.marketOpenCache.get(cacheKey);

    if (cached !== undefined) {
      return cached;
    }

    const isOpen = isDailyOrHigher
      ? this.isDailyBarOpen(dayjs.utc(ms), barDurationSeconds)
      : this.isIntradayBarOpen(dayjs(ms).tz(NY_TZ), barDurationSeconds);

    this.marketOpenCache.set(cacheKey, isOpen);
    return isOpen;
  }

  private isDailyBarOpen(dateUtc: Dayjs, barDurationSeconds: number): boolean {
    if (barDurationSeconds > ONE_DAY_SECONDS) {
      return true;
    }

    switch (this.tokenType) {
      case 'stock':
        return this.isStockDailyOpen(dateUtc);
      case 'forex':
        return this.isForexDailyOpen(dateUtc);
      case 'commodity':
        return this.isCommodityDailyOpen(dateUtc);
      case 'spot':
        return this.isSpotDailyOpen(dateUtc);
      default:
        return true;
    }
  }

  private isIntradayBarOpen(
    startNy: Dayjs,
    barDurationSeconds: number
  ): boolean {
    switch (this.tokenType) {
      case 'stock':
        return this.stockIntradayOpen(startNy, barDurationSeconds);
      case 'forex':
        return this.forexIntradayOpen(startNy, barDurationSeconds);
      case 'commodity':
        return this.commodityIntradayOpen(startNy, barDurationSeconds);
      case 'spot':
        return this.spotIntradayOpen(startNy, barDurationSeconds);
      default:
        return true;
    }
  }

  private isStockDailyOpen(dateUtc: Dayjs): boolean {
    if (!this.isWeekday(dateUtc)) {
      return false;
    }

    return !this.getNyseHolidaySet(dateUtc.year()).has(
      dateUtc.format('YYYY-MM-DD')
    );
  }

  private isForexDailyOpen(dateUtc: Dayjs): boolean {
    if (dateUtc.day() === 6) {
      return false;
    }

    return !this.getForexHolidaySet(dateUtc.year()).has(
      dateUtc.format('YYYY-MM-DD')
    );
  }

  private isCommodityDailyOpen(dateUtc: Dayjs): boolean {
    if (dateUtc.day() === 6) {
      return false;
    }

    return !this.getCommodityHolidaySet(dateUtc.year()).has(
      dateUtc.format('YYYY-MM-DD')
    );
  }

  private isSpotDailyOpen(dateUtc: Dayjs): boolean {
    if (dateUtc.day() === 6) {
      return false;
    }

    return !this.getSpotHolidaySet(dateUtc.year()).has(
      dateUtc.format('YYYY-MM-DD')
    );
  }

  private stockIntradayOpen(
    startNy: Dayjs,
    barDurationSeconds: number
  ): boolean {
    const tradingDate = startNy.startOf('day');

    if (!this.isStockTradingDay(tradingDate)) {
      return false;
    }

    if (
      barDurationSeconds !== ONE_HOUR_SECONDS &&
      barDurationSeconds !== FOUR_HOUR_SECONDS
    ) {
      return this.isStockInstantOpen(startNy);
    }

    return this.barOverlapsClockWindow(
      startNy,
      barDurationSeconds,
      STOCK_OPEN_MINUTES,
      STOCK_CLOSE_MINUTES
    );
  }

  private forexIntradayOpen(
    startNy: Dayjs,
    barDurationSeconds: number
  ): boolean {
    if (barDurationSeconds < ONE_HOUR_SECONDS) {
      return this.fxInstantOpen(startNy);
    }

    return this.barOverlapsOpenSession(startNy, barDurationSeconds, (value) =>
      this.fxInstantOpen(value)
    );
  }

  private commodityIntradayOpen(
    startNy: Dayjs,
    barDurationSeconds: number
  ): boolean {
    if (barDurationSeconds < ONE_HOUR_SECONDS) {
      return this.commodityInstantOpen(startNy);
    }

    return this.barOverlapsOpenSession(startNy, barDurationSeconds, (value) =>
      this.commodityInstantOpen(value)
    );
  }

  private spotIntradayOpen(startNy: Dayjs, barDurationSeconds: number): boolean {
    if (barDurationSeconds < ONE_HOUR_SECONDS) {
      return this.commodityInstantOpen(startNy, true);
    }

    return this.barOverlapsOpenSession(startNy, barDurationSeconds, (value) =>
      this.commodityInstantOpen(value, true)
    );
  }

  private barOverlapsOpenSession(
    startNy: Dayjs,
    barDurationSeconds: number,
    isInstantOpen: (value: Dayjs) => boolean
  ): boolean {
    const durationSeconds = Math.max(barDurationSeconds, 1);
    const endExclusive = startNy.add(durationSeconds, 'second');

    if (!startNy.isBefore(endExclusive)) {
      return false;
    }

    const endProbe = endExclusive.subtract(1, 'second');
    return isInstantOpen(startNy) || isInstantOpen(endProbe);
  }

  private barOverlapsClockWindow(
    startNy: Dayjs,
    barDurationSeconds: number,
    sessionStartMinutes: number,
    sessionEndMinutes: number
  ): boolean {
    const durationSeconds = Math.max(barDurationSeconds, 1);
    const endExclusive = startNy.add(durationSeconds, 'second');
    const sessionStart = startNy
      .startOf('day')
      .add(sessionStartMinutes, 'minute');
    const sessionEnd = startNy.startOf('day').add(sessionEndMinutes, 'minute');

    return startNy.isBefore(sessionEnd) && endExclusive.isAfter(sessionStart);
  }

  private fxInstantOpen(dateNy: Dayjs): boolean {
    const tradingDate = this.rollTradingDate(dateNy, WEEKLY_CLOSE_MINUTES);

    if (!this.isForexTradingDay(tradingDate)) {
      return false;
    }

    return this.inWeeklySession(dateNy, FOREX_WEEKLY_OPEN_MINUTES);
  }

  private isStockInstantOpen(dateNy: Dayjs): boolean {
    const tradingDate = dateNy.startOf('day');

    if (!this.isStockTradingDay(tradingDate)) {
      return false;
    }

    const minutes = this.getMinutesSinceMidnight(dateNy);
    return minutes >= STOCK_OPEN_MINUTES && minutes < STOCK_CLOSE_MINUTES;
  }

  private commodityInstantOpen(dateNy: Dayjs, useSpotHoliday = false): boolean {
    const tradingDate = this.rollTradingDate(dateNy, WEEKLY_CLOSE_MINUTES);

    if (
      useSpotHoliday
        ? !this.isSpotTradingDay(tradingDate)
        : !this.isCommodityTradingDay(tradingDate)
    ) {
      return false;
    }

    if (!this.inWeeklySession(dateNy, SPOT_WEEKLY_OPEN_MINUTES)) {
      return false;
    }

    const day = dateNy.day();
    const minutes = this.getMinutesSinceMidnight(dateNy);

    if (
      day >= 1 &&
      day <= 4 &&
      minutes >= SPOT_BREAK_START_MINUTES &&
      minutes < SPOT_BREAK_END_MINUTES
    ) {
      return false;
    }

    const earlyCloseMinutes = useSpotHoliday
      ? undefined
      : this.getCommodityEarlyCloseMinutes(dateNy);
    if (earlyCloseMinutes !== undefined && minutes >= earlyCloseMinutes) {
      return false;
    }

    return true;
  }

  private inWeeklySession(dateNy: Dayjs, sundayOpenMinutes: number): boolean {
    const day = dateNy.day();
    const minutes = this.getMinutesSinceMidnight(dateNy);

    if (day === 6) {
      return false;
    }

    if (day === 0) {
      return minutes >= sundayOpenMinutes;
    }

    if (day === 5) {
      return minutes < WEEKLY_CLOSE_MINUTES;
    }

    return true;
  }

  private rollTradingDate(dateNy: Dayjs, rolloverMinutes: number): Dayjs {
    return this.getMinutesSinceMidnight(dateNy) >= rolloverMinutes
      ? dateNy.add(1, 'day').startOf('day')
      : dateNy.startOf('day');
  }

  private isStockTradingDay(dateNy: Dayjs): boolean {
    if (!this.isWeekday(dateNy)) {
      return false;
    }

    return !this.getNyseHolidaySet(dateNy.year()).has(
      dateNy.format('YYYY-MM-DD')
    );
  }

  private isForexTradingDay(dateNy: Dayjs): boolean {
    if (!this.isWeekday(dateNy)) {
      return false;
    }

    return !this.getForexHolidaySet(dateNy.year()).has(
      dateNy.format('YYYY-MM-DD')
    );
  }

  private isCommodityTradingDay(dateNy: Dayjs): boolean {
    if (!this.isWeekday(dateNy)) {
      return false;
    }

    return !this.getCommodityHolidaySet(dateNy.year()).has(
      dateNy.format('YYYY-MM-DD')
    );
  }

  private isSpotTradingDay(dateNy: Dayjs): boolean {
    if (!this.isWeekday(dateNy)) {
      return false;
    }

    return !this.getSpotHolidaySet(dateNy.year()).has(dateNy.format('YYYY-MM-DD'));
  }

  private isWeekday(date: Dayjs): boolean {
    const day = date.day();
    return day >= 1 && day <= 5;
  }

  private getMinutesSinceMidnight(date: Dayjs): number {
    return date.hour() * 60 + date.minute();
  }

  private normalizeTokenType(tokenType: unknown): TokenType {
    if (typeof tokenType === 'string') {
      const normalized = tokenType.toLowerCase();
      if (
        normalized === 'crypto' ||
        normalized === 'stock' ||
        normalized === 'forex' ||
        normalized === 'commodity' ||
        normalized === 'spot'
      ) {
        return normalized;
      }
    }

    return 'crypto';
  }

  private getNyseHolidaySet(year: number): Set<string> {
    const cached = this.nyseHolidayCache.get(year);
    if (cached) {
      return cached;
    }

    const holidays = new Set<string>();

    for (const holiday of this.usHolidayProvider.getHolidays(year)) {
      if (holiday.type !== 'public') {
        continue;
      }

      if (!NYSE_PUBLIC_HOLIDAY_NAMES.has(holiday.name)) {
        continue;
      }

      holidays.add(dayjs(holiday.start).tz(NY_TZ).format('YYYY-MM-DD'));
    }

    const goodFriday = this.getGoodFriday(year);
    if (goodFriday) {
      holidays.add(goodFriday);
    }

    if (year < 2022) {
      holidays.delete(`${year}-06-19`);
      holidays.delete(this.getObservedDate(year, 6, 19));
    }

    this.nyseHolidayCache.set(year, holidays);
    return holidays;
  }

  private getForexHolidaySet(year: number): Set<string> {
    const cached = this.forexHolidayCache.get(year);
    if (cached) {
      return cached;
    }

    const holidays = new Set<string>([`${year}-01-01`, `${year}-12-25`]);

    this.forexHolidayCache.set(year, holidays);
    return holidays;
  }

  private getCommodityHolidaySet(year: number): Set<string> {
    const cached = this.commodityHolidayCache.get(year);
    if (cached) {
      return cached;
    }

    const holidays = new Set<string>();

    for (const holiday of this.usHolidayProvider.getHolidays(year)) {
      if (holiday.type !== 'public') {
        continue;
      }

      if (!NYMEX_FULL_HOLIDAY_NAMES.has(holiday.name)) {
        continue;
      }

      holidays.add(dayjs(holiday.start).tz(NY_TZ).format('YYYY-MM-DD'));
    }

    const goodFriday = this.getGoodFriday(year);
    if (goodFriday) {
      holidays.add(goodFriday);
    }

    this.commodityHolidayCache.set(year, holidays);
    return holidays;
  }

  private getSpotHolidaySet(year: number): Set<string> {
    const cached = this.spotHolidayCache.get(year);
    if (cached) {
      return cached;
    }

    const holidays = new Set<string>([`${year}-01-01`, `${year}-12-25`]);

    const goodFriday = this.getGoodFriday(year);
    if (goodFriday) {
      holidays.add(goodFriday);
    }

    this.spotHolidayCache.set(year, holidays);
    return holidays;
  }

  private getCommodityEarlyCloseMap(year: number): Map<string, number> {
    const cached = this.commodityEarlyCloseCache.get(year);
    if (cached) {
      return cached;
    }

    const earlyCloseMap = new Map<string, number>();

    for (const holiday of this.usHolidayProvider.getHolidays(year)) {
      if (holiday.type !== 'public') {
        continue;
      }

      if (!NYMEX_EARLY_CLOSE_HOLIDAY_NAMES.has(holiday.name)) {
        continue;
      }

      const holidayDate = dayjs(holiday.start).tz(NY_TZ).startOf('day');
      const previousTradingDay = this.getPreviousWeekday(holidayDate);

      if (!previousTradingDay) {
        continue;
      }

      earlyCloseMap.set(
        previousTradingDay.format('YYYY-MM-DD'),
        NYMEX_EARLY_CLOSE_MINUTES
      );
    }

    this.commodityEarlyCloseCache.set(year, earlyCloseMap);
    return earlyCloseMap;
  }

  private getCommodityEarlyCloseMinutes(dateNy: Dayjs): number | undefined {
    const dateKey = dateNy.format('YYYY-MM-DD');
    const currentYear = dateNy.year();
    const currentYearValue = this.getCommodityEarlyCloseMap(currentYear).get(
      dateKey
    );

    if (currentYearValue !== undefined) {
      return currentYearValue;
    }

    return this.getCommodityEarlyCloseMap(currentYear + 1).get(dateKey);
  }

  private getGoodFriday(year: number): string | null {
    const easterSunday = this.usHolidayProvider
      .getHolidays(year)
      .find((holiday) => holiday.name === 'Easter Sunday');

    if (!easterSunday) {
      return null;
    }

    return dayjs(easterSunday.start)
      .tz(NY_TZ)
      .subtract(2, 'day')
      .format('YYYY-MM-DD');
  }

  private getObservedDate(year: number, month: number, day: number): string {
    const date = dayjs
      .tz(
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 12:00`,
        NY_TZ
      )
      .startOf('day');

    if (date.day() === 6) {
      return date.subtract(1, 'day').format('YYYY-MM-DD');
    }

    if (date.day() === 0) {
      return date.add(1, 'day').format('YYYY-MM-DD');
    }

    return date.format('YYYY-MM-DD');
  }

  private getPreviousWeekday(dateNy: Dayjs): Dayjs | null {
    let cursor = dateNy.subtract(1, 'day').startOf('day');

    for (let i = 0; i < 7; i += 1) {
      const day = cursor.day();
      if (day >= 1 && day <= 5) {
        return cursor;
      }
      cursor = cursor.subtract(1, 'day');
    }

    return null;
  }
}
