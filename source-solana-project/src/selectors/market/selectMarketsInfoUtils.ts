import { getPoolUsdWithoutPnl } from '@/utils/market/getPoolUsdWithoutPnl';

import {
  Market,
  MarketInfo,
  MarketState,
  MarketStatus,
  MarketsInfo,
} from '@/selectors/market/types';
import { TokenData, TokensData } from '@/selectors/token/types';
import { getByKey } from '@/utils/lib/object';
import { getMarketIndexName } from '@/utils/market/getMarketIndexName';
import { getMarketPoolName } from '@/utils/market/getMarketPoolName';

export type MarketDepsSnapshot = {
  market: Market;
  state: MarketState;
  status: MarketStatus | undefined;
  indexToken: TokenData;
  longToken: TokenData;
  shortToken: TokenData;
};

let cachedMarketsInfo: MarketsInfo = {};
let cachedDepsByKey: Record<string, MarketDepsSnapshot> = {};

export function areMarketDepsEqual(
  a: MarketDepsSnapshot,
  b: MarketDepsSnapshot
): boolean {
  return (
    a.market === b.market &&
    a.state === b.state &&
    a.status === b.status &&
    a.indexToken === b.indexToken &&
    a.longToken === b.longToken &&
    a.shortToken === b.shortToken
  );
}

function resolveMarketInfo(
  key: string,
  deps: MarketDepsSnapshot
): { info: MarketInfo; deps: MarketDepsSnapshot; reused: boolean } {
  const prevDeps = cachedDepsByKey[key];
  const prevInfo = cachedMarketsInfo[key];

  if (prevDeps && prevInfo && areMarketDepsEqual(prevDeps, deps)) {
    return { info: prevInfo, deps: prevDeps, reused: true };
  }

  return {
    info: buildMarketInfo(
      deps.market,
      deps.state,
      deps.status,
      deps.indexToken,
      deps.longToken,
      deps.shortToken
    ),
    deps,
    reused: false,
  };
}

export function computeMarketInfoForKey(
  key: string,
  deps: MarketDepsSnapshot
): MarketInfo {
  const result = resolveMarketInfo(key, deps);

  if (!result.reused) {
    cachedDepsByKey[key] = result.deps;
    cachedMarketsInfo[key] = result.info;
  }

  return result.info;
}

export function buildMarketInfo(
  market: Market,
  state: MarketState,
  status: MarketStatus | undefined,
  indexToken: TokenData,
  longToken: TokenData,
  shortToken: TokenData
): MarketInfo {
  const indexName = getMarketIndexName({
    indexToken,
    isSpotOnly: market.isSpotOnly,
    longToken,
    shortToken,
  });
  const poolName = getMarketPoolName({
    longToken,
    shortToken,
  });

  const info = {
    ...market,
    ...state,
    ...status,
    name: `${indexName}[${poolName}]`,
    indexToken,
    longToken,
    shortToken,
  } as MarketInfo;

  return {
    ...info,
    poolValueMax: getPoolUsdWithoutPnl(info, true, 'maxPrice').add(
      getPoolUsdWithoutPnl(info, false, 'maxPrice')
    ),
    poolValueMin: getPoolUsdWithoutPnl(info, true, 'minPrice').add(
      getPoolUsdWithoutPnl(info, false, 'minPrice')
    ),
  };
}

export function computeMarketsInfo(
  markets: Record<string, Market>,
  states: Record<string, MarketState>,
  statuses: Record<string, MarketStatus>,
  tokens: TokensData
): MarketsInfo {
  let hasChanges = false;
  const nextInfos: MarketsInfo = {};
  const nextDepsByKey: Record<string, MarketDepsSnapshot> = {};

  for (const key in markets) {
    const market = markets[key];
    const state = getByKey(states, key);
    const status = getByKey(statuses, key);
    const indexAddr = market.indexTokenAddress?.toBase58();
    const longAddr = market.longTokenAddress?.toBase58();
    const shortAddr = market.shortTokenAddress?.toBase58();
    const indexToken = getByKey(tokens, indexAddr);
    const longToken = getByKey(tokens, longAddr);
    const shortToken = getByKey(tokens, shortAddr);

    if (!indexToken || !longToken || !shortToken || !state) {
      if (key in cachedMarketsInfo) {
        hasChanges = true;
      }
      continue;
    }

    const deps: MarketDepsSnapshot = {
      market,
      state,
      status,
      indexToken,
      longToken,
      shortToken,
    };
    const result = resolveMarketInfo(key, deps);

    nextInfos[key] = result.info;
    nextDepsByKey[key] = result.deps;

    if (!result.reused) {
      hasChanges = true;
    }
  }

  for (const key in cachedMarketsInfo) {
    if (!(key in nextInfos)) {
      hasChanges = true;
      break;
    }
  }

  if (!hasChanges) {
    return cachedMarketsInfo;
  }

  cachedMarketsInfo = nextInfos;
  cachedDepsByKey = nextDepsByKey;
  return nextInfos;
}

export function resetMarketsInfoCacheForTests(): void {
  cachedMarketsInfo = {};
  cachedDepsByKey = {};
}
