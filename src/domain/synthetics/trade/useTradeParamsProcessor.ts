import isMatch from "lodash/isMatch";
import { useEffect, useRef } from "react";
import { useHistory, useParams } from "react-router-dom";
import { useLatest } from "react-use";

import {
  selectTradeboxAvailableTokensOptions,
  selectTradeboxCollateralTokenAddress,
  selectTradeboxFormState,
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

const TRADE_LINK_SEARCH_PARAMS = ["mode", "from", "to", "market", "pool", "collateral", "amount"];

const AMOUNT_PARAM_REGEX = /^\d+(\.\d+)?$/;

type PendingSwapAmount = { amount: string; fromTokenAddress: string };

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
  const searchParams = useSearchParams<TradeSearchParams & { amount?: string }>();
  const { indexTokens, swapTokens } = availableTokensOptions;
  const { setFromTokenInputValue, setFocusedInput } = useSelector(selectTradeboxFormState);
  const currentTradeType = useSelector(selectTradeboxTradeType);
  const currentFromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const pendingSwapAmountRef = useRef<PendingSwapAmount>();
  const armedAmountSearchRef = useRef<string>();

  const latestTradeOptions = useLatest({
    fromTokenAddress: useSelector(selectTradeboxFromTokenAddress),
    toTokenAddress: useSelector(selectTradeboxToTokenAddress),
    marketAddress: useSelector(selectTradeboxMarketAddress),
    tradeType: useSelector(selectTradeboxTradeType),
    tradeMode: useSelector(selectTradeboxTradeMode),
    collateralAddress: useSelector(selectTradeboxCollateralTokenAddress),
  });

  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(
    () => () => {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = undefined;
    },
    []
  );

  useEffect(() => {
    if (searchParams.chainId) {
      return;
    }

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

    const { tradeType } = params;
    const { mode: tradeMode, from: fromToken, to, market, pool, collateral: collateralToken, amount } = searchParams;

    const toToken = to ?? market;

    if (!amount) {
      armedAmountSearchRef.current = undefined;
    }

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

    // the effect reruns on data refreshes while the link is still in the url: arm each link once
    if (
      amount &&
      AMOUNT_PARAM_REGEX.test(amount) &&
      linkTradeType === TradeType.Swap &&
      tradeOptions.fromTokenAddress !== undefined &&
      armedAmountSearchRef.current !== history.location.search
    ) {
      armedAmountSearchRef.current = history.location.search;
      pendingSwapAmountRef.current = { amount, fromTokenAddress: tradeOptions.fromTokenAddress };
    }

    if (!isMatch(latestTradeOptions.current, tradeOptions)) {
      setTradeConfig(tradeOptions);
    }

    if (history.location.search && !toToken) {
      scheduleSearchCleanup();
    }
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

  useEffect(
    // the tradebox clears the pay input when it switches to Swap, so the amount waits for the switch
    function applyPendingSwapAmount() {
      const pending = pendingSwapAmountRef.current;

      if (!pending || currentTradeType !== TradeType.Swap || currentFromTokenAddress !== pending.fromTokenAddress) {
        return;
      }

      pendingSwapAmountRef.current = undefined;
      setFocusedInput("from");
      setFromTokenInputValue(pending.amount);
    },
    [currentFromTokenAddress, currentTradeType, searchParams, setFocusedInput, setFromTokenInputValue]
  );
}
