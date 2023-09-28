import { useEffect, useRef } from "react";
import { useHistory, useParams } from "react-router-dom";
import { MarketInfo, getMarketPoolName } from "../markets";
import { getTokenBySymbolSafe } from "config/tokens";
import { useChainId } from "lib/chains";
import { getMatchingValueFromObject } from "lib/objects";
import { TradeSearchParams, TradeMode, TradeType } from "./types";
import useSearchParams from "lib/useSearchParams";
import { isMatch } from "lodash";

type TradeOptions = {
  fromTokenAddress?: string;
  toTokenAddress?: string;
  marketAddress?: string;
  tradeType?: TradeType;
  tradeMode?: TradeMode;
  collateralAddress?: string;
};

export function useTradeParamsProcessor(
  markets: MarketInfo[],
  setTradeConfig: ({
    tradeType,
    tradeMode,
    fromTokenAddress,
    toTokenAddress,
    marketAddress,
    collateralAddress,
  }: TradeOptions) => void
) {
  const { chainId } = useChainId();
  const history = useHistory();
  const params = useParams<{ tradeType?: string }>();
  const searchParams = useSearchParams<TradeSearchParams>();

  const prevTradeOptions = useRef<TradeOptions>({
    fromTokenAddress: undefined,
    toTokenAddress: undefined,
    marketAddress: undefined,
    tradeType: undefined,
    tradeMode: undefined,
    collateralAddress: undefined,
  });

  useEffect(() => {
    const { tradeType } = params;
    const { mode: tradeMode, from: fromToken, to: toToken, pool, collateral: collateralToken } = searchParams;

    const tradeOptions: TradeOptions = {};

    if (tradeType) {
      const validTradeType = getMatchingValueFromObject(TradeType, tradeType);
      if (validTradeType) {
        tradeOptions.tradeType = validTradeType as TradeType;
      }
    }

    if (tradeMode) {
      const validTradeMode = getMatchingValueFromObject(TradeMode, tradeMode);
      if (validTradeMode) {
        tradeOptions.tradeMode = validTradeMode as TradeMode;
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
        tradeOptions.toTokenAddress = toTokenInfo?.address;
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
        }
      }, 2000);
    }
  }, [params, searchParams, markets, chainId, history, setTradeConfig]);
}
