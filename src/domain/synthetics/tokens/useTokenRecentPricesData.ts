import throttle from "lodash/throttle";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { ContractsChainId } from "config/chains";
import { GLV_MARKETS } from "config/markets";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { parseContractPrice, TokenPricesData } from "domain/synthetics/tokens";
import { API_UI_FLAGS, useIsApiSdkEnabled } from "domain/synthetics/uiFlags/useIsApiSdkEnabled";
import { FreshnessMetricId, metrics, TickersErrorsCounter } from "lib/metrics";
import { freshnessMetrics } from "lib/metrics/reportFreshnessMetric";
import { useApiDataFallbackCounter } from "lib/metrics/useApiDataFallbackCounter";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher/useOracleKeeperFetcher";
import { LEADERBOARD_PRICES_UPDATE_INTERVAL, PRICES_CACHE_TTL, PRICES_UPDATE_INTERVAL } from "lib/timeConstants";
import type { FrameMeta } from "sdk/clients/v2";
import { getToken, getTokenBySymbol, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import type { Token } from "sdk/utils/tokens/types";

import { useSequentialTimedSWR } from "./useSequentialTimedSWR";
import { getWsPriceStore, type WsPriceStore } from "./wsPriceStreamStore";

// Generous vs normal end-to-end latency so a real stall (not jitter) trips the REST fallback.
const WS_PRICES_STALE_MS = 10_000;
const WS_PRICES_THROTTLE_MS = 250;
const WS_FRESH_PRICES_UPDATE_INTERVAL = 10_000;

type WsFrame = { store: WsPriceStore; prices: TokenPricesData; meta: FrameMeta };

function getWsFrameExpiresAt({ serverTs, originTs, receivedAt }: FrameMeta): number {
  // age at send on the server clock plus time since receipt on the client clock, so clock skew never enters
  return originTs === undefined ? 0 : receivedAt + WS_PRICES_STALE_MS - Math.max(0, serverTs - originTs);
}

export type TokenPricesDataResult = {
  pricesData?: TokenPricesData;
  updatedAt?: number;
  error?: Error;
  isPriceDataLoading: boolean;
};

const PRICES_CACHE: { [chainId: number]: TokenPricesData } = {};
const PRICES_CACHE_UPDATED: { [chainId: number]: { [address: string]: number } } = {};

export function useTokenRecentPricesRequest(
  chainId: ContractsChainId,
  params?: { enabled?: boolean }
): TokenPricesDataResult {
  const { enabled = true } = params ?? {};
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);
  const pathname = useLocation().pathname;

  // TODO temp workaround
  const refreshPricesInterval = useMemo(() => {
    return pathname.startsWith("/leaderboard") || pathname.startsWith("/competitions")
      ? LEADERBOARD_PRICES_UPDATE_INTERVAL
      : PRICES_UPDATE_INTERVAL;
  }, [pathname]);

  PRICES_CACHE[chainId] = PRICES_CACHE[chainId] || {};
  PRICES_CACHE_UPDATED[chainId] = PRICES_CACHE_UPDATED[chainId] || {};

  const sdk = useGmxSdk(chainId);
  const isWsPricesEnabled = useIsApiSdkEnabled(API_UI_FLAGS.wsPrices, chainId);
  const store =
    enabled && isWsPricesEnabled && sdk && refreshPricesInterval === PRICES_UPDATE_INTERVAL
      ? getWsPriceStore(sdk)
      : undefined;

  // Propagate frames at most every WS_PRICES_THROTTLE_MS: the channel carries the whole token set on
  // any token's change, so re-deriving tokensData per frame would be a render storm.
  const [wsFrame, setWsFrame] = useState<WsFrame>();
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  useEffect(() => {
    if (!store) {
      return;
    }
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    // the REST fallback must not wait for an unrelated render
    const scheduleExpiry = (expiresAt: number) => {
      const ttl = expiresAt - Date.now();
      if (ttl > 0) {
        expiryTimer = setTimeout(() => (Date.now() < expiresAt ? scheduleExpiry(expiresAt) : rerender()), ttl);
      }
    };
    const propagate = throttle(
      () => {
        const prices = store.getSnapshot();
        const meta = store.getMeta();
        clearTimeout(expiryTimer);
        setWsFrame(prices && meta ? { store, prices, meta } : undefined);
        if (meta) {
          scheduleExpiry(getWsFrameExpiresAt(meta));
        }
      },
      WS_PRICES_THROTTLE_MS,
      { leading: true, trailing: true }
    );
    const unsubscribe = store.subscribe(propagate);
    propagate();
    return () => {
      propagate.cancel();
      clearTimeout(expiryTimer);
      unsubscribe();
    };
  }, [store]);

  const frame = wsFrame?.store === store ? wsFrame : undefined;
  const freshFrame = frame && Date.now() < getWsFrameExpiresAt(frame.meta) ? frame : undefined;
  const isWsFreshRef = useRef(false);
  isWsFreshRef.current = freshFrame !== undefined;

  // a token the frames lack is priced by REST alone, so REST keeps its cadence until the frames cover every token
  const lastRestPricesRef = useRef<TokenPricesData | undefined>(undefined);
  const lastRestPrices = lastRestPricesRef.current;
  const isRestCoveredByStream =
    freshFrame !== undefined &&
    lastRestPrices !== undefined &&
    Object.keys(lastRestPrices).every((address) => address in freshFrame.prices);

  const key = enabled ? [chainId, oracleKeeperFetcher.url, "useTokenRecentPrices"] : null;

  const { data, error, isLoading } = useSequentialTimedSWR(key, {
    refreshInterval: refreshPricesInterval,
    pollInterval: isRestCoveredByStream ? WS_FRESH_PRICES_UPDATE_INTERVAL : refreshPricesInterval,
    refreshWhenHidden: true,

    fetcher: async ([chainId]) => {
      const priceItems = await oracleKeeperFetcher.fetchTickers().catch(() => {
        metrics.pushCounter<TickersErrorsCounter>("tickersErrors");
        return [];
      });

      const result: TokenPricesData = {};

      priceItems.forEach((priceItem) => {
        const tokenConfig = getPriceTokenConfig(chainId, priceItem.tokenAddress);
        if (!tokenConfig) {
          return;
        }

        const formattedPrices = {
          minPrice: parseContractPrice(BigInt(priceItem.minPrice), tokenConfig.decimals),
          maxPrice: parseContractPrice(BigInt(priceItem.maxPrice), tokenConfig.decimals),
        };

        result[tokenConfig.address] = formattedPrices;

        // Update cache of new received tokens
        PRICES_CACHE[chainId][tokenConfig.address] = formattedPrices;
        PRICES_CACHE_UPDATED[chainId][tokenConfig.address] = Date.now();
      });

      Object.keys(PRICES_CACHE_UPDATED[chainId]).forEach((address) => {
        const cacheUpdatedAt = PRICES_CACHE_UPDATED[chainId][address];
        const canUseCache = cacheUpdatedAt && Date.now() - cacheUpdatedAt < PRICES_CACHE_TTL;

        if (!result[address] && canUseCache) {
          result[address] = PRICES_CACHE[chainId][address];
        }
      });

      const wrappedToken = getWrappedToken(chainId);

      if (result[wrappedToken.address] && !result[NATIVE_TOKEN_ADDRESS]) {
        result[NATIVE_TOKEN_ADDRESS] = result[wrappedToken.address];
      }

      if (isWsFreshRef.current) {
        // the stream serves prices meanwhile, so the slower REST cadence is not a ticker freshness gap
        freshnessMetrics.clear(chainId, FreshnessMetricId.Tickers);
      } else {
        freshnessMetrics.reportThrottled(chainId, FreshnessMetricId.Tickers);
      }

      return {
        pricesData: result,
        updatedAt: Date.now(),
      };
    },
  });

  const restPricesData = data?.pricesData;
  lastRestPricesRef.current = restPricesData;
  const wsPricesData = freshFrame?.prices;
  const pricesData = useMemo(
    () => (wsPricesData ? { ...restPricesData, ...wsPricesData } : restPricesData),
    [restPricesData, wsPricesData]
  );

  useApiDataFallbackCounter({
    domain: "wsPrices",
    chainId,
    apiEnabled: store !== undefined,
    apiData: frame,
    isApiStale: !freshFrame,
    apiError: undefined,
  });

  return {
    pricesData,
    updatedAt: freshFrame ? freshFrame.meta.receivedAt : data?.updatedAt,
    error,
    isPriceDataLoading: isLoading && !freshFrame,
  };
}

export function getPriceTokenConfig(chainId: ContractsChainId, tokenAddress: string): Token | undefined {
  try {
    return getToken(chainId, tokenAddress);
  } catch (e) {
    const glvConfig = Object.values(GLV_MARKETS[chainId] ?? {}).find(
      (glv) => glv.glvTokenAddress.toLowerCase() === tokenAddress.toLowerCase()
    );

    if (!glvConfig) {
      return undefined;
    }

    return {
      ...getTokenBySymbol(chainId, "GLV"),
      address: glvConfig.glvTokenAddress,
    };
  }
}
