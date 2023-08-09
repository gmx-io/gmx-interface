import { getOracleKeeperUrlKey } from "config/localStorage";
import { getOracleKeeperRandomUrl } from "config/oracleKeeper";
import { getNormalizedTokenSymbol } from "config/tokens";
import { timezoneOffset } from "domain/prices";
import { Bar } from "domain/tradingview/types";
import { buildUrl } from "lib/buildUrl";

export type TickersResponse = {
  minPrice: string;
  maxPrice: string;
  oracleDecimals: number;
  tokenSymbol: string;
  tokenAddress: string;
  updatedAt: number;
}[];

export type DayPriceCandle = {
  tokenSymbol: string;
  high: number;
  low: number;
  open: number;
  close: number;
};

function getCurrentOracleKeeperUrl(chainId: number) {
  let url = localStorage.getItem(getOracleKeeperUrlKey(chainId));

  if (!url) {
    url = getOracleKeeperRandomUrl(chainId);
    localStorage.setItem(getOracleKeeperUrlKey(chainId), url);
  }

  return url;
}

function updateOracleKeeperUrl(chainId: number) {
  const currentUrl = getCurrentOracleKeeperUrl(chainId);
  const nextUrl = getOracleKeeperRandomUrl(chainId, [currentUrl]);

  // eslint-disable-next-line no-console
  console.log(`switch oracle keeper to ${nextUrl}`);

  localStorage.setItem(getOracleKeeperUrlKey(chainId), nextUrl);
}

export function fetchTickers(chainId: number): Promise<TickersResponse> {
  const baseUrl = getCurrentOracleKeeperUrl(chainId);

  return fetch(buildUrl(baseUrl, "/prices/tickers"))
    .then((res) => res.json())
    .then((res) => {
      if (!res.length) {
        throw new Error("Invalid tickers response");
      }

      return res;
    })
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(e);
      updateOracleKeeperUrl(chainId);

      throw e;
    });
}

export function fetch24hPrices(chainId: number): Promise<DayPriceCandle[]> {
  const baseUrl = getCurrentOracleKeeperUrl(chainId);

  return fetch(buildUrl(baseUrl, "/prices/24h"))
    .then((res) => res.json())
    .then((res) => {
      if (!res?.length) {
        throw new Error("Invalid 24h prices response");
      }

      return res;
    })
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(e);
      updateOracleKeeperUrl(chainId);
      throw e;
    });
}

export async function fetchLastOracleCandles(
  chainId: number,
  tokenSymbol: string,
  period: string,
  limit: number
): Promise<Bar[]> {
  tokenSymbol = getNormalizedTokenSymbol(tokenSymbol);

  const baseUrl = getCurrentOracleKeeperUrl(chainId);

  return fetch(buildUrl(baseUrl, "/prices/candles", { tokenSymbol, period, limit }))
    .then((res) => res.json())
    .then((res) => {
      if (!Array.isArray(res.candles) || (res.candles.length === 0 && limit > 0)) {
        throw new Error("Invalid candles response");
      }

      return res.candles.map(parseOracleCandle);
    })
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(e);
      updateOracleKeeperUrl(chainId);
      throw e;
    });
}

export async function fetchOracleCandles(chainId: number, tokenSymbol: string, period: string): Promise<Bar[]> {
  tokenSymbol = getNormalizedTokenSymbol(tokenSymbol);

  const limit = 5000;

  const result = await fetchLastOracleCandles(chainId, tokenSymbol, period, limit);

  return result.reverse();
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
