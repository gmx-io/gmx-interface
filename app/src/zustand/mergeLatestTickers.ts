import { isAlwaysOpenTokenBySymbol } from '@/config/program';

export interface TimestampedTicker {
  symbol: string;
  timestamp?: number | string;
  [key: string]: unknown;
}

function getTimestamp(ticker: TimestampedTicker): number | undefined {
  const timestamp = Number(ticker.timestamp);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function hasOracleRange(ticker: TimestampedTicker): boolean {
  const minPrice = Number(ticker.minUnitPrice);
  const maxPrice = Number(ticker.maxUnitPrice);
  return (
    Number.isFinite(minPrice) &&
    Number.isFinite(maxPrice) &&
    minPrice > 0 &&
    maxPrice > minPrice
  );
}

function requiresOracleRangeProtection(symbol: string): boolean {
  return isAlwaysOpenTokenBySymbol(symbol) && symbol.toUpperCase() !== 'XCU';
}

export function mergeLatestTickers<T extends TimestampedTicker>(
  current: T[],
  incoming: T[]
): T[] {
  const currentBySymbol = new Map(
    current.map((ticker) => [ticker.symbol, ticker])
  );

  return incoming.flatMap((ticker) => {
    const previous = currentBySymbol.get(ticker.symbol);
    if (!previous) {
      return requiresOracleRangeProtection(ticker.symbol) && !hasOracleRange(ticker)
        ? []
        : [ticker];
    }

    if (hasOracleRange(previous) && !hasOracleRange(ticker)) {
      return [previous];
    }

    const previousTimestamp = getTimestamp(previous);
    const incomingTimestamp = getTimestamp(ticker);
    if (
      previousTimestamp !== undefined &&
      incomingTimestamp !== undefined &&
      incomingTimestamp <= previousTimestamp
    ) {
      return [previous];
    }

    return [ticker];
  });
}
