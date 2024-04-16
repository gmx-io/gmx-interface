import { getTokenBySymbolSafe, isTokenInList } from "config/tokens";
import {
  selectTradeboxAvailableTokensOptions,
  selectTradeboxSetTradeConfig,
  selectTradeboxTradeMode,
  selectTradeboxTradeType,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { getMatchingValueFromObject } from "lib/objects";
import useSearchParams from "lib/useSearchParams";
import { isMatch } from "lodash";
import { useEffect, useRef } from "react";
import { useHistory, useParams } from "react-router-dom";
import { getMarketPoolName } from "../markets";
import { TradeMode, TradeSearchParams, TradeType } from "./types";

type TradeOptions = {
  fromTokenAddress?: string;
  toTokenAddress?: string;
  marketAddress?: string;
  tradeType?: TradeType;
  tradeMode?: TradeMode;
  collateralAddress?: string;
};

export function useTradeParamsProcessor() {
  const setTradeConfig = useSelector(selectTradeboxSetTradeConfig);
  const availableTokensOptions = useSelector(selectTradeboxAvailableTokensOptions);
  const markets = availableTokensOptions.sortedAllMarkets;
  const tradeMode = useSelector(selectTradeboxTradeMode);
  const tradeType = useSelector(selectTradeboxTradeType);

  const { chainId } = useChainId();
  const history = useHistory();
  const params = useParams<{ tradeType?: string }>();
  const searchParams = useSearchParams<TradeSearchParams>();
  const { indexTokens, swapTokens } = availableTokensOptions;

  const prevTradeOptions = useRef<TradeOptions>({
    fromTokenAddress: undefined,
    toTokenAddress: undefined,
    marketAddress: undefined,
    tradeType: tradeType,
    tradeMode: tradeMode,
    collateralAddress: undefined,
  });

  useEffect(() => {
    const { tradeType } = params;
    const { mode: tradeMode, from: fromToken, to, market, pool, collateral: collateralToken } = searchParams;
    const toToken = to ?? market;

    const tradeOptions: TradeOptions = {};

    if (tradeType) {
      const validTradeType = getMatchingValueFromObject(TradeType, tradeType);
      if (validTradeType) {
        tradeOptions.tradeType = validTradeType as TradeType;
      }
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
        isSynthetic: tradeOptions.tradeType !== TradeType.Swap,
        version: "v2",
      });

      if (toTokenInfo) {
        const isSwapTrade = tradeOptions.tradeType === TradeType.Swap;
        const isLongOrShortTrade =
          tradeOptions.tradeType === TradeType.Long || tradeOptions.tradeType === TradeType.Short;
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
      setTimeout(() => {
        if (history.location.search) {
          history.replace({ search: "" });
        }
      }, 2000);
    }

    if (!isMatch(prevTradeOptions.current, tradeOptions)) {
      prevTradeOptions.current = tradeOptions;
      setTradeConfig(tradeOptions);
    }

    if (history.location.search && !toToken && !pool) {
      setTimeout(() => {
        if (history.location.search) {
          history.replace({ search: "" });
          prevTradeOptions.current = {};
        }
      }, 2000);
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
  ]);
}
