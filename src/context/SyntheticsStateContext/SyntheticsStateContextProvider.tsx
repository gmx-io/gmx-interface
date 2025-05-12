import { ethers } from "ethers";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Context, createContext, useContext, useContextSelector } from "use-context-selector";

import { UiContractsChain, UiSourceChain, UiSupportedChain } from "config/chains";
import { getKeepLeverageKey } from "config/localStorage";
import { isSettlementChain, isSourceChain } from "context/GmxAccountContext/config";
import { SettingsContextType, useSettings } from "context/SettingsContext/SettingsContextProvider";
import { SubaccountState, useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { TokenPermitsState, useTokenPermitsContext } from "context/TokenPermitsContext/TokenPermitsContextProvider";
import { UserReferralInfo, useUserReferralInfoRequest } from "domain/referrals";
import { useIsLargeAccountTracker } from "domain/stats/isLargeAccount";
import {
  AccountStats,
  PeriodAccountStats,
  useAccountStats,
  usePeriodAccountStats,
} from "domain/synthetics/accountStats";
import { SponsoredCallParams, useSponsoredCallParamsRequest } from "domain/synthetics/express";
import { useL1ExpressOrderGasReference } from "domain/synthetics/express/useL1ExpressGasReference";
import { ExternalSwapState } from "domain/synthetics/externalSwaps/types";
import { useInitExternalSwapState } from "domain/synthetics/externalSwaps/useInitExternalSwapState";
import { DisabledFeatures, useDisabledFeaturesRequest } from "domain/synthetics/features/useDisabledFeatures";
import { L1ExpressOrderGasReference, useGasLimits, useGasPrice } from "domain/synthetics/fees";
import { RebateInfoItem, useRebatesInfoRequest } from "domain/synthetics/fees/useRebatesInfo";
import useUiFeeFactorRequest from "domain/synthetics/fees/utils/useUiFeeFactor";
import {
  MarketsInfoResult,
  MarketsResult,
  useMarketTokensDataRequest,
  useMarkets,
  useMarketsInfoRequest,
} from "domain/synthetics/markets";
import { isGlvEnabled } from "domain/synthetics/markets/glv";
import { useGlvMarketsInfo } from "domain/synthetics/markets/useGlvMarkets";
import { OrderEditorState, useOrderEditorState } from "domain/synthetics/orders/useOrderEditorState";
import { AggregatedOrdersDataResult, useOrdersInfoRequest } from "domain/synthetics/orders/useOrdersInfo";
import {
  PositionsConstantsResult,
  PositionsInfoResult,
  usePositions,
  usePositionsConstantsRequest,
  usePositionsInfoRequest,
} from "domain/synthetics/positions";
import { TokensData, useTokensDataRequest } from "domain/synthetics/tokens";
import { ConfirmationBoxState, useConfirmationBoxState } from "domain/synthetics/trade/useConfirmationBoxState";
import { PositionEditorState, usePositionEditorState } from "domain/synthetics/trade/usePositionEditorState";
import { PositionSellerState, usePositionSellerState } from "domain/synthetics/trade/usePositionSellerState";
import { TradeboxState, useTradeboxState } from "domain/synthetics/trade/useTradeboxState";
import useIsFirstOrder from "domain/synthetics/tradeHistory/useIsFirstOrder";
import { MissedCoinsPlace } from "domain/synthetics/userFeedback";
import { useChainId } from "lib/chains";
import { getTimePeriodsInSeconds } from "lib/dates";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { BlockTimestampData, useBlockTimestampRequest } from "lib/useBlockTimestampRequest";
import useWallet from "lib/wallets/useWallet";

import { useGmxAccountTokensDataRequest } from "components/Synthetics/GmxAccountModal/hooks";

import { useCollectSyntheticsMetrics } from "./useCollectSyntheticsMetrics";
import { LeaderboardState, useLeaderboardState } from "./useLeaderboardState";

export type SyntheticsPageType =
  | "accounts"
  | "trade"
  | "pools"
  | "leaderboard"
  | "competitions"
  | "dashboard"
  | "earn"
  | "buy"
  | "home"
  | "gmxAccount";

export type SyntheticsState = {
  pageType: SyntheticsPageType;
  globals: {
    chainId: UiContractsChain;
    srcChainId: UiSourceChain | undefined;
    markets: MarketsResult;
    marketsInfo: MarketsInfoResult;
    positionsInfo: PositionsInfoResult;
    account: string | undefined;
    ordersInfo: AggregatedOrdersDataResult;
    positionsConstants: PositionsConstantsResult["positionsConstants"];
    uiFeeFactor: bigint;
    userReferralInfo: UserReferralInfo | undefined;
    depositMarketTokensData: TokensData | undefined;
    glvInfo: ReturnType<typeof useGlvMarketsInfo>;

    closingPositionKey: string | undefined;
    setClosingPositionKey: (key: string | undefined) => void;

    keepLeverage: boolean | undefined;
    setKeepLeverage: (value: boolean) => void;

    missedCoinsModalPlace: MissedCoinsPlace | undefined;
    setMissedCoinsModalPlace: (place: MissedCoinsPlace | undefined) => void;

    gasLimits: ReturnType<typeof useGasLimits>;
    gasPrice: ReturnType<typeof useGasPrice>;

    lastWeekAccountStats?: PeriodAccountStats;
    lastMonthAccountStats?: PeriodAccountStats;
    accountStats?: AccountStats;
    isCandlesLoaded: boolean;
    setIsCandlesLoaded: (isLoaded: boolean) => void;
    isLargeAccount?: boolean;
    isFirstOrder: boolean;
    blockTimestampData: BlockTimestampData | undefined;
  };
  claims: {
    accruedPositionPriceImpactFees: RebateInfoItem[];
    claimablePositionPriceImpactFees: RebateInfoItem[];
  };
  leaderboard: LeaderboardState;
  settings: SettingsContextType;
  subaccountState: SubaccountState;
  tradebox: TradeboxState;
  externalSwap: ExternalSwapState;
  tokenPermitsState: TokenPermitsState;
  orderEditor: OrderEditorState;
  positionSeller: PositionSellerState;
  positionEditor: PositionEditorState;
  confirmationBox: ConfirmationBoxState;
  disabledFeatures: DisabledFeatures | undefined;
  sponsoredCallParams: SponsoredCallParams | undefined;
  l1ExpressOrderGasReference: L1ExpressOrderGasReference | undefined;
};

const StateCtx = createContext<SyntheticsState | null>(null);

let latestState: SyntheticsState | null = null;

export function SyntheticsStateContextProvider({
  children,
  skipLocalReferralCode,
  pageType,
  overrideChainId,
}: {
  children: ReactNode;
  skipLocalReferralCode: boolean;
  pageType: SyntheticsState["pageType"];
  overrideChainId?: number;
}) {
  const { chainId: selectedChainId, srcChainId } = useChainId();

  const { account: walletAccount, signer } = useWallet();

  const { account: paramsAccount } = useParams<{ account?: string }>();

  let checkSummedAccount: string | undefined;

  if (paramsAccount && ethers.isAddress(paramsAccount)) {
    checkSummedAccount = ethers.getAddress(paramsAccount);
  }

  const isLeaderboardPage = pageType === "competitions" || pageType === "leaderboard";
  const isTradePage = pageType === "trade";
  const isAccountPage = pageType === "accounts";

  const account = isAccountPage ? checkSummedAccount : walletAccount;
  const leaderboard = useLeaderboardState(account, isLeaderboardPage);
  const chainId = isLeaderboardPage ? leaderboard.chainId : overrideChainId ?? selectedChainId;

  const markets = useMarkets(chainId);
  const { tokensData: settlementChainTokensData } = useTokensDataRequest(chainId);
  const { tokensData: gmxAccountTokensData } = useGmxAccountTokensDataRequest();

  let tokensData = settlementChainTokensData;

  if (srcChainId) {
    tokensData = gmxAccountTokensData;
  }

  const positionsResult = usePositions(chainId, {
    account,
    marketsData: markets.marketsData,
    tokensData,
  });

  const marketsInfo = useMarketsInfoRequest(chainId);

  const { isFirstOrder } = useIsFirstOrder(chainId, { account });

  const shouldFetchGlvMarkets =
    isGlvEnabled(chainId) && (pageType === "pools" || pageType === "earn" || pageType === "buy");
  const glvInfo = useGlvMarketsInfo(shouldFetchGlvMarkets, {
    marketsInfoData: marketsInfo.marketsInfoData,
    tokensData: marketsInfo.tokensData,
    chainId: chainId,
    account: account,
  });

  const { marketTokensData: depositMarketTokensData } = useMarketTokensDataRequest(chainId, {
    isDeposit: true,
    account,
    glvData: glvInfo.glvData,
    withGlv: shouldFetchGlvMarkets,
  });
  const { positionsConstants } = usePositionsConstantsRequest(chainId);
  const { uiFeeFactor } = useUiFeeFactorRequest(chainId);
  const userReferralInfo = useUserReferralInfoRequest(signer, chainId, account, skipLocalReferralCode);
  const [closingPositionKey, setClosingPositionKey] = useState<string>();
  const [isCandlesLoaded, setIsCandlesLoaded] = useState(false);
  const { accruedPositionPriceImpactFees, claimablePositionPriceImpactFees } = useRebatesInfoRequest(
    chainId,
    isTradePage
  );

  const [missedCoinsModalPlace, setMissedCoinsModalPlace] = useState<MissedCoinsPlace>();

  const settings = useSettings();
  const subaccountState = useSubaccountContext();
  const { disabledFeatures } = useDisabledFeaturesRequest(chainId);

  const {
    isLoading,
    positionsInfoData,
    error: positionsInfoError,
  } = usePositionsInfoRequest(chainId, {
    account,
    showPnlInLeverage: settings.isPnlInLeverage,
    marketsInfoData: marketsInfo.marketsInfoData,
    positionsData: positionsResult.positionsData,
    positionsError: positionsResult.error,
    marketsData: markets.marketsData,
    skipLocalReferralCode,
    tokensData,
  });

  const ordersInfo = useOrdersInfoRequest(chainId, {
    account,
    marketsInfoData: marketsInfo.marketsInfoData,
    tokensData: marketsInfo.tokensData,
  });

  const tradeboxState = useTradeboxState(chainId, isTradePage, {
    marketsInfoData: marketsInfo.marketsInfoData,
    marketsData: markets.marketsData,
    tokensData: marketsInfo.tokensData,
    positionsInfoData,
    ordersInfoData: ordersInfo.ordersInfoData,
    srcChainId,
  });

  const orderEditor = useOrderEditorState(ordersInfo.ordersInfoData);

  const timePerios = useMemo(() => getTimePeriodsInSeconds(), []);

  const isLargeAccount = useIsLargeAccountTracker(walletAccount);

  const { data: lastWeekAccountStats } = usePeriodAccountStats(chainId, {
    account,
    from: timePerios.week[0],
    to: timePerios.week[1],
    enabled: pageType === "trade",
  });

  const { data: lastMonthAccountStats } = usePeriodAccountStats(chainId, {
    account,
    from: timePerios.month[0],
    to: timePerios.month[1],
    enabled: pageType === "trade",
  });

  const { data: accountStats } = useAccountStats(chainId, {
    account,
    enabled: pageType === "trade",
  });

  const { blockTimestampData } = useBlockTimestampRequest(chainId, { skip: !["trade", "pools"].includes(pageType) });

  // TODO move closingPositionKey to positionSellerState
  const positionSellerState = usePositionSellerState(chainId, positionsInfoData?.[closingPositionKey ?? ""]);
  const positionEditorState = usePositionEditorState(chainId);
  const confirmationBoxState = useConfirmationBoxState();

  const gasLimits = useGasLimits(chainId);
  const gasPrice = useGasPrice(chainId);
  const l1ExpressOrderGasReference = useL1ExpressOrderGasReference();

  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey(getKeepLeverageKey(chainId), true);

  useCollectSyntheticsMetrics({
    marketsInfo,
    isPositionsInfoLoading: isLoading,
    positionsInfoData,
    positionsInfoError,
    isCandlesLoaded,
    pageType,
  });

  const externalSwapState = useInitExternalSwapState();
  const tokenPermitsState = useTokenPermitsContext();
  const sponsoredCallParams = useSponsoredCallParamsRequest(chainId, {
    tokensData: marketsInfo.tokensData,
  });

  const state = useMemo(() => {
    const s: SyntheticsState = {
      pageType,
      globals: {
        chainId,
        srcChainId,
        account,
        markets,
        marketsInfo,
        ordersInfo,
        positionsConstants,
        glvInfo,
        positionsInfo: {
          isLoading,
          positionsInfoData,
        },
        uiFeeFactor,
        userReferralInfo,
        depositMarketTokensData,

        closingPositionKey,
        setClosingPositionKey,

        missedCoinsModalPlace,
        setMissedCoinsModalPlace,

        gasLimits,
        gasPrice,

        keepLeverage,
        setKeepLeverage,
        lastWeekAccountStats,
        lastMonthAccountStats,
        accountStats,
        isCandlesLoaded,
        setIsCandlesLoaded,
        isLargeAccount,
        isFirstOrder,
        blockTimestampData,
      },
      claims: { accruedPositionPriceImpactFees, claimablePositionPriceImpactFees },
      leaderboard,
      settings,
      subaccountState,
      tradebox: tradeboxState,
      externalSwap: externalSwapState,
      tokenPermitsState,
      orderEditor,
      positionSeller: positionSellerState,
      positionEditor: positionEditorState,
      confirmationBox: confirmationBoxState,
      disabledFeatures,
      sponsoredCallParams,
      l1ExpressOrderGasReference,
    };

    return s;
  }, [
    pageType,
    chainId,
    srcChainId,
    account,
    markets,
    marketsInfo,
    ordersInfo,
    positionsConstants,
    glvInfo,
    isLoading,
    positionsInfoData,
    uiFeeFactor,
    userReferralInfo,
    depositMarketTokensData,
    closingPositionKey,
    missedCoinsModalPlace,
    gasLimits,
    gasPrice,
    keepLeverage,
    setKeepLeverage,
    lastWeekAccountStats,
    lastMonthAccountStats,
    accountStats,
    isCandlesLoaded,
    isLargeAccount,
    isFirstOrder,
    blockTimestampData,
    accruedPositionPriceImpactFees,
    claimablePositionPriceImpactFees,
    leaderboard,
    settings,
    subaccountState,
    tradeboxState,
    externalSwapState,
    tokenPermitsState,
    orderEditor,
    positionSellerState,
    positionEditorState,
    confirmationBoxState,
    disabledFeatures,
    sponsoredCallParams,
    l1ExpressOrderGasReference,
  ]);

  latestState = state;

  return <StateCtx.Provider value={state}>{children}</StateCtx.Provider>;
}

export function useSyntheticsStateSelector<Selected>(selector: (s: SyntheticsState) => Selected) {
  const value = useContext(StateCtx);
  if (!value) {
    throw new Error("Used useSyntheticsStateSelector outside of SyntheticsStateContextProvider");
  }
  return useContextSelector(StateCtx as Context<SyntheticsState>, selector) as Selected;
}

export function useCalcSelector() {
  return useCallback(function useCalcSelector<Selected>(selector: (state: SyntheticsState) => Selected) {
    if (!latestState) throw new Error("Used calcSelector outside of SyntheticsStateContextProvider");
    return selector(latestState);
  }, []);
}
