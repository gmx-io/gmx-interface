import { getOracleKeeperNextIndex, getOracleKeeperUrl } from "config/oracleKeeper";
import { getNormalizedTokenSymbol } from "config/tokens";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { timezoneOffset } from "domain/prices";
import { Bar } from "domain/tradingview/types";
import { buildUrl } from "lib/buildUrl";
import { useLocalStorageSerializeKey } from "lib/localStorage";
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

export type RawIncentivesStats = {
  lp: {
    isActive: boolean;
    totalRewards: string;
    period: number;
    rewardsPerMarket: Record<string, string>;
  };
  migration: {
    isActive: boolean;
    maxRebateBps: number;
    period: number;
  };
  trading:
    | {
        isActive: true;
        rebatePercent: number;
        allocation: string;
        period: number;
      }
    | {
        isActive: false;
      };
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
  const [forceIncentivesActive] = useLocalStorageSerializeKey("forceIncentivesActive", false);

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

    async function fetchIncentivesRewards(): Promise<RawIncentivesStats | null> {
      return fetch(
        buildUrl(oracleKeeperUrl!, "/incentives/stip", {
          ignoreStartDate: forceIncentivesActive ? "1" : undefined,
          // DO NOT MERGE THIS (midas-myth)
          timestamp: 1721497600,
        })
      )
        .then((res) => res.json())
        .catch((e) => {
          // eslint-disable-next-line no-console
          console.error(e);
          switchOracleKeeper();
          return null;
        });
    }

    return {
      oracleKeeperUrl,
      fetchTickers,
      fetch24hPrices,
      fetchOracleCandles,
      fetchIncentivesRewards,
    };
  }, [chainId, forceIncentivesActive, oracleKeeperIndex, oracleKeeperUrl, setOracleKeeperInstancesConfig]);
}
