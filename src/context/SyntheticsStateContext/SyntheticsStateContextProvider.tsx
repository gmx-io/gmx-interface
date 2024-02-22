import { SettingsContextType, useSettings } from "context/SettingsContext/SettingsContextProvider";
import { UserReferralInfo, useUserReferralInfoRequest } from "domain/referrals";
import useUiFeeFactor from "domain/synthetics/fees/utils/useUiFeeFactor";
import { MarketsInfoResult, MarketsResult, useMarkets, useMarketsInfoRequest } from "domain/synthetics/markets";
import { AggregatedOrdersDataResult, useOrdersInfoRequest } from "domain/synthetics/orders/useOrdersInfo";
import {
  PositionsConstantsResult,
  PositionsInfoResult,
  usePositionsConstantsRequest,
  usePositionsInfoRequest,
} from "domain/synthetics/positions";
import { TradeState, useTradeState } from "domain/synthetics/trade/useTradeState";
import { BigNumber, ethers } from "ethers";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { ReactNode, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Context, createContext, useContext, useContextSelector } from "use-context-selector";

export type SyntheticsTradeState = {
  pageType: "actions" | "trade" | "pools";
  globals: {
    chainId: number;
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
  tradebox: TradeState;
};

const StateCtx = createContext<SyntheticsTradeState | null>(null);

export function SyntheticsStateContextProvider({
  children,
  savedIsPnlInLeverage,
  savedShowPnlAfterFees,
  skipLocalReferralCode,
  pageType,
}: {
  children: ReactNode;
  savedIsPnlInLeverage: boolean;
  savedShowPnlAfterFees: boolean;
  skipLocalReferralCode: boolean;
  pageType: "actions" | "trade" | "pools";
}) {
  const { chainId } = useChainId();
  const { account: walletAccount, signer } = useWallet();
  const { account: paramsAccount } = useParams<{ account?: string }>();

  let checkSummedAccount: string | undefined;

  if (paramsAccount && ethers.utils.isAddress(paramsAccount)) {
    checkSummedAccount = ethers.utils.getAddress(paramsAccount);
  }

  const account = pageType === "actions" ? checkSummedAccount : walletAccount;
  const markets = useMarkets(chainId);
  const marketsInfo = useMarketsInfoRequest(chainId);
  const positionsConstants = usePositionsConstantsRequest(chainId);
  const uiFeeFactor = useUiFeeFactor(chainId);
  const userReferralInfo = useUserReferralInfoRequest(signer, chainId, account, skipLocalReferralCode);

  const positionsInfo = usePositionsInfoRequest(chainId, {
    account,
    showPnlInLeverage: savedIsPnlInLeverage,
    marketsInfoData: marketsInfo.marketsInfoData,
    pricesUpdatedAt: marketsInfo.pricesUpdatedAt,
    skipLocalReferralCode,
    tokensData: marketsInfo.tokensData,
  });
  const ordersInfo = useOrdersInfoRequest(chainId, {
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

  const state = useMemo(() => {
    const s: SyntheticsTradeState = {
      pageType,
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
      tradebox: tradeState,
    };

    return s;
  }, [
    pageType,
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

export function useSyntheticsStateSelector<Selected>(selector: (s: SyntheticsTradeState) => Selected) {
  const value = useContext(StateCtx);
  if (!value) {
    throw new Error("Used useSyntheticsStateSelector outside of SyntheticsStateContextProvider");
  }
  return useContextSelector(StateCtx as Context<SyntheticsTradeState>, selector) as Selected;
}
