import { useEffect } from "react";
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

function updateOption(options: TradeOptions, key: keyof TradeOptions, value: string | undefined): TradeOptions {
  return {
    ...options,
    [key]: value ? value : "invalid",
  };
}

export function useParameterProcessor(
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

  useEffect(() => {
    const { market, tradeType, tradeMode } = params;
    const queryPayToken = searchParams.get("pay");
    const queryPoolName = searchParams.get("pool");
    const queryCollateralToken = searchParams.get("collateral");
    let options: TradeOptions = {
      fromTokenAddress: undefined,
      toTokenAddress: undefined,
      marketAddress: undefined,
      tradeType: undefined,
      tradeMode: undefined,
      collateralAddress: undefined,
    };

    const processParameters = () => {
      if (market) {
        const marketTokenInfo = getValidTokenBySymbol(chainId, market, "v2");
        if (marketTokenInfo) {
          options = updateOption(options, "toTokenAddress", marketTokenInfo.address);
        }
      }

      if (params.tradeType) {
        const validTradeType = getMatchingValueFromObject(TradeType, tradeType);
        options = updateOption(options, "tradeType", validTradeType);
      }

      if (tradeMode) {
        const validTradeMode = getMatchingValueFromObject(TradeMode, tradeMode);
        options = updateOption(options, "tradeMode", validTradeMode);
      }

      if (queryPayToken) {
        const payTokenInfo = getValidTokenBySymbol(chainId, queryPayToken, "v2");
        options = updateOption(options, "fromTokenAddress", payTokenInfo?.address);
      }

      if (queryPoolName && allMarkets.length > 0) {
        const marketPool = allMarkets.find((market) => {
          const poolName = getMarketPoolName(market);
          return poolName.toLowerCase() === queryPoolName.toLowerCase();
        });
        options = updateOption(options, "marketAddress", marketPool?.marketTokenAddress);
      }

      if (queryCollateralToken) {
        const collateralTokenInfo = getValidTokenBySymbol(chainId, queryCollateralToken, "v2");
        options = updateOption(options, "collateralAddress", collateralTokenInfo?.address);
      }

      if (Object.keys(options).length > 0) {
        setTradeOptions(options);
      }

      const isTruthy = validateAllTruthy(options);

      if (isTruthy) {
        history.replace({ search: "", pathname: "/v2" });
      }
    };

    processParameters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, searchParams, allMarkets, history, chainId]);
}

export function validateAllTruthy(object: { [key: string]: string | undefined }): boolean {
  const areAllTruthy = Object.values(object).every((value) => Boolean(value));

  return areAllTruthy;
}
