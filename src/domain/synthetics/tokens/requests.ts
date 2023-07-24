import { getOracleKeeperUrl } from "config/oracleKeeper";
import { getNormalizedTokenSymbol, getTokenBySymbol } from "config/tokens";
import { timezoneOffset } from "domain/prices";
import { Bar } from "domain/tradingview/types";
import { TokenPrices } from "./types";
import { parseOraclePrice } from "./utils";

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

  const url = getOracleKeeperUrl(chainId, "/prices/candles/new", { tokenSymbol, limit, period });

  const res = await fetch(url).then((res) => res.json());

  const result = res.candles.map(parseOracleCandle);

  return result;
}

export async function fetchOracleCandles(chainId: number, tokenSymbol: string, period: string): Promise<Bar[]> {
  tokenSymbol = getNormalizedTokenSymbol(tokenSymbol);

  const limit = 5000;

  const url = getOracleKeeperUrl(chainId, "/prices/candles/new", { tokenSymbol, period, limit });

  const res = await fetch(url).then((res) => res.json());

  const result = res.candles.map(parseOracleCandle).reverse();

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
