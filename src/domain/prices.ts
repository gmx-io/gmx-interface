import { useMemo } from "react";
import { gql } from "@apollo/client";
import useSWR from "swr";

import { USD_DECIMALS, CHART_PERIODS } from "lib/legacy";
import { GMX_STATS_API_URL } from "config/backend";
import { chainlinkClient } from "lib/subgraph/clients";
import { sleep } from "lib/sleep";
import { formatAmount } from "lib/numbers";
import { getNativeToken, getNormalizedTokenSymbol, isChartAvailabeForToken } from "config/tokens";
import type { Bar, FromOldToNewArray } from "./tradingview/types";

// Ethereum network, Chainlink Aggregator contracts
const FEED_ID_MAP = {
  BTC_USD: "0xae74faa92cb67a95ebcab07358bc222e33a34da7",
  ETH_USD: "0xe62b71cf983019bff55bc83b48601ce8419650cc",
  BNB_USD: "0xc45ebd0f901ba6b2b8c7e70b717778f055ef5e6d",
  LINK_USD: "0xdfd03bfc3465107ce570a0397b247f546a42d0fa",
  UNI_USD: "0x68577f915131087199fe48913d8b416b3984fd38",
  SUSHI_USD: "0x7213536a36094cd8a768a5e45203ec286cba2d74",
  AVAX_USD: "0x0fc3657899693648bba4dbd2d8b33b82e875105d",
  AAVE_USD: "0xe3f0dede4b499c07e12475087ab1a084b5f93bc0",
  YFI_USD: "0x8a4d74003870064d41d4f84940550911fbfccf04",
  SPELL_USD: "0x8640b23468815902e011948f3ab173e1e83f9879",
};
export const TIMEZONE_OFFSET_SEC = -new Date().getTimezoneOffset() * 60;

type CompactBar = {
  t: number;
  o: number;
  c: number;
  h: number;
  l: number;
};

function formatBarInfo(compactBar: CompactBar): Bar {
  const { t, o: open, c: close, h: high, l: low } = compactBar;
  return {
    time: t + TIMEZONE_OFFSET_SEC,
    open,
    close,
    high,
    low,
  };
}

export function fillGaps(prices, periodSeconds) {
  if (prices.length < 2) {
    return prices;
  }

  const newPrices = [prices[0]];
  let prevTime = prices[0].time;
  for (let i = 1; i < prices.length; i++) {
    const { time, open } = prices[i];
    if (prevTime) {
      let j = (time - prevTime) / periodSeconds - 1;
      while (j > 0) {
        newPrices.push({
          time: time - j * periodSeconds,
          open,
          close: open,
          high: open * 1.0003,
          low: open * 0.9996,
        });
        j--;
      }
    }

    prevTime = time;
    newPrices.push(prices[i]);
  }

  return newPrices;
}

export async function getLimitChartPricesFromStats(
  chainId: number,
  symbol: string,
  period: string,
  limit = 1
): Promise<FromOldToNewArray<Bar>> {
  symbol = getNormalizedTokenSymbol(symbol);

  if (!isChartAvailabeForToken(chainId, symbol)) {
    symbol = getNativeToken(chainId).symbol;
  }

  const url = `${GMX_STATS_API_URL}/candles/${symbol}?preferableChainId=${chainId}&period=${period}&limit=${limit}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const prices = await response.json().then(({ prices }) => prices);
    return prices.map(formatBarInfo);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error fetching data: ${error}`);
    return [];
  }
}

export async function getChartPricesFromStats(
  chainId: number,
  symbol: string,
  period: string
): Promise<FromOldToNewArray<Bar>> {
  symbol = getNormalizedTokenSymbol(symbol);

  const timeDiff = CHART_PERIODS[period] * 3000;
  const from = Math.floor(Date.now() / 1000 - timeDiff);
  const url = `${GMX_STATS_API_URL}/candles/${symbol}?preferableChainId=${chainId}&period=${period}&from=${from}&preferableSource=fast`;

  const TIMEOUT = 5000;
  const res: Response = await new Promise(async (resolve, reject) => {
    let done = false;
    setTimeout(() => {
      done = true;
      reject(new Error(`request timeout ${url}`));
    }, TIMEOUT);

    let lastEx;
    for (let i = 0; i < 3; i++) {
      if (done) return;
      try {
        const res = await fetch(url);
        resolve(res);
        return;
      } catch (ex) {
        await sleep(300);
        lastEx = ex;
      }
    }
    reject(lastEx);
  });
  if (!res.ok) {
    throw new Error(`request failed ${res.status} ${res.statusText}`);
  }
  const json: { prices: CompactBar[]; updatedAt: number; period: string } = await res.json();
  let compactPrices = json?.prices;
  if (!compactPrices || compactPrices.length < 1) {
    throw new Error(`not enough prices data: ${compactPrices?.length}`);
  }

  const OBSOLETE_THRESHOLD = Date.now() / 1000 - 60 * 30; // 30 min ago
  const updatedAt = json?.updatedAt || 0;
  if (updatedAt < OBSOLETE_THRESHOLD) {
    throw new Error(
      "chart data is obsolete, last price record at " +
        new Date(updatedAt * 1000).toISOString() +
        " now: " +
        new Date().toISOString()
    );
  }

  const prices = compactPrices.map(formatBarInfo);

  return prices;
}

function getCandlesFromPrices(prices, period) {
  const periodTime = CHART_PERIODS[period];

  if (prices.length < 2) {
    return [];
  }

  const candles: any[] = [];
  const first = prices[0];
  let prevTsGroup = Math.floor(first[0] / periodTime) * periodTime;
  let prevPrice = first[1];
  let o = prevPrice;
  let h = prevPrice;
  let l = prevPrice;
  let c = prevPrice;
  for (let i = 1; i < prices.length; i++) {
    const [ts, price] = prices[i];
    const tsGroup = Math.floor(ts / periodTime) * periodTime;
    if (prevTsGroup !== tsGroup) {
      candles.push({ t: prevTsGroup + TIMEZONE_OFFSET_SEC, o, h, l, c });
      o = c;
      h = Math.max(o, c);
      l = Math.min(o, c);
    }
    c = price;
    h = Math.max(h, price);
    l = Math.min(l, price);
    prevTsGroup = tsGroup;
  }

  return candles.map(({ t: time, o: open, c: close, h: high, l: low }) => ({
    time,
    open,
    close,
    high,
    low,
  }));
}

export function getChainlinkChartPricesFromGraph(tokenSymbol: string, period: string): Promise<FromOldToNewArray<Bar>> {
  tokenSymbol = getNormalizedTokenSymbol(tokenSymbol);
  const marketName = tokenSymbol + "_USD";
  const feedId = FEED_ID_MAP[marketName];
  if (!feedId) {
    throw new Error(`undefined marketName ${marketName}`);
  }

  const PER_CHUNK = 1000;
  const CHUNKS_TOTAL = 6;
  const requests: any[] = [];
  for (let i = 0; i < CHUNKS_TOTAL; i++) {
    const query = gql(`{
      rounds(
        first: ${PER_CHUNK},
        skip: ${i * PER_CHUNK},
        orderBy: unixTimestamp,
        orderDirection: desc,
        where: {feed: "${feedId}"}
      ) {
        unixTimestamp,
        value
      }
    }`);
    requests.push(chainlinkClient.query({ query }));
  }

  return Promise.all(requests)
    .then((chunks) => {
      let prices: any[] = [];
      const uniqTs = new Set();
      chunks.forEach((chunk) => {
        chunk.data.rounds.forEach((item) => {
          if (uniqTs.has(item.unixTimestamp)) {
            return;
          }

          uniqTs.add(item.unixTimestamp);
          prices.push([item.unixTimestamp, Number(item.value) / 1e8]);
        });
      });

      prices.sort(([timeA], [timeB]) => timeA - timeB);
      prices = getCandlesFromPrices(prices, period);
      return prices;
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      return [];
    });
}

export function useChartPrices(chainId, symbol, isStable, period, currentAveragePrice) {
  const swrKey = !isStable && symbol ? ["getChartCandles", chainId, symbol, period] : null;
  let { data: prices, mutate: updatePrices } = useSWR(swrKey, {
    fetcher: async () => {
      try {
        return await getChartPricesFromStats(chainId, symbol, period);
      } catch (ex) {
        // eslint-disable-next-line no-console
        console.warn(ex);
        // eslint-disable-next-line no-console
        console.warn("Switching to graph chainlink data");
        try {
          return await getChainlinkChartPricesFromGraph(symbol, period);
        } catch (ex2) {
          // eslint-disable-next-line no-console
          console.warn("getChainlinkChartPricesFromGraph failed");
          // eslint-disable-next-line no-console
          console.warn(ex2);
          return [];
        }
      }
    },
    dedupingInterval: 60000,
    focusThrottleInterval: 60000 * 10,
  });

  const currentAveragePriceString = currentAveragePrice && currentAveragePrice.toString();
  const retPrices = useMemo(() => {
    if (isStable) {
      return getStablePriceData(period);
    }

    if (!prices) {
      return [];
    }

    let _prices = [...prices];
    if (currentAveragePriceString && prices.length) {
      _prices = appendCurrentAveragePrice(_prices, BigInt(currentAveragePriceString), period);
    }

    return fillGaps(_prices, CHART_PERIODS[period]);
  }, [prices, isStable, currentAveragePriceString, period]);

  return [retPrices, updatePrices];
}

function appendCurrentAveragePrice(prices, currentAveragePrice, period) {
  const periodSeconds = CHART_PERIODS[period];
  const currentCandleTime = Math.floor(Date.now() / 1000 / periodSeconds) * periodSeconds + TIMEZONE_OFFSET_SEC;
  const last = prices[prices.length - 1];
  const averagePriceValue = parseFloat(formatAmount(currentAveragePrice, USD_DECIMALS, 2));
  if (currentCandleTime === last.time) {
    last.close = averagePriceValue;
    last.high = Math.max(last.open, last.high, averagePriceValue);
    last.low = Math.min(last.open, last.low, averagePriceValue);
    return prices;
  } else {
    const newCandle = {
      time: currentCandleTime,
      open: last.close,
      close: averagePriceValue,
      high: averagePriceValue,
      low: averagePriceValue,
    };
    return [...prices, newCandle];
  }
}

export function getStablePriceData(period, countBack = 100) {
  const periodSeconds = CHART_PERIODS[period];
  const now = Math.floor(Date.now() / 1000 / periodSeconds) * periodSeconds;
  let priceData: any = [];
  for (let i = countBack; i > 0; i--) {
    priceData.push({
      time: now - i * periodSeconds,
      open: 1,
      close: 1,
      high: 1,
      low: 1,
    });
  }
  return priceData;
}
