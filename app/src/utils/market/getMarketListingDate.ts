import { DEFAULT_LISTING, MARKETS } from '@/config/markets';

export function getMarketListingDate(marketAddress: string): Date {
  const market = MARKETS[marketAddress];

  if (!market?.listingDate) {
    return DEFAULT_LISTING;
  }

  return market.listingDate;
}
