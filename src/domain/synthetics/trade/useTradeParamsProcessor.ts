import isMatch from "lodash/isMatch";
import { useEffect } from "react";
import { useHistory, useParams } from "react-router-dom";
import { useLatest } from "react-use";

import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, BOTANIX, ContractsChainId } from "config/chains";
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
import { TradeMode, TradeSearchParams, TradeType } from "sdk/types/trade";

import { getMarketPoolName } from "../markets";

type TradeOptions = {
  fromTokenAddress?: string;
  toTokenAddress?: string;
  marketAddress?: string;
  tradeType?: TradeType;
  tradeMode?: TradeMode;
  collateralAddress?: string;
};

const validChainIds: Record<ContractsChainId, true> = {
  [ARBITRUM]: true,
  [AVALANCHE]: true,
  [AVALANCHE_FUJI]: true,
  [BOTANIX]: true,
  [ARBITRUM_SEPOLIA]: true,
};

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

  useEffect(() => {
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

    if (chainIdFromParams && validChainIds[chainIdFromParams]) {
      switchNetwork(Number(chainIdFromParams), true);
    }

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
          const query = new URLSearchParams(history.location.search);
          query.delete("mode");
          query.delete("from");
          query.delete("to");
          query.delete("market");
          query.delete("pool");
          query.delete("collateral");
          query.delete("chainId");
          history.replace({ search: query.toString() });
        }
      }, 2000);
    }

    if (!isMatch(latestTradeOptions.current, tradeOptions)) {
      setTradeConfig(tradeOptions);
    }

    if (history.location.search && !toToken && !pool) {
      setTimeout(() => {
        if (history.location.search) {
          const query = new URLSearchParams(history.location.search);
          query.delete("mode");
          query.delete("from");
          query.delete("to");
          query.delete("market");
          query.delete("pool");
          query.delete("collateral");
          query.delete("chainId");
          history.replace({ search: query.toString() });
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
    latestTradeOptions,
  ]);
}
