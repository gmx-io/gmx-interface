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
import { PositionSellerState, usePositionSellerState } from "domain/synthetics/trade/usePositionSellerState";
import { TradeState, useTradeboxState } from "domain/synthetics/trade/useTradeboxState";
import { BigNumber, ethers } from "ethers";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { ReactNode, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Context, createContext, useContext, useContextSelector } from "use-context-selector";
import { LeaderboardState, useLeaderboardState } from "./useLeaderboardState";
import { PositionEditorState, usePositionEditorState } from "domain/synthetics/trade/usePositionEditorState";

export type SyntheticsPageType = "actions" | "trade" | "pools" | "leaderboard" | "competitions";

export type SyntheticsTradeState = {
  pageType: SyntheticsPageType;
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

    closingPositionKey: string | undefined;
    setClosingPositionKey: (key: string | undefined) => void;
  };
  leaderboard: LeaderboardState;
  settings: SettingsContextType;
  tradebox: TradeState;
  positionSeller: PositionSellerState;
  positionEditor: PositionEditorState;
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
  pageType: SyntheticsTradeState["pageType"];
}) {
  const { chainId: selectedChainId } = useChainId();

  const { account: walletAccount, signer } = useWallet();
  const { account: paramsAccount } = useParams<{ account?: string }>();

  let checkSummedAccount: string | undefined;

  if (paramsAccount && ethers.utils.isAddress(paramsAccount)) {
    checkSummedAccount = ethers.utils.getAddress(paramsAccount);
  }

  const account = pageType === "actions" ? checkSummedAccount : walletAccount;
  const isLeaderboardPage = pageType === "competitions" || pageType === "leaderboard";
  const leaderboard = useLeaderboardState(account, isLeaderboardPage);
  const chainId = isLeaderboardPage ? leaderboard.chainId : selectedChainId;

  const markets = useMarkets(chainId);
  const marketsInfo = useMarketsInfoRequest(chainId);
  const positionsConstants = usePositionsConstantsRequest(chainId);
  const uiFeeFactor = useUiFeeFactor(chainId);
  const userReferralInfo = useUserReferralInfoRequest(signer, chainId, account, skipLocalReferralCode);
  const [closingPositionKey, setClosingPositionKey] = useState<string>();

  const { isLoading, positionsInfoData } = usePositionsInfoRequest(chainId, {
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
    tokensData: marketsInfo.tokensData,
  });
  const settings = useSettings();

  const tradeboxState = useTradeboxState(chainId, {
    marketsInfoData: marketsInfo.marketsInfoData,
    tokensData: marketsInfo.tokensData,
  });

  const positionSellerState = usePositionSellerState(chainId);
  const positionEditorState = usePositionEditorState(chainId);

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
        positionsInfo: {
          isLoading,
          positionsInfoData,
        },
        uiFeeFactor,
        userReferralInfo,

        savedIsPnlInLeverage,
        savedShowPnlAfterFees,

        closingPositionKey,
        setClosingPositionKey,
      },
      leaderboard,
      settings,
      tradebox: tradeboxState,
      positionSeller: positionSellerState,
      positionEditor: positionEditorState,
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
    isLoading,
    positionsInfoData,
    uiFeeFactor,
    userReferralInfo,
    savedIsPnlInLeverage,
    savedShowPnlAfterFees,
    closingPositionKey,
    leaderboard,
    settings,
    tradeboxState,
    positionSellerState,
    positionEditorState,
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
