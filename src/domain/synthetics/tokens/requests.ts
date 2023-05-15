import { getOracleKeeperUrl } from "config/oracleKeeper";
import { getNormalizedTokenSymbol, getTokenBySymbol } from "config/tokens";
import { Bar } from "domain/tradingview/types";
import { CHART_PERIODS } from "lib/legacy";
import { parseOraclePrice } from "./utils";
import { timezoneOffset } from "domain/prices";
import { TokenPrices } from "./types";

export async function fetchOracleRecentPrice(chainId: number, tokenSymbol: string): Promise<TokenPrices> {
  const url = getOracleKeeperUrl(chainId, "/prices/tickers");

  tokenSymbol = getNormalizedTokenSymbol(tokenSymbol);

  const token = getTokenBySymbol(chainId, tokenSymbol);

  const res = await fetch(url).then((res) => res.json());

  const priceItem = res.find((item) => item.tokenSymbol === tokenSymbol);

  if (!priceItem) {
    throw new Error(`no price for ${tokenSymbol} found`);
  }

  const minPrice = parseOraclePrice(priceItem.minPrice, token.decimals, priceItem.oracleDecimals);
  const maxPrice = parseOraclePrice(priceItem.maxPrice, token.decimals, priceItem.oracleDecimals);

  return { minPrice, maxPrice };
}

export async function fetchLastOracleCandles(
  chainId: number,
  tokenSymbol: string,
  period: string,
  limit: number
): Promise<Bar[]> {
  tokenSymbol = getNormalizedTokenSymbol(tokenSymbol);

  const url = getOracleKeeperUrl(chainId, "/prices/candles", { tokenSymbol, limit, period });

  const res = await fetch(url).then((res) => res.json());

  const result = res.candles.map(parseOracleCandle);

  return result;
}

export async function fetchOracleCandles(chainId: number, tokenSymbol: string, period: string): Promise<Bar[]> {
  tokenSymbol = getNormalizedTokenSymbol(tokenSymbol);

  const limit = 5000;

  const timeDiff = CHART_PERIODS[period] * limit;
  const after = Math.floor(Date.now() / 1000 - timeDiff);

  const url = getOracleKeeperUrl(chainId, "/prices/candles", { tokenSymbol, period, asc: true, after, limit });

  const res = await fetch(url).then((res) => res.json());

  const result = res.candles.map(parseOracleCandle);

  return result;
}

function parseOracleCandle(rawCandle: number[]): Bar {
  const [timestamp, open, high, low, close] = rawCandle;

  return {
    time: timestamp + timezoneOffset,
    open,
    high,
    low,
    close,
  };
}
