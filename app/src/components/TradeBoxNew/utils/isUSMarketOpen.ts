import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Check whether the US stock market is open
 * - Regular Trading Hours (09:30–16:00 ET)
 * - Includes special handling for 2026 holidays and early closes
 * - Timezone: America/New_York
 */
export function isUSMarketOpen(): boolean {
  const easternTime = dayjs().tz('America/New_York');

  const year = easternTime.year();
  const day = easternTime.day(); // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) return false;

  const hour = easternTime.hour();
  const minute = easternTime.minute();
  const totalMinutes = hour * 60 + minute;

  const today = easternTime.format('YYYY-MM-DD');

  /**
   * Full market holidays (ET)
   */
  const fullHolidayET: Record<number, string[]> = {
    2025: [
      '2025-09-01', // Labor Day
      '2025-11-27', // Thanksgiving Day
      '2025-12-25', // Christmas Day
    ],
    2026: [
      '2026-01-01', // New Year's Day
      '2026-01-19', // Martin Luther King Jr. Day
      '2026-02-16', // Presidents’ Day
      '2026-04-03', // Good Friday
      '2026-05-25', // Memorial Day
      '2026-06-19', // Juneteenth
      '2026-07-03', // Independence Day (Observed)
      '2026-09-07', // Labor Day
      '2026-11-26', // Thanksgiving Day
      '2026-12-25', // Christmas Day
    ],
  };

  /**
   * Early close days (ET)
   * Value = market close time in minutes since midnight
   */
  const earlyCloseET: Record<number, Record<string, number>> = {
    2025: {
      '2025-11-28': 13 * 60, // Day after Thanksgiving
      '2025-12-24': 13 * 60, // Christmas Eve
    },
    2026: {
      '2026-11-27': 13 * 60, // Day after Thanksgiving
      '2026-12-24': 13 * 60, // Christmas Eve
    },
  };

  // Full market holiday
  if (fullHolidayET[year]?.includes(today)) {
    return false;
  }

  // Early close day
  const earlyCloseTime = earlyCloseET[year]?.[today];
  if (earlyCloseTime !== undefined) {
    return totalMinutes >= 570 && totalMinutes < earlyCloseTime;
  }

  // Regular trading hours: 09:30 - 16:00 (ET)
  return totalMinutes >= 570 && totalMinutes < 960;
}

/**
 * Validates if the XAU/XAG (Gold/Silver) price feed is active based on Chainlink Labs recommendations.
 * * Recommendation: 00:00 Monday - 17:00 Friday ET
 * Excluding: Christmas (Dec 25) and New Year's Day (Jan 1)
 * * This prevents reliance on stale or low-liquidity data during market close hours.
 * * @returns {boolean} True if the market is within trading hours, false otherwise.
 */
// export function isMetalMarketOpen(): boolean {
//   // Convert current system time to New York (Eastern Time)
//   const easternTime = dayjs().tz('America/New_York');
  
//   const day = easternTime.day();     // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
//   const month = easternTime.month(); // 0 = Jan, 11 = Dec
//   const date = easternTime.date();
  
//   const hour = easternTime.hour();
//   const minute = easternTime.minute();
//   const totalMinutes = hour * 60 + minute;

//   // 1. Holiday Handling: New Year's Day (January 1st)
//   if (month === 0 && date === 1) {
//     return false;
//   }

//   // 2. Holiday Handling: Christmas Day (December 25th)
//   if (month === 11 && date === 25) {
//     return false;
//   }

//   // 3. Weekend Handling: Closed on Saturdays and Sundays
//   if (day === 0 || day === 6) {
//     return false;
//   }

//   // 4. Friday Close: Market closes at 17:00 ET
//   // 17:00 = 1020 minutes from midnight
//   if (day === 5 && totalMinutes >= 1020) {
//     return false;
//   }

//   /**
//    * 5. Monday Open: Market opens at 00:00 ET
//    * Since we already checked for weekends and specific Friday close times,
//    * Monday 00:00 through Friday 16:59 falls into the active range.
//    */
//   return true;
// }

/**
 * Validates if the XAU/XAG (Gold/Silver) price feed is active based on market hours.
 * * Trading Hours: 17:00 Sunday - 17:00 Friday ET
 * * (This opens 7 hours earlier than the previous 00:00 Monday start)
 * Excluding: Christmas (Dec 25) and New Year's Day (Jan 1)
 * * @returns {boolean} True if the market is within trading hours, false otherwise.
 */
export function isCommodityMarketOpen(): boolean {
  // Convert current system time to New York (Eastern Time)
  const easternTime = dayjs().tz('America/New_York');
  
  const day = easternTime.day();     // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const month = easternTime.month(); // 0 = Jan, 11 = Dec
  const date = easternTime.date();
  
  const hour = easternTime.hour();
  const minute = easternTime.minute();
  const totalMinutes = hour * 60 + minute;
  const SEVENTEEN_HOURS_ET = 17 * 60; // 1020 minutes (17:00 ET)

  // 1. Holiday Handling: New Year's Day (Jan 1) and Christmas (Dec 25)
  if ((month === 0 && date === 1) || (month === 11 && date === 25)) {
    return false;
  }

  // 2. Saturday Handling: Market is closed all day
  if (day === 6) {
    return false;
  }

  // 3. Sunday Handling: Market opens at 17:00 ET
  // Remains closed if it is Sunday before 17:00
  if (day === 0 && totalMinutes < SEVENTEEN_HOURS_ET) {
    return false;
  }

  // 4. Friday Handling: Market closes at 17:00 ET
  // Remains closed if it is Friday after 17:00
  if (day === 5 && totalMinutes >= SEVENTEEN_HOURS_ET) {
    return false;
  }

  /**
   * 5. Active Trading Window:
   * Covers Sunday 17:00 through Friday 16:59, including all of Monday-Thursday.
   */
  return true;
}

/**
 * Validates if the Commodity (e.g., Gold/Silver) price feed is active.
 * * Trading Hours: 18:00 Sunday - 17:00 Friday ET
 * * Daily Break: Closed every day between 17:00 - 18:00 ET
 * * (Opens 6 hours earlier than the previous 00:00 Monday start)
 * Excluding: Christmas (Dec 25) and New Year's Day (Jan 1)
 */
export function isMetalMarketOpen(): boolean {
  // Convert current system time to New York (Eastern Time)
  const easternTime = dayjs().tz('America/New_York');
  
  const day = easternTime.day();     // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const month = easternTime.month(); // 0 = Jan, 11 = Dec
  const date = easternTime.date();
  
  const hour = easternTime.hour();
  const minute = easternTime.minute();
  const totalMinutes = hour * 60 + minute;

  const BREAK_START = 17 * 60; // 17:00 ET (1020 minutes)
  const BREAK_END = 18 * 60;   // 18:00 ET (1080 minutes)

  // 1. Holiday Handling: New Year's Day and Christmas
  if ((month === 0 && date === 1) || (month === 11 && date === 25)) {
    return false;
  }

  // 2. Daily Maintenance Break: Market is closed every day between 17:00 and 18:00 ET
  if (totalMinutes >= BREAK_START && totalMinutes < BREAK_END) {
    return false;
  }

  // 3. Saturday Handling: Market is closed all day
  if (day === 6) {
    return false;
  }

  // 4. Sunday Handling: Market opens at 18:00 ET
  // (Note: The 17:00-18:00 break is already handled in Step 2, 
  // but we must ensure it's closed all day before 17:00)
  if (day === 0 && totalMinutes < BREAK_END) {
    return false;
  }

  // 5. Friday Handling: Market closes at 17:00 ET for the weekend
  if (day === 5 && totalMinutes >= BREAK_START) {
    return false;
  }

  /**
   * 6. Active Trading Window:
   * Covers Sunday 18:00 through Friday 16:59, 
   * excluding the daily 17:00-18:00 maintenance windows.
   */
  return true;
}