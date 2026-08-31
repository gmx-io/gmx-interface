import isMatch from "lodash/isMatch";
import { useEffect, useRef } from "react";
import { useHistory, useParams } from "react-router-dom";
import { useLatest } from "react-use";

import { isContractsChain } from "config/chains";
import { isDevelopment } from "config/env";
import { isSourceChain } from "config/multichain";
import {
  selectTradeboxAvailableTokensOptions,
  selectTradeboxCollateralTokenAddress,
  selectTradeboxFromTokenAddress,
  selectTradeboxMarketAddress,
  selectTradeboxSetTradeConfig,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeMode,
  selectTradeboxTradeType,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { getMatchingValueFromObject } from "lib/objects";
import useSearchParams from "lib/useSearchParams";
import { switchNetwork } from "lib/wallets";
import { getTokenBySymbolSafe, isTokenInList } from "sdk/configs/tokens";
import { TradeMode, TradeSearchParams, TradeType } from "sdk/utils/trade/types";

import { getMarketPoolName } from "../markets";

type TradeOptions = {
  fromTokenAddress?: string;
  toTokenAddress?: string;
  marketAddress?: string;
  tradeType?: TradeType;
  tradeMode?: TradeMode;
  collateralAddress?: string;
};

export function isSupportedTradeLinkChainId(chainIdFromParams: string, activeChainId: number) {
  const requestedChainId = Number(chainIdFromParams);

  return (
    Number.isSafeInteger(requestedChainId) &&
    (isContractsChain(requestedChainId, isDevelopment()) || isSourceChain(requestedChainId, activeChainId))
  );
}

const TRADE_LINK_SEARCH_PARAMS = ["mode", "from", "to", "market", "pool", "collateral", "chainId"];

// Returns the search without the consumed trade params, or `undefined` when nothing would change:
// replacing the url with an identical search re-runs the effect and loops into WebKit's replaceState rate limit.
export function getCleanedTradeSearch(search: string): string | undefined {
  const original = new URLSearchParams(search);
  const cleaned = new URLSearchParams(search);

  for (const param of TRADE_LINK_SEARCH_PARAMS) {
    cleaned.delete(param);
  }

  if (cleaned.toString() === original.toString()) {
    return undefined;
  }

  return cleaned.toString();
}

// A link without a trade type in the path is resolved against the one the tradebox is already on.
export function getTradeLinkTradeType(
  tradeTypeFromPath: string | undefined,
  currentTradeType: TradeType | undefined
): TradeType | undefined {
  if (tradeTypeFromPath) {
    const validTradeType = getMatchingValueFromObject(TradeType, tradeTypeFromPath);

    if (validTradeType) {
      return validTradeType as TradeType;
    }
  }

  return currentTradeType;
}

export function useTradeParamsProcessor() {
  const setTradeConfig = useSelector(selectTradeboxSetTradeConfig);
  const availableTokensOptions = useSelector(selectTradeboxAvailableTokensOptions);
  const markets = availableTokensOptions.sortedAllMarkets;
  const { chainId } = useChainId();
  const history = useHistory();
  const params = useParams<{ tradeType?: string }>();
  const searchParams = useSearchParams<TradeSearchParams>();
  const { indexTokens, swapTokens } = availableTokensOptions;

  const latestTradeOptions = useLatest({
    fromTokenAddress: useSelector(selectTradeboxFromTokenAddress),
    toTokenAddress: useSelector(selectTradeboxToTokenAddress),
    marketAddress: useSelector(selectTradeboxMarketAddress),
    tradeType: useSelector(selectTradeboxTradeType),
    tradeMode: useSelector(selectTradeboxTradeMode),
    collateralAddress: useSelector(selectTradeboxCollateralTokenAddress),
  });

  const changingNetwork = useRef(false);
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(
    () => () => {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = undefined;
    },
    []
  );

  useEffect(() => {
    if (changingNetwork.current) {
      return;
    }
    changingNetwork.current = true;

    // One pending timer only: rescheduling on every effect pass would keep pushing the cleanup out.
    const scheduleSearchCleanup = () => {
      if (cleanupTimerRef.current !== undefined || getCleanedTradeSearch(history.location.search) === undefined) {
        return;
      }

      cleanupTimerRef.current = setTimeout(() => {
        cleanupTimerRef.current = undefined;
        const cleanedSearch = getCleanedTradeSearch(history.location.search);
        if (cleanedSearch !== undefined) {
          history.replace({ search: cleanedSearch });
        }
      }, 2000);
    };

    async function changeNetwork() {
      const { tradeType } = params;
      const {
        mode: tradeMode,
        from: fromToken,
        to,
        market,
        pool,
        collateral: collateralToken,
        chainId: chainIdFromParams,
      } = searchParams;

      if (chainIdFromParams && !isSupportedTradeLinkChainId(chainIdFromParams, chainId)) {
        const cleanedSearch = getCleanedTradeSearch(history.location.search);
        if (cleanedSearch !== undefined) {
          history.replace({ search: cleanedSearch });
        }
        return;
      }

      if (chainIdFromParams) {
        await switchNetwork(Number(chainIdFromParams), true);
      }

      const toToken = to ?? market;

      const linkTradeType = getTradeLinkTradeType(tradeType, latestTradeOptions.current.tradeType);

      const tradeOptions: TradeOptions = {};

      if (linkTradeType) {
        tradeOptions.tradeType = linkTradeType;
      }

      if (tradeMode) {
        if (tradeMode.toLowerCase() === "tpsl") {
          tradeOptions.tradeMode = TradeMode.Trigger;
        } else {
          const validTradeMode = getMatchingValueFromObject(TradeMode, tradeMode);
          if (validTradeMode) {
            tradeOptions.tradeMode = validTradeMode as TradeMode;
          }
        }
      }

      if (fromToken) {
        const fromTokenInfo = getTokenBySymbolSafe(chainId, fromToken, {
          version: "v2",
        });
        if (fromTokenInfo) {
          tradeOptions.fromTokenAddress = fromTokenInfo?.address;
        }
      }

      if (collateralToken) {
        const collateralTokenInfo = getTokenBySymbolSafe(chainId, collateralToken, {
          version: "v2",
        });
        if (collateralTokenInfo) {
          tradeOptions.collateralAddress = collateralTokenInfo?.address;
        }
      }

      if (toToken && markets.length > 0) {
        const toTokenInfo = getTokenBySymbolSafe(chainId, toToken, {
          version: "v2",
        });

        if (toTokenInfo) {
          const isSwapTrade = linkTradeType === TradeType.Swap;
          const isLongOrShortTrade = linkTradeType === TradeType.Long || linkTradeType === TradeType.Short;
          const isTokenInSwapList = isSwapTrade && isTokenInList(toTokenInfo, swapTokens);
          const isTokenInIndexList = isLongOrShortTrade && isTokenInList(toTokenInfo, indexTokens);

          if (isTokenInSwapList || isTokenInIndexList) {
            tradeOptions.toTokenAddress = toTokenInfo.address;
          }
        }

        if (pool) {
          const marketPool = markets.find((market) => {
            const poolName = getMarketPoolName(market);
            const isSameMarket = market.indexTokenAddress === tradeOptions.toTokenAddress;
            return isSameMarket && poolName.toLowerCase() === pool.toLowerCase();
          });
          if (marketPool) {
            tradeOptions.marketAddress = marketPool?.marketTokenAddress;
          }
        }
        scheduleSearchCleanup();
      }

      if (!isMatch(latestTradeOptions.current, tradeOptions)) {
        setTradeConfig(tradeOptions);
      }

      if (history.location.search && !toToken) {
        scheduleSearchCleanup();
      }
    }

    changeNetwork()
      // A declined network switch must not latch the guard.
      .catch(() => undefined)
      .then(() => {
        changingNetwork.current = false;
      });
  }, [
    params,
    searchParams,
    markets,
    chainId,
    history,
    setTradeConfig,
    swapTokens,
    indexTokens,
    availableTokensOptions,
    latestTradeOptions,
  ]);
}
