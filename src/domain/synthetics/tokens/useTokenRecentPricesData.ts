import throttle from "lodash/throttle";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { ContractsChainId, isSolanaNetwork } from "config/chains";
import { GLV_MARKETS } from "config/markets";
import { useOptionalGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { parseContractPrice, TokenPricesData } from "domain/synthetics/tokens";
import { API_UI_FLAGS, useIsApiSdkEnabled } from "domain/synthetics/uiFlags/useIsApiSdkEnabled";
import { createTimeoutSignal } from "lib/abortSignalHelpers";
import { useChainId } from "lib/chains";
import { ApiDataFallbackCounter, FreshnessMetricId, metrics, TickersErrorsCounter } from "lib/metrics";
import { freshnessMetrics } from "lib/metrics/reportFreshnessMetric";
import { useApiDataFallbackCounter } from "lib/metrics/useApiDataFallbackCounter";
import type { OracleFetcher } from "lib/oracleKeeperFetcher";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher/useOracleKeeperFetcher";
import { LEADERBOARD_PRICES_UPDATE_INTERVAL, PRICES_CACHE_TTL, PRICES_UPDATE_INTERVAL } from "lib/timeConstants";
import type { FrameMeta, GmxApiSdk } from "sdk/clients/v2";
import { getToken, getTokenBySymbol, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { isSameAddress } from "sdk/utils/address";
import type { Token } from "sdk/utils/tokens/types";

import { useSequentialTimedSWR } from "./useSequentialTimedSWR";
import { getWsPriceStore, type WsPriceStore } from "./wsPriceStreamStore";

// Generous vs normal end-to-end latency so a real stall (not jitter) trips the REST fallback.
const WS_PRICES_STALE_MS = 10_000;
const WS_PRICES_THROTTLE_MS = 250;
const WS_FRESH_PRICES_UPDATE_INTERVAL = 10_000;
const GMX_API_PRICES_TIMEOUT_MS = 3_000;
const GMX_API_PRICES_SOURCE = "gmx-api";

type WsFrame = { store: WsPriceStore; prices: TokenPricesData; meta: FrameMeta; isLive: boolean };

export function getWsFrameExpiresAt({ serverTs, originTs, receivedAt }: FrameMeta): number {
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
const IS_IN_KEEPER_FALLBACK: { [chainId: number]: boolean } = {};

type KeeperFallbackReason = "error" | "timeout" | "empty";

export function useTokenRecentPricesRequest(
  chainId: ContractsChainId,
  params?: { enabled?: boolean; keeperOnly?: boolean }
): TokenPricesDataResult {
  const { enabled = true, keeperOnly = false } = params ?? {};
  const { networkId } = useChainId();
  const pricesEnabled = enabled && !isSolanaNetwork(networkId);
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

  const sdk = useOptionalGmxSdk(chainId);
  const isGmxApiPricesEnabled = useIsApiSdkEnabled(API_UI_FLAGS.wsPrices, chainId);
  const pricesSdk = pricesEnabled && isGmxApiPricesEnabled && !keeperOnly ? sdk : undefined;
  const store = pricesSdk && refreshPricesInterval === PRICES_UPDATE_INTERVAL ? getWsPriceStore(pricesSdk) : undefined;

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
        setWsFrame(prices && meta ? { store, prices, meta, isLive: store.isLive() } : undefined);
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
  const isFrameFresh = frame !== undefined && Date.now() < getWsFrameExpiresAt(frame.meta);
  const liveFreshFrame = isFrameFresh && frame.isLive ? frame : undefined;

  // a token the frames lack is priced by REST alone, so REST keeps its cadence until the frames cover every token
  const lastRestPricesRef = useRef<TokenPricesData | undefined>(undefined);
  const lastRestPrices = lastRestPricesRef.current;
  const isRestCoveredByStream =
    liveFreshFrame !== undefined &&
    lastRestPrices !== undefined &&
    Object.keys(lastRestPrices).every((address) => address in liveFreshFrame.prices);
  const isRestCoveredByStreamRef = useRef(false);
  isRestCoveredByStreamRef.current = isRestCoveredByStream;

  const pricesSource = pricesSdk ? GMX_API_PRICES_SOURCE : oracleKeeperFetcher.url;
  const key = pricesEnabled ? [chainId, pricesSource, "useTokenRecentPrices"] : null;

  const { data, error, isLoading } = useSequentialTimedSWR(key, {
    baseInterval: refreshPricesInterval,
    pollInterval: isRestCoveredByStream ? WS_FRESH_PRICES_UPDATE_INTERVAL : refreshPricesInterval,
    refreshWhenHidden: true,

    fetcher: async ([chainId]) => {
      const result = await fetchRestPrices(chainId, pricesSdk, oracleKeeperFetcher);

      Object.entries(result).forEach(([address, tokenPrices]) => {
        // Update cache of new received tokens
        PRICES_CACHE[chainId][address] = tokenPrices;
        PRICES_CACHE_UPDATED[chainId][address] = Date.now();
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

      if (isRestCoveredByStreamRef.current) {
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
  const isFrameNewerThanRest = frame !== undefined && frame.meta.receivedAt > (data?.updatedAt ?? 0);
  const usableFrame = isFrameFresh && (frame.isLive || isFrameNewerThanRest) ? frame : undefined;
  const wsPricesData = usableFrame?.prices;
  const pricesData = useMemo(
    () => (wsPricesData ? { ...restPricesData, ...wsPricesData } : restPricesData),
    [restPricesData, wsPricesData]
  );

  useApiDataFallbackCounter({
    domain: "wsPrices",
    chainId,
    apiEnabled: store !== undefined,
    apiData: frame,
    isApiStale: !usableFrame,
    apiError: undefined,
  });

  return {
    pricesData,
    updatedAt: usableFrame ? usableFrame.meta.receivedAt : data?.updatedAt,
    error,
    isPriceDataLoading: isLoading && !usableFrame,
  };
}

async function fetchRestPrices(
  chainId: ContractsChainId,
  pricesSdk: GmxApiSdk | undefined,
  oracleKeeperFetcher: OracleFetcher
): Promise<TokenPricesData> {
  if (!pricesSdk) {
    return fetchKeeperPrices(chainId, oracleKeeperFetcher);
  }

  const { prices, fallbackReason } = await fetchGmxApiPrices(chainId, pricesSdk);
  trackKeeperFallback(chainId, fallbackReason);

  if (!prices) {
    return fetchKeeperPrices(chainId, oracleKeeperFetcher);
  }

  return prices;
}

function trackKeeperFallback(chainId: ContractsChainId, fallbackReason: KeeperFallbackReason | undefined) {
  if (fallbackReason && !IS_IN_KEEPER_FALLBACK[chainId]) {
    metrics.pushCounter<ApiDataFallbackCounter>("apiData.fallback", {
      domain: "restPrices",
      reason: fallbackReason,
      chainId,
    });
  }

  IS_IN_KEEPER_FALLBACK[chainId] = fallbackReason !== undefined;
}

async function fetchGmxApiPrices(
  chainId: ContractsChainId,
  sdk: GmxApiSdk
): Promise<{ prices?: TokenPricesData; fallbackReason?: KeeperFallbackReason }> {
  const signal = createTimeoutSignal(GMX_API_PRICES_TIMEOUT_MS);
  const response = await sdk.fetchTokenPrices({ signal }).catch(() => undefined);

  if (!response) {
    return { fallbackReason: signal.aborted ? "timeout" : "error" };
  }

  const prices: TokenPricesData = {};

  Object.entries(response.prices).forEach(([address, tokenPrices]) => {
    const tokenConfig = getPriceTokenConfig(chainId, address);
    if (tokenConfig) {
      prices[tokenConfig.address] = tokenPrices;
    }
  });

  if (Object.keys(prices).length === 0) {
    return { fallbackReason: "empty" };
  }

  return { prices };
}

async function fetchKeeperPrices(
  chainId: ContractsChainId,
  oracleKeeperFetcher: OracleFetcher
): Promise<TokenPricesData> {
  const priceItems = await oracleKeeperFetcher.fetchTickers().catch(() => {
    metrics.pushCounter<TickersErrorsCounter>("tickersErrors");
    return [];
  });

  const prices: TokenPricesData = {};

  priceItems.forEach((priceItem) => {
    const tokenConfig = getPriceTokenConfig(chainId, priceItem.tokenAddress);
    if (!tokenConfig) {
      return;
    }

    prices[tokenConfig.address] = {
      minPrice: parseContractPrice(BigInt(priceItem.minPrice), tokenConfig.decimals),
      maxPrice: parseContractPrice(BigInt(priceItem.maxPrice), tokenConfig.decimals),
    };
  });

  return prices;
}

export function getPriceTokenConfig(chainId: ContractsChainId, tokenAddress: string): Token | undefined {
  try {
    return getToken(chainId, tokenAddress);
  } catch (e) {
    const glvConfig = Object.values(GLV_MARKETS[chainId] ?? {}).find((glv) =>
      isSameAddress(glv.glvTokenAddress, tokenAddress)
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
