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

export function getSearchWithoutTradeLinkParams(search: string): string | undefined {
  const query = new URLSearchParams(search);
  const currentSearch = query.toString();

  TRADE_LINK_SEARCH_PARAMS.forEach((param) => query.delete(param));

  const nextSearch = query.toString();

  return nextSearch === currentSearch ? undefined : nextSearch;
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
  useEffect(() => {
    if (changingNetwork.current) {
      return;
    }
    changingNetwork.current = true;

    function dropTradeLinkParamsFromUrl() {
      const nextSearch = getSearchWithoutTradeLinkParams(history.location.search);

      if (nextSearch !== undefined) {
        history.replace({ search: nextSearch });
      }
    }

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
        dropTradeLinkParamsFromUrl();
        return;
      }

      if (chainIdFromParams) {
        await switchNetwork(Number(chainIdFromParams), true);
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
        setTimeout(dropTradeLinkParamsFromUrl, 2000);
      }

      if (!isMatch(latestTradeOptions.current, tradeOptions)) {
        setTradeConfig(tradeOptions);
      }

      if (history.location.search && !toToken && !pool) {
        setTimeout(dropTradeLinkParamsFromUrl, 2000);
      }
    }

    changeNetwork().then(() => {
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
