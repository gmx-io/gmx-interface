import { MarketsInfoResult, MarketsResult, useMarkets, useMarketsInfo } from "domain/synthetics/markets";
import { AggregatedOrdersDataResult, useOrdersInfo } from "domain/synthetics/orders/useOrdersInfo";
import { PositionsInfoResult, usePositionsInfo } from "domain/synthetics/positions";
import { SelectedTradeOption, useSelectedTradeOption } from "domain/synthetics/trade/useSelectedTradeOption";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { ReactNode, useMemo } from "react";
import { Context, createContext, useContext, useContextSelector } from "use-context-selector";

export type SyntheticsState = {
  globals: {
    // FIXME remove undefineds in typse
    markets: MarketsResult;
    marketsInfo: MarketsInfoResult;
    positionsInfo: PositionsInfoResult;
    account: string | undefined;
    ordersInfo: AggregatedOrdersDataResult;
  };
  page: {};
  trade: SelectedTradeOption;
};

const StateCtx = createContext<SyntheticsState | null>(null);

export function useSettings() {
  return useContext(StateCtx) as SyntheticsState;
}

export function SyntheticsStateContextProvider({ children }: { children: ReactNode }) {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const markets = useMarkets(chainId);
  const marketsInfo = useMarketsInfo(chainId);
  const positionsInfo = usePositionsInfo(chainId, {
    account,
    // FIXME
    showPnlInLeverage: false,
    marketsInfoData: marketsInfo.marketsInfoData,
    pricesUpdatedAt: marketsInfo.pricesUpdatedAt,
    // FIXME
    skipLocalReferralCode: true,
    tokensData: marketsInfo.tokensData,
  });
  const ordersInfo = useOrdersInfo(chainId, {
    account,
    marketsInfoData: marketsInfo.marketsInfoData,
    positionsInfoData: positionsInfo.positionsInfoData,
    tokensData: marketsInfo.tokensData,
  });

  const {
    tradeType,
    tradeMode,
    isWrapOrUnwrap,
    fromTokenAddress,
    fromToken,
    toTokenAddress,
    toToken,
    marketAddress,
    marketInfo,
    collateralAddress,
    collateralToken,
    availableTokensOptions,
    avaialbleTradeModes,
    setTradeType,
    setTradeMode,
    setFromTokenAddress,
    setToTokenAddress,
    setMarketAddress,
    setCollateralAddress,
    setActivePosition,
    switchTokenAddresses,
  } = useSelectedTradeOption(chainId, {
    marketsInfoData: marketsInfo.marketsInfoData,
    tokensData: marketsInfo.tokensData,
  });

  const state: SyntheticsState = useMemo(() => {
    return {
      globals: {
        markets,
        marketsInfo,
        positionsInfo,
        account,
        ordersInfo,
      },
      page: {},
      trade: {
        tradeType,
        tradeMode,
        isWrapOrUnwrap,
        fromTokenAddress,
        fromToken,
        toTokenAddress,
        toToken,
        marketAddress,
        marketInfo,
        collateralAddress,
        collateralToken,
        availableTokensOptions,
        avaialbleTradeModes,
        setTradeType,
        setTradeMode,
        setFromTokenAddress,
        setToTokenAddress,
        setMarketAddress,
        setCollateralAddress,
        setActivePosition,
        switchTokenAddresses,
      },
    };
  }, [
    account,
    avaialbleTradeModes,
    availableTokensOptions,
    collateralAddress,
    collateralToken,
    fromToken,
    fromTokenAddress,
    isWrapOrUnwrap,
    marketAddress,
    marketInfo,
    markets,
    marketsInfo,
    ordersInfo,
    positionsInfo,
    setActivePosition,
    setCollateralAddress,
    setFromTokenAddress,
    setMarketAddress,
    setToTokenAddress,
    setTradeMode,
    setTradeType,
    switchTokenAddresses,
    toToken,
    toTokenAddress,
    tradeMode,
    tradeType,
  ]);

  return <StateCtx.Provider value={state}>{children}</StateCtx.Provider>;
}

export function useSyntheticsStateSelector<Selected>(selector: (s: SyntheticsState) => Selected) {
  return useContextSelector(StateCtx as Context<SyntheticsState>, selector) as Selected;
}
