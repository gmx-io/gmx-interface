import { getOracleKeeperNextIndex, getOracleKeeperUrl } from "config/oracleKeeper";
import { getNormalizedTokenSymbol } from "config/tokens";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { timezoneOffset } from "domain/prices";
import { Bar } from "domain/tradingview/types";
import { buildUrl } from "lib/buildUrl";
import { useMemo } from "react";

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

export type OracleKeeperFetcher = ReturnType<typeof useOracleKeeperFetcher>;

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

let fallbackThrottleTimerId: any;

export function useOracleKeeperFetcher(chainId: number) {
  const { oracleKeeperInstancesConfig, setOracleKeeperInstancesConfig } = useSettings();
  const oracleKeeperIndex = oracleKeeperInstancesConfig[chainId];
  const oracleKeeperUrl = getOracleKeeperUrl(chainId, oracleKeeperIndex);

  return useMemo(() => {
    const switchOracleKeeper = () => {
      if (fallbackThrottleTimerId) {
        return;
      }

      const nextIndex = getOracleKeeperNextIndex(chainId, oracleKeeperIndex);

      if (nextIndex === oracleKeeperIndex) {
        // eslint-disable-next-line no-console
        console.error(`no available oracle keeper for chain ${chainId}`);
        return;
      }

      // eslint-disable-next-line no-console
      console.log(`switch oracle keeper to ${getOracleKeeperUrl(chainId, nextIndex)}`);

      setOracleKeeperInstancesConfig((old) => {
        return { ...old, [chainId]: nextIndex };
      });

      fallbackThrottleTimerId = setTimeout(() => {
        fallbackThrottleTimerId = undefined;
      }, 5000);
    };

    function fetchTickers(): Promise<TickersResponse> {
      return fetch(buildUrl(oracleKeeperUrl!, "/prices/tickers"))
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
          switchOracleKeeper();

          throw e;
        });
    }

    function fetch24hPrices(): Promise<DayPriceCandle[]> {
      return fetch(buildUrl(oracleKeeperUrl!, "/prices/24h"))
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
          switchOracleKeeper();
          throw e;
        });
    }

    async function fetchOracleCandles(tokenSymbol: string, period: string, limit: number): Promise<Bar[]> {
      tokenSymbol = getNormalizedTokenSymbol(tokenSymbol);

      return fetch(buildUrl(oracleKeeperUrl!, "/prices/candles", { tokenSymbol, period, limit }))
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
          switchOracleKeeper();
          throw e;
        });
    }

    return {
      oracleKeeperUrl,
      fetchTickers,
      fetch24hPrices,
      fetchOracleCandles,
    };
  }, [chainId, oracleKeeperIndex, oracleKeeperUrl, setOracleKeeperInstancesConfig]);
}
