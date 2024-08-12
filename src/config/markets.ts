import { parse } from "date-fns";

const p = (date: string) => parse(date, "dd MMM yyyy", new Date());

export const ENOUGH_DAYS_SINCE_LISTING_FOR_APY = 7;
const DEFAULT_LISTING = {
  listingDate: p("01 Jan 1970"),
};

export function isMarketEnabled(chainId: number, marketAddress: string) {
  return true;
}

/**
 * @returns Date when token was listed on the platform. If the date was not specified in config, returns 01 Jan 1970.
 */
export function getMarketListingDate(chainId: number, marketAddress: string): Date {
  return DEFAULT_LISTING.listingDate;
}
