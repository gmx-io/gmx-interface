import { SettingsContextType, useSettings } from "context/SettingsContext/SettingsContextProvider";
import { UserReferralInfo, useUserReferralInfo } from "domain/referrals";
import useUiFeeFactor from "domain/synthetics/fees/utils/useUiFeeFactor";
import { MarketsInfoResult, MarketsResult, useMarkets, useMarketsInfoRequest } from "domain/synthetics/markets";
import { AggregatedOrdersDataResult, useOrdersInfo } from "domain/synthetics/orders/useOrdersInfo";
import {
  PositionsConstantsResult,
  PositionsInfoResult,
  usePositionsConstants,
  usePositionsInfo,
} from "domain/synthetics/positions";
import { TradeState, useTradeState } from "domain/synthetics/trade/useSelectedTradeOption";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { ReactNode, useMemo } from "react";
import { Context, createContext, useContextSelector } from "use-context-selector";

export type SyntheticsState = {
  globals: {
    chainId: number;
    // FIXME remove undefineds in types
    markets: MarketsResult;
    marketsInfo: MarketsInfoResult;
    positionsInfo: PositionsInfoResult;
    account: string | undefined;
    ordersInfo: AggregatedOrdersDataResult;
    positionsConstants: PositionsConstantsResult;
    uiFeeFactor: BigNumber;
    userReferralInfo: UserReferralInfo | undefined;

    savedIsPnlInLeverage: boolean;
    savedShowPnlAfterFees: boolean;
  };
  settings: SettingsContextType;
  trade: TradeState;
};

const StateCtx = createContext<SyntheticsState | null>(null);

// export function useSyntheticsState() {
//   return useContext(StateCtx) as SyntheticsState;
// }

export function SyntheticsStateContextProvider({
  children,
  savedIsPnlInLeverage,
  savedShowPnlAfterFees,
}: {
  children: ReactNode;
  savedIsPnlInLeverage: boolean;
  savedShowPnlAfterFees: boolean;
}) {
  const { chainId } = useChainId();
  const { account, signer } = useWallet();
  const markets = useMarkets(chainId);
  const marketsInfo = useMarketsInfoRequest(chainId);
  const positionsConstants = usePositionsConstants(chainId);
  const uiFeeFactor = useUiFeeFactor(chainId);
  const userReferralInfo = useUserReferralInfo(signer, chainId, account);

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
  const settings = useSettings();

  const tradeState = useTradeState(chainId, {
    marketsInfoData: marketsInfo.marketsInfoData,
    tokensData: marketsInfo.tokensData,
  });

  const state: SyntheticsState = useMemo(() => {
    return {
      globals: {
        chainId,
        account,
        markets,
        marketsInfo,
        ordersInfo,
        positionsConstants,
        positionsInfo,
        uiFeeFactor,
        userReferralInfo,

        savedIsPnlInLeverage,
        savedShowPnlAfterFees,
      },
      settings,
      trade: tradeState,
    };
  }, [
    chainId,
    account,
    markets,
    marketsInfo,
    ordersInfo,
    positionsConstants,
    positionsInfo,
    uiFeeFactor,
    userReferralInfo,
    savedIsPnlInLeverage,
    savedShowPnlAfterFees,
    settings,
    tradeState,
  ]);

  return <StateCtx.Provider value={state}>{children}</StateCtx.Provider>;
}

export function useSyntheticsStateSelector<Selected>(selector: (s: SyntheticsState) => Selected) {
  return useContextSelector(StateCtx as Context<SyntheticsState>, selector) as Selected;
}
