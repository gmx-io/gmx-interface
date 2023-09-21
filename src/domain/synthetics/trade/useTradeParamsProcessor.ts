import { useEffect, useMemo } from "react";
import { useHistory, useParams } from "react-router-dom";
import { MarketInfo, getMarketPoolName } from "../markets";
import useRouteQuery from "lib/useRouteQuery";
import { getValidTokenBySymbol } from "config/tokens";
import { useChainId } from "lib/chains";
import { getMatchingValueFromObject } from "lib/objects";
import { TradeMode, TradeType } from "./types";

type RouteParams = {
  market?: string;
  tradeType?: string;
  tradeMode?: string;
  pay?: string;
  pool?: string;
  collateral?: string;
};

type TradeOptions = {
  fromTokenAddress?: string;
  toTokenAddress?: string;
  marketAddress?: string;
  tradeType?: TradeType;
  tradeMode?: TradeMode;
  collateralAddress?: string;
};

const initialOptions: TradeOptions = {
  fromTokenAddress: undefined,
  toTokenAddress: undefined,
  marketAddress: undefined,
  tradeType: undefined,
  tradeMode: undefined,
  collateralAddress: undefined,
};

export function useTradeParamsProcessor(
  allMarkets: MarketInfo[],
  setTradeOptions: ({
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
  const params = useParams<RouteParams>();
  const searchParams = useRouteQuery();

  const options = useMemo(() => {
    const { market, tradeType, tradeMode } = params;
    const queryPayToken = searchParams.get("pay");
    const queryPoolName = searchParams.get("pool");
    const queryCollateralToken = searchParams.get("collateral");
    const options = initialOptions;

    if (params.tradeType) {
      const validTradeType = getMatchingValueFromObject(TradeType, tradeType);
      if (validTradeType) {
        options.tradeType = validTradeType as TradeType;
      }
    }

    if (tradeMode) {
      const validTradeMode = getMatchingValueFromObject(TradeMode, tradeMode);
      if (validTradeMode) {
        options.tradeMode = validTradeMode as TradeMode;
      }
    }

    if (queryPayToken) {
      const payTokenInfo = getValidTokenBySymbol(chainId, queryPayToken, "v2");
      if (payTokenInfo) {
        options.fromTokenAddress = payTokenInfo?.address;
      }
    }

    if (queryCollateralToken) {
      const collateralTokenInfo = getValidTokenBySymbol(chainId, queryCollateralToken, "v2");
      if (collateralTokenInfo) {
        options.collateralAddress = collateralTokenInfo?.address;
      }
    }

    if (market && allMarkets.length > 0) {
      const marketTokenInfo = getValidTokenBySymbol(chainId, market, "v2");
      if (marketTokenInfo) {
        options.toTokenAddress = marketTokenInfo?.address;
      }
      if (queryPoolName) {
        const marketPool = allMarkets.find((market) => {
          const poolName = getMarketPoolName(market);
          const isSameMarket = market.indexTokenAddress === options.toTokenAddress;
          return isSameMarket && poolName.toLowerCase() === queryPoolName.toLowerCase();
        });
        if (marketPool) {
          options.marketAddress = marketPool?.marketTokenAddress;
        }
      }

      if (history.location.pathname !== "/v2") {
        history.replace({ search: "", pathname: "/v2" });
      }
    }

    if (Object.values(options).filter(Boolean).length > 0) {
      return options;
    }
  }, [params, searchParams, allMarkets, history, chainId]);

  useEffect(() => {
    if (options) {
      setTradeOptions(options);
    }
  }, [options, setTradeOptions]);
}
