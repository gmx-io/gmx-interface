import { ethers } from "ethers";
import { ReactNode, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import type { ContractsChainId, SourceChainId } from "config/chains";
import { getKeepLeverageKey } from "config/localStorage";
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
import { OracleSettingsData, useOracleSettingsData } from "domain/synthetics/common/useOracleSettingsData";
import { SponsoredCallBalanceData, useIsSponsoredCallBalanceAvailable } from "domain/synthetics/express";
import { useL1ExpressOrderGasReference } from "domain/synthetics/express/useL1ExpressGasReference";
import { ExternalSwapState } from "domain/synthetics/externalSwaps/types";
import { useBotanixStakingAssetsPerShare } from "domain/synthetics/externalSwaps/useBotanixStakingAssetsPerShare";
import { useInitExternalSwapState } from "domain/synthetics/externalSwaps/useInitExternalSwapState";
import { FeaturesSettings, useEnabledFeaturesRequest } from "domain/synthetics/features/useDisabledFeatures";
import { L1ExpressOrderGasReference, useGasLimits, useGasPrice } from "domain/synthetics/fees";
import { RebateInfoItem, useRebatesInfoRequest } from "domain/synthetics/fees/useRebatesInfo";
import useUiFeeFactorRequest from "domain/synthetics/fees/utils/useUiFeeFactor";
import {
  MarketsInfoResult,
  MarketsResult,
  useMarkets,
  useMarketsInfoRequest,
  useMarketTokensDataRequest,
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
import {
  TokenAllowanceResult,
  TokensData,
  TokensDataResult,
  useTokensAllowanceData,
  useTokensDataRequest,
} from "domain/synthetics/tokens";
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
import { WalletSigner } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import { getContract } from "sdk/configs/contracts";
import { convertTokenAddress } from "sdk/configs/tokens";

import { useCollectSyntheticsMetrics } from "./useCollectSyntheticsMetrics";
import { LeaderboardState, useLeaderboardState } from "./useLeaderboardState";
import { latestStateRef, StateCtx } from "./utils";

export type SyntheticsPageType =
  | "accounts"
  | "trade"
  | "pools"
  | "leaderboard"
  | "competitions"
  | "stats"
  | "stake"
  | "buy"
  | "home"
  | "gmxAccount"
  | "referrals";

export type SyntheticsState = {
  pageType: SyntheticsPageType;
  globals: {
    chainId: ContractsChainId;
    srcChainId: SourceChainId | undefined;
    markets: MarketsResult;
    marketsInfo: MarketsInfoResult;
    positionsInfo: PositionsInfoResult;
    tokensDataResult: TokensDataResult;
    account: string | undefined;
    signer: WalletSigner | undefined;
    ordersInfo: AggregatedOrdersDataResult;
    positionsConstants: PositionsConstantsResult["positionsConstants"];
    uiFeeFactor: bigint;
    userReferralInfo: UserReferralInfo | undefined;
    depositMarketTokensData: TokensData | undefined;
    glvInfo: ReturnType<typeof useGlvMarketsInfo>;
    botanixStakingAssetsPerShare: bigint | undefined;

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

    oracleSettings: OracleSettingsData | undefined;
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
  features: FeaturesSettings | undefined;
  gasPaymentTokenAllowance: TokenAllowanceResult | undefined;
  sponsoredCallBalanceData: SponsoredCallBalanceData | undefined;
  l1ExpressOrderGasReference: L1ExpressOrderGasReference | undefined;
};

export function SyntheticsStateContextProvider({
  children,
  skipLocalReferralCode,
  pageType,
  overrideChainId,
}: {
  children: ReactNode;
  skipLocalReferralCode: boolean;
  pageType: SyntheticsPageType;
  overrideChainId?: ContractsChainId;
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
  const tokensDataResult = useTokensDataRequest(chainId, srcChainId);

  const positionsResult = usePositions(chainId, {
    account,
    marketsData: markets.marketsData,
    tokensData: tokensDataResult.tokensData,
  });

  const marketsInfo = useMarketsInfoRequest(chainId, { tokensData: tokensDataResult.tokensData });

  const { isFirstOrder } = useIsFirstOrder(chainId, { account });

  const shouldFetchGlvMarkets =
    isGlvEnabled(chainId) && (pageType === "pools" || pageType === "buy" || pageType === "stake");
  const glvInfo = useGlvMarketsInfo(shouldFetchGlvMarkets, {
    marketsInfoData: marketsInfo.marketsInfoData,
    tokensData: tokensDataResult.tokensData,
    chainId,
    account,
    srcChainId,
  });

  const { marketTokensData: depositMarketTokensData } = useMarketTokensDataRequest(chainId, srcChainId, {
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
  const { accruedPositionPriceImpactFees, claimablePositionPriceImpactFees } = useRebatesInfoRequest(chainId, {
    enabled: isTradePage,
    positionsConstants,
  });

  const oracleSettings = useOracleSettingsData();

  const [missedCoinsModalPlace, setMissedCoinsModalPlace] = useState<MissedCoinsPlace>();

  const settings = useSettings();
  const subaccountState = useSubaccountContext();
  const { features } = useEnabledFeaturesRequest(chainId);

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
    tokensData: tokensDataResult.tokensData,
  });

  const ordersInfo = useOrdersInfoRequest(chainId, {
    account,
    marketsInfoData: marketsInfo.marketsInfoData,
    tokensData: tokensDataResult.tokensData,
  });

  const tradeboxState = useTradeboxState(chainId, isTradePage, {
    marketsInfoData: marketsInfo.marketsInfoData,
    marketsData: markets.marketsData,
    tokensData: tokensDataResult.tokensData,
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
  const positionEditorState = usePositionEditorState(chainId, srcChainId);
  const confirmationBoxState = useConfirmationBoxState();

  const gasLimits = useGasLimits(chainId);
  const gasPrice = useGasPrice(chainId);
  const l1ExpressOrderGasReference = useL1ExpressOrderGasReference();

  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey(getKeepLeverageKey(chainId), true);

  useCollectSyntheticsMetrics({
    tokensDataResult,
    marketsInfo,
    isPositionsInfoLoading: isLoading,
    positionsInfoData,
    positionsInfoError,
    isCandlesLoaded,
    pageType,
  });

  const externalSwapState = useInitExternalSwapState();
  const tokenPermitsState = useTokenPermitsContext();
  const sponsoredCallBalanceData = useIsSponsoredCallBalanceAvailable(chainId, {
    tokensData: tokensDataResult.tokensData,
  });

  const gasPaymentTokenAllowance = useTokensAllowanceData(chainId, {
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokenAddresses: [convertTokenAddress(chainId, settings.gasPaymentTokenAddress, "wrapped")],
  });

  const botanixStakingAssetsPerShare = useBotanixStakingAssetsPerShare({ chainId });

  const state = useMemo(() => {
    const s: SyntheticsState = {
      pageType,
      globals: {
        chainId,
        srcChainId,
        account,
        signer,
        markets,
        marketsInfo,
        ordersInfo,
        positionsConstants,
        glvInfo,
        botanixStakingAssetsPerShare,
        positionsInfo: {
          isLoading,
          positionsInfoData,
        },
        tokensDataResult,
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

        oracleSettings,
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
      features,
      sponsoredCallBalanceData,
      gasPaymentTokenAllowance,
      l1ExpressOrderGasReference,
    };

    return s;
  }, [
    account,
    accountStats,
    accruedPositionPriceImpactFees,
    blockTimestampData,
    botanixStakingAssetsPerShare,
    chainId,
    claimablePositionPriceImpactFees,
    closingPositionKey,
    confirmationBoxState,
    depositMarketTokensData,
    externalSwapState,
    features,
    gasLimits,
    gasPaymentTokenAllowance,
    gasPrice,
    glvInfo,
    isCandlesLoaded,
    isFirstOrder,
    isLargeAccount,
    isLoading,
    keepLeverage,
    l1ExpressOrderGasReference,
    lastMonthAccountStats,
    lastWeekAccountStats,
    leaderboard,
    markets,
    marketsInfo,
    missedCoinsModalPlace,
    oracleSettings,
    orderEditor,
    ordersInfo,
    pageType,
    positionEditorState,
    positionSellerState,
    positionsConstants,
    positionsInfoData,
    setKeepLeverage,
    settings,
    signer,
    sponsoredCallBalanceData,
    srcChainId,
    subaccountState,
    tokenPermitsState,
    tokensDataResult,
    tradeboxState,
    uiFeeFactor,
    userReferralInfo,
  ]);

  latestStateRef.current = state;

  return <StateCtx.Provider value={state}>{children}</StateCtx.Provider>;
}
