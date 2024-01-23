import { MarketsInfoResult, MarketsResult, useMarkets, useMarketsInfo } from "domain/synthetics/markets";
import { PositionsInfoResult, usePositionsInfo } from "domain/synthetics/positions";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { ReactNode, useMemo } from "react";
import { useSelectedTradeOption, SelectedTradeOption } from "domain/synthetics/trade/useSelectedTradeOption";
import { Context, createContext, useContext, useContextSelector } from "use-context-selector";

export type SyntheticsStateContext = {
  globals: { markets: MarketsResult; marketsInfo: MarketsInfoResult; positionsInfo: PositionsInfoResult };
  page: {};
  trade: SelectedTradeOption;
};

const StateCtx = createContext<SyntheticsStateContext | null>(null);

export function useSettings() {
  return useContext(StateCtx) as SyntheticsStateContext;
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

  const {
    tradeType,
    tradeMode,
    tradeFlags,
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

  const state: SyntheticsStateContext = useMemo(() => {
    return {
      globals: {
        markets,
        marketsInfo,
        positionsInfo,
      },
      page: {},
      trade: {
        tradeType,
        tradeMode,
        tradeFlags,
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
    tradeFlags,
    tradeMode,
    tradeType,
  ]);

  return <StateCtx.Provider value={state}>{children}</StateCtx.Provider>;
}

function useSyntheticsStateSelector<Selected>(selector: (s: SyntheticsStateContext) => Selected) {
  return useContextSelector(StateCtx as Context<SyntheticsStateContext>, selector) as Selected;
}

/*
tradeType,
tradeMode,
tradeFlags,
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
*/

export function useTradeType() {
  return useSyntheticsStateSelector((s) => s.trade.tradeType);
}

export function useTradeMode() {
  return useSyntheticsStateSelector((s) => s.trade.tradeMode);
}
export function useTradeFlags() {
  return useSyntheticsStateSelector((s) => s.trade.tradeFlags);
}

export function useIsWrapOrUnwrap() {
  return useSyntheticsStateSelector((s) => s.trade.isWrapOrUnwrap);
}

export function useFromTokenAddress() {
  return useSyntheticsStateSelector((s) => s.trade.fromTokenAddress);
}

export function useFromToken() {
  return useSyntheticsStateSelector((s) => s.trade.fromToken);
}

export function useToTokenAddress() {
  return useSyntheticsStateSelector((s) => s.trade.toTokenAddress);
}

export function useToToken() {
  return useSyntheticsStateSelector((s) => s.trade.toToken);
}

export function useMarketAddress() {
  return useSyntheticsStateSelector((s) => s.trade.marketAddress);
}

export function useMarketInfo() {
  return useSyntheticsStateSelector((s) => s.trade.marketInfo);
}

export function useCollateralAddress() {
  return useSyntheticsStateSelector((s) => s.trade.collateralAddress);
}

export function useCollateralToken() {
  return useSyntheticsStateSelector((s) => s.trade.collateralToken);
}

export function useAvailableTokensOptions() {
  return useSyntheticsStateSelector((s) => s.trade.availableTokensOptions);
}

export function useAvailableTradeModes() {
  return useSyntheticsStateSelector((s) => s.trade.avaialbleTradeModes);
}

export function useSetTradeType() {
  return useSyntheticsStateSelector((s) => s.trade.setTradeType);
}

export function useSetTradeMode() {
  return useSyntheticsStateSelector((s) => s.trade.setTradeMode);
}

export function useSetFromTokenAddress() {
  return useSyntheticsStateSelector((s) => s.trade.setFromTokenAddress);
}

export function useSetToTokenAddress() {
  return useSyntheticsStateSelector((s) => s.trade.setToTokenAddress);
}

export function useSetMarketAddress() {
  return useSyntheticsStateSelector((s) => s.trade.setMarketAddress);
}

export function useSetCollateralAddress() {
  return useSyntheticsStateSelector((s) => s.trade.setCollateralAddress);
}

export function useSetActivePosition() {
  return useSyntheticsStateSelector((s) => s.trade.setActivePosition);
}

export function useSwitchTokenAddresses() {
  return useSyntheticsStateSelector((s) => s.trade.switchTokenAddresses);
}
