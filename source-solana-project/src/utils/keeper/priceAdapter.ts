import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { IS_DEVELOPMENT } from '@/config/env';
import { BN } from '@coral-xyz/anchor';

/**
 * Token addresses that use keeper API as price source.
 * Derived from GMX_SOLANA_TOKENS_RAW entries with priceSource === 'keeper'.
 */
const KEEPER_TOKEN_ADDRESSES = new Set(
  Object.entries(GMX_SOLANA_TOKENS_RAW)
    .filter(([, config]) => (config as any).priceSource === 'keeper')
    .map(([address]) => address)
);

export function isKeeperToken(tokenAddress: string): boolean {
  return KEEPER_TOKEN_ADDRESSES.has(tokenAddress);
}

export function isKeeperTokenBySymbol(symbol: string): boolean {
  const upperSymbol = symbol.toUpperCase();
  return Object.entries(GMX_SOLANA_TOKENS_RAW).some(
    ([address, config]) =>
      config.symbol.toUpperCase() === upperSymbol &&
      KEEPER_TOKEN_ADDRESSES.has(address)
  );
}

export function getKeeperTokenAddress(symbol: string): string | undefined {
  const upperSymbol = symbol.toUpperCase();
  const entry = Object.entries(GMX_SOLANA_TOKENS_RAW).find(
    ([address, config]) =>
      config.symbol.toUpperCase() === upperSymbol &&
      KEEPER_TOKEN_ADDRESSES.has(address)
  );
  return entry?.[0];
}

/**
 * Convert keeper API price string to 20-decimal BN (TokenPrice format).
 *
 * Keeper API returns: price * 10^(20 - tokenDecimals)
 * Frontend TokenPrice format: price * 10^20
 * Conversion: keeperPrice * 10^tokenDecimals
 */
export function keeperPriceToTokenPrice(
  keeperPrice: string,
  tokenDecimals: number
): BN {
  const price = new BN(keeperPrice);
  const multiplier = new BN(10).pow(new BN(tokenDecimals));
  return price.mul(multiplier);
}

/**
 * Convert price-candle API OHLC string to USD number.
 *
 * Price-candle API returns 18-decimal precision strings.
 * Formula: value / 10^18
 *
 * Note: For values above ~$9 (raw > Number.MAX_SAFE_INTEGER = 2^53-1),
 * Number() loses precision in the lower digits. This is acceptable for
 * OHLC chart display. For 24h change calculation, the relative error
 * from this precision loss is negligible (< 0.0001%).
 */
export function candlePriceToNumber(
  candlePrice: string,
): number {
  return Number(candlePrice) / 1e18;
}

/**
 * Keeper token index-to-market token mapping.
 * Single source of truth — update here when adding new keeper markets.
 */
const KEEPER_INDEX_TO_MARKET: Record<string, string> = {
  // USD/MXN: index token -> market token
  mxnZft9hb7nH93UxTApmXzk95Fg6BERE1PPRzwg6SLL: '73LP1hqW5fphVvwX2HrwcHfLce1fLRvS1axH4GqVYNCp',
  // WTI/USD: index token -> market token
  wtikDoxPLXGSBHacYcLf6SwLQEW5dqGKhErA73QeCrJ: 'ZTn3eszWBDc96ryfYdmDZYd6cuaZ8WxfSCSG8GJnQ8d',
  ...(IS_DEVELOPMENT
    ? {
        // XAU/USD: index token -> market token
        XaurYjNVXW8w61bXjWHGLJbGjcDhRhGDUwS1hEoLCp7: 'CN9QU95PsgDRZmbZZWBmKsZbzMhbd4548uKsJhiavsiu',
      }
    : {}),
  // XCU/USD: index token -> market token
  xcu22Giuo4jqkDgv3KtfyUrco3a42BFLTnS7XjQ5Taz: 'J2dWy224HDioMg5TMWd9jganuMGdiigs5YFZ6QkLVBew',
  // SPCX/USD: index token -> market token
  Spc8vPRaUMi4KKofgM8duFQRBK58xjS15pdzgioAAhD: '5yhCwf9pEbX1t6uevDEgQu2m8q8dPuXi9LUgpPJkTurV',
  // ASTER/USD: index token -> USDT market token
  Ast9jCRDBog1oWQUJbhXbGhiPcjPTgsbPKf3qGK8vixc: 'EgmB7CeymWucnEmVjpqKoXqTuZfMuxzPf89ZziU2gmPE',
  // XPT/USD: index token -> market token
  xptah2VhwW4pcLdkMvUinEsDNvMXpgHiVfG2mmkEuGR: 'DHtPBDyjAW82GGUV244gZR3TfMtFuYewwQ4qwpPFAsCP',
  // XPD/USD: index token -> market token
  xpd2uvvfPfoogQxyrLyqE3NgSHSbkNNXr7bGnJWLB6n: '94Mpdu745RWL2eBqu1SvuV2HnX9EfFQSGm3uxvfMBmv6',
};

const KEEPER_CANDLE_UNSUPPORTED_TOKENS = new Set([
  ...(IS_DEVELOPMENT
    ? [
        // XAU/USD is priced by keeper, but devnet price-candle has no history for it yet.
        'XaurYjNVXW8w61bXjWHGLJbGjcDhRhGDUwS1hEoLCp7',
      ]
    : []),
]);

const CANDLE_MARKET_HOURS_UNFILTERED_TOKENS = new Set([
  ...(IS_DEVELOPMENT
    ? [
        // XAU/USD prices are available 24/7, so chart candles should not skip weekends or daily breaks.
        'XaurYjNVXW8w61bXjWHGLJbGjcDhRhGDUwS1hEoLCp7',
        'Wtipz9V5BMqzuvt4JM4yn4tfcqNFwApbcVnBVfL5bxg',
        'BrtjQJGj7QvRnCur56ng2F3hL52JL5euavgvf5VqJMTZ',
        'Eurzo3GcsjD9sf32gC4RUu8oUVVmFV2oWqCZvfnzshXM',
      ]
    : []),
]);

export function getKeeperMarketToken(indexToken: string): string | undefined {
  return KEEPER_INDEX_TO_MARKET[indexToken];
}

function isAlwaysOpenToken(tokenAddress: string): boolean {
  return GMX_SOLANA_TOKENS_RAW[tokenAddress]?.tradingHours === '24/7';
}

export function isKeeperCandleToken(tokenAddress: string): boolean {
  return (
    isKeeperToken(tokenAddress) &&
    !KEEPER_CANDLE_UNSUPPORTED_TOKENS.has(tokenAddress)
  );
}

export function isKeeperCandleTokenBySymbol(symbol: string): boolean {
  const tokenAddress = getKeeperTokenAddress(symbol);
  return tokenAddress ? isKeeperCandleToken(tokenAddress) : false;
}

export function shouldFilterCandleMarketHours(tokenAddress: string): boolean {
  return (
    !isAlwaysOpenToken(tokenAddress) &&
    !CANDLE_MARKET_HOURS_UNFILTERED_TOKENS.has(tokenAddress)
  );
}

export function shouldFilterCandleMarketHoursBySymbol(symbol: string): boolean {
  const upperSymbol = symbol.toUpperCase();
  const entry = Object.entries(GMX_SOLANA_TOKENS_RAW).find(
    ([, config]) => config.symbol.toUpperCase() === upperSymbol
  );

  return entry ? shouldFilterCandleMarketHours(entry[0]) : true;
}

export function resolutionToSeconds(resolution: string): number {
  const map: Record<string, number> = {
    '1': 60,
    '5': 300,
    '15': 900,
    '60': 3600,
    '120': 7200,
    '240': 14400,
    '1D': 86400,
    '1W': 604800,
    '1M': 2592000,
  };
  return map[resolution] ?? 3600;
}
