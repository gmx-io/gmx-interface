import { MarketsInfoResult, MarketsResult, useMarkets, useMarketsInfo } from "domain/synthetics/markets";
import { PositionsInfoResult, usePositionsInfo } from "domain/synthetics/positions";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { ReactNode, useMemo } from "react";
import { useSelectedTradeOption, SelectedTradeOption } from "domain/synthetics/trade/useSelectedTradeOption";
import { Context, createContext, useContext, useContextSelector } from "use-context-selector";
import { createSelector } from "lib/selectors";

export type SyntheticsState = {
  globals: {
    markets: MarketsResult;
    marketsInfo: MarketsInfoResult;
    positionsInfo: PositionsInfoResult;
    account: string | undefined;
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

  const state: SyntheticsState = useMemo(() => {
    return {
      globals: {
        markets,
        marketsInfo,
        positionsInfo,
        account,
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

function useSyntheticsStateSelector<Selected>(selector: (s: SyntheticsState) => Selected) {
  return useContextSelector(StateCtx as Context<SyntheticsState>, selector) as Selected;
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

const selectTradeType = (s: SyntheticsState) => s.trade.tradeType;
const selectTradeMode = (s: SyntheticsState) => s.trade.tradeMode;
const selectTradeFlags = (s: SyntheticsState) => s.trade.tradeFlags;
const selectIsWrapOrUnwrap = (s: SyntheticsState) => s.trade.isWrapOrUnwrap;
const selectFromTokenAddress = (s: SyntheticsState) => s.trade.fromTokenAddress;
const selectFromToken = (s: SyntheticsState) => s.trade.fromToken;
const selectToTokenAddress = (s: SyntheticsState) => s.trade.toTokenAddress;
const selectToToken = (s: SyntheticsState) => s.trade.toToken;
const selectMarketAddress = (s: SyntheticsState) => s.trade.marketAddress;
const selectMarketInfo = (s: SyntheticsState) => s.trade.marketInfo;
const selectCollateralAddress = (s: SyntheticsState) => s.trade.collateralAddress;
const selectCollateralToken = (s: SyntheticsState) => s.trade.collateralToken;
const selectAvailableTokensOptions = (s: SyntheticsState) => s.trade.availableTokensOptions;
const selectAvaialbleTradeModes = (s: SyntheticsState) => s.trade.avaialbleTradeModes;
const selectSetTradeType = (s: SyntheticsState) => s.trade.setTradeType;
const selectSetTradeMode = (s: SyntheticsState) => s.trade.setTradeMode;
const selectSetFromTokenAddress = (s: SyntheticsState) => s.trade.setFromTokenAddress;
const selectSetToTokenAddress = (s: SyntheticsState) => s.trade.setToTokenAddress;
const selectSetMarketAddress = (s: SyntheticsState) => s.trade.setMarketAddress;
const selectSetCollateralAddress = (s: SyntheticsState) => s.trade.setCollateralAddress;
const selectSetActivePosition = (s: SyntheticsState) => s.trade.setActivePosition;
const selectSwitchTokenAddresses = (s: SyntheticsState) => s.trade.switchTokenAddresses;
const selectAccount = (s: SyntheticsState) => s.globals.account;

export const useTradeType = () => useSyntheticsStateSelector(selectTradeType);
export const useTradeMode = () => useSyntheticsStateSelector(selectTradeMode);
export const useTradeFlags = () => useSyntheticsStateSelector(selectTradeFlags);
export const useIsWrapOrUnwrap = () => useSyntheticsStateSelector(selectIsWrapOrUnwrap);
export const useFromTokenAddress = () => useSyntheticsStateSelector(selectFromTokenAddress);
export const useFromToken = () => useSyntheticsStateSelector(selectFromToken);
export const useToTokenAddress = () => useSyntheticsStateSelector(selectToTokenAddress);
export const useToToken = () => useSyntheticsStateSelector(selectToToken);
export const useMarketAddress = () => useSyntheticsStateSelector(selectMarketAddress);
export const useMarketInfo = () => useSyntheticsStateSelector(selectMarketInfo);
export const useCollateralAddress = () => useSyntheticsStateSelector(selectCollateralAddress);
export const useCollateralToken = () => useSyntheticsStateSelector(selectCollateralToken);
export const useAvailableTokensOptions = () => useSyntheticsStateSelector(selectAvailableTokensOptions);
export const useAvaialbleTradeModes = () => useSyntheticsStateSelector(selectAvaialbleTradeModes);
export const useSetTradeType = () => useSyntheticsStateSelector(selectSetTradeType);
export const useSetTradeMode = () => useSyntheticsStateSelector(selectSetTradeMode);
export const useSetFromTokenAddress = () => useSyntheticsStateSelector(selectSetFromTokenAddress);
export const useSetToTokenAddress = () => useSyntheticsStateSelector(selectSetToTokenAddress);
export const useSetMarketAddress = () => useSyntheticsStateSelector(selectSetMarketAddress);
export const useSetCollateralAddress = () => useSyntheticsStateSelector(selectSetCollateralAddress);
export const useSetActivePosition = () => useSyntheticsStateSelector(selectSetActivePosition);
export const useSwitchTokenAddresses = () => useSyntheticsStateSelector(selectSwitchTokenAddresses);
// export const useAccount = () => useSyntheticsStateSelector(selectAccount);

const selectSelectedPositionKey = createSelector(
  [selectAccount, selectCollateralAddress, selectMarketAddress],
  (account, collateralAddress, marketAddress) => marketAddress
);
