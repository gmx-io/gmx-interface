import { ReactNode, useMemo, useRef, useState } from "react";

import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import { getKeepLeverageKey } from "config/localStorage";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import type { ChartDataProvider, SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useLeaderboardState } from "context/SyntheticsStateContext/useLeaderboardState";
import { latestStateRef, StateCtx } from "context/SyntheticsStateContext/utils";
import { useTokenPermitsContext } from "context/TokenPermitsContext/TokenPermitsContextProvider";
import { useInitExternalSwapState } from "domain/synthetics/externalSwaps/useInitExternalSwapState";
import type { MarketsInfoResult, MarketsResult } from "domain/synthetics/markets";
import { useOrderEditorState } from "domain/synthetics/orders/useOrderEditorState";
import type { AggregatedOrdersDataResult } from "domain/synthetics/orders/useOrdersInfo";
import type { PositionsInfoResult } from "domain/synthetics/positions";
import { composeApiPositionInfo } from "domain/synthetics/positions/usePositionsInfo";
import { useConfirmationBoxState } from "domain/synthetics/trade/useConfirmationBoxState";
import { usePositionEditorState } from "domain/synthetics/trade/usePositionEditorState";
import { OrderOption, usePositionSellerState } from "domain/synthetics/trade/usePositionSellerState";
import { useTradeboxState } from "domain/synthetics/trade/useTradeboxState";
import type { MissedCoinsPlace } from "domain/synthetics/userFeedback";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher/useOracleKeeperFetcher";
import { useSolanaWalletSession } from "lib/wallets/solanaWalletSession";
import type { ApiPositionInfo, PositionsInfoData } from "sdk/utils/positions/types";

import { createGmsolCandlesFetcher } from "./createGmsolCandlesFetcher";
import { getGmsolOracleSymbol } from "./gmsolOracleUtils";
import { composeGmsolMarkets, getGmsolPositionsConstants } from "./markets/composeGmsolMarkets";
import { fetchGmsol24hVolumes } from "./markets/fetchGmsol24hVolumes";
import { composeGmsolOrdersInfo } from "./orders/composeGmsolOrdersInfo";
import { resolveGmsolAccountSnapshot } from "./resolveGmsolAccountSnapshot";
import { fetchGmsol24hPriceDeltas } from "./tokens/fetchGmsol24hPriceDeltas";
import { useGmsolTokensData } from "./tokens/useGmsolTokensData";
import { useGmsolFeeDiscount, useGmsolOrders, useGmsolPositions } from "./useGmsolAccountData";
import { useGmsolRawMarketsInfo } from "./useGmsolRawMarketsInfo";

// Thrown into marketsInfo when the Solana host or prices fail: Solana has no RPC fallback.
export class GmsolMarketsUnavailableError extends Error {
  reason: Error | undefined;

  constructor(reason?: Error) {
    super("Solana market data is unavailable");
    this.name = "GmsolMarketsUnavailableError";
    this.reason = reason;
  }
}

const EMPTY_MARKETS: MarketsResult = {};
const noopSetGasPaymentTokenReplacement = () => undefined;

function composePositions({
  positions,
  marketsInfoData,
  showPnlInLeverage,
  previousData,
}: {
  positions: ApiPositionInfo[];
  marketsInfoData: NonNullable<MarketsInfoResult["marketsInfoData"]>;
  showPnlInLeverage: boolean;
  previousData: PositionsInfoData | undefined;
}) {
  const positionsInfoData: PositionsInfoData = {};

  for (const position of positions) {
    const positionInfo = composeApiPositionInfo(position, marketsInfoData);

    if (!positionInfo) {
      continue;
    }

    positionInfo.leverage = showPnlInLeverage ? positionInfo.leverageWithPnl : positionInfo.leverageWithoutPnl;
    positionsInfoData[positionInfo.key] = positionInfo;
  }

  return resolveGmsolAccountSnapshot({
    keys: positions.map((position) => position.key),
    data: positionsInfoData,
    previousData,
  });
}

// The trade state while Solana is selected. It fills the same SyntheticsState the shared trade page reads,
// from gmx-api's Solana host and the static Solana lists. globals.chainId stays Arbitrum, an EVM id, so
// EVM-only fields hold neutral values; everything persisted or cached is keyed by networkId.
export default function GmsolSyntheticsStateProvider({ children }: { children: ReactNode }) {
  const { chainId, networkId } = useChainId();
  const { address: owner } = useSolanaWalletSession();

  const settings = useSettings();
  const subaccountState = useSubaccountContext();
  const tokenPermitsState = useTokenPermitsContext();
  const leaderboard = useLeaderboardState(undefined, false);
  const externalSwapState = useInitExternalSwapState();

  const rawMarkets = useGmsolRawMarketsInfo({ enabled: true });
  const tokensDataResult = useGmsolTokensData({
    enabled: true,
    rawMarketsInfoData: rawMarkets.rawMarketsInfoData,
  });
  const tokensData = tokensDataResult.tokensData;

  const sdk = useGmxSdk(SOLANA_NETWORK_ID);
  const oracleFetcher = useOracleKeeperFetcher(ARBITRUM);
  const chartDataProvider = useMemo(
    (): ChartDataProvider | undefined =>
      sdk && {
        candlesFetcher: createGmsolCandlesFetcher(oracleFetcher),
        getChartSymbol: getGmsolOracleSymbol,
        fetch24hPriceDeltas: () => fetchGmsol24hPriceDeltas(oracleFetcher),
        fetch24hVolumes: () => fetchGmsol24hVolumes(sdk),
      },
    [oracleFetcher, sdk]
  );

  const composedMarkets = useMemo(
    () =>
      rawMarkets.rawMarketsInfoData && tokensData
        ? composeGmsolMarkets(rawMarkets.rawMarketsInfoData, tokensData)
        : undefined,
    [rawMarkets.rawMarketsInfoData, tokensData]
  );

  const positionsConstants = useMemo(
    () => (rawMarkets.rawMarketsInfoData ? getGmsolPositionsConstants(rawMarkets.rawMarketsInfoData) : undefined),
    [rawMarkets.rawMarketsInfoData]
  );

  const isMarketsUnavailable = rawMarkets.isUnavailable || tokensDataResult.isUnavailable;
  const marketsUnavailableError = rawMarkets.error ?? tokensDataResult.error;

  const marketsInfo = useMemo((): MarketsInfoResult => {
    const error = isMarketsUnavailable ? new GmsolMarketsUnavailableError(marketsUnavailableError) : undefined;

    // Keep the last good markets under the warning until the grace window drops them.
    if (composedMarkets) {
      return { marketsInfoData: composedMarkets.marketsInfoData, isLoading: false, dataSource: "api", error };
    }

    if (error) {
      return { isLoading: false, error };
    }

    return { isLoading: true };
  }, [composedMarkets, isMarketsUnavailable, marketsUnavailableError]);

  const markets = useMemo(
    (): MarketsResult =>
      composedMarkets
        ? { marketsData: composedMarkets.marketsData, marketsAddresses: composedMarkets.marketsAddresses }
        : EMPTY_MARKETS,
    [composedMarkets]
  );

  const positionsRequest = useGmsolPositions(owner);
  const ordersRequest = useGmsolOrders(owner);
  const feeDiscountRequest = useGmsolFeeDiscount(owner);

  const marketsInfoData = marketsInfo.marketsInfoData;
  const isMarketsLoading = marketsInfo.isLoading;
  const lastPositionsRef = useRef<{ owner: string; data: PositionsInfoData }>();

  const composedPositions = useMemo(() => {
    if (!positionsRequest.data || isMarketsLoading) {
      return undefined;
    }

    return composePositions({
      positions: positionsRequest.data,
      marketsInfoData: marketsInfoData ?? EMPTY_OBJECT,
      showPnlInLeverage: settings.isPnlInLeverage,
      previousData: owner && lastPositionsRef.current?.owner === owner ? lastPositionsRef.current.data : undefined,
    });
  }, [owner, positionsRequest.data, isMarketsLoading, marketsInfoData, settings.isPnlInLeverage]);
  if (owner && composedPositions) {
    lastPositionsRef.current = { owner, data: composedPositions.data };
  }

  const lastOrdersRef = useRef<{ owner: string; data: NonNullable<AggregatedOrdersDataResult["ordersInfoData"]> }>();
  const composedOrders = useMemo(() => {
    if (!ordersRequest.data || isMarketsLoading) {
      return undefined;
    }

    return composeGmsolOrdersInfo(ordersRequest.data, {
      marketsInfoData: marketsInfoData ?? EMPTY_OBJECT,
      tokensData: tokensData ?? EMPTY_OBJECT,
      previousData: owner && lastOrdersRef.current?.owner === owner ? lastOrdersRef.current.data : undefined,
    });
  }, [owner, ordersRequest.data, isMarketsLoading, marketsInfoData, tokensData]);
  if (owner && composedOrders) {
    lastOrdersRef.current = { owner, data: composedOrders.data };
  }

  const positionsInfo = useMemo((): PositionsInfoResult => {
    if (!owner) {
      return { isLoading: false };
    }

    if (composedPositions) {
      return {
        positionsInfoData: composedPositions.data,
        isLoading: false,
        dataSource: "api",
        error:
          positionsRequest.error ??
          (composedPositions.isIncomplete ? new GmsolMarketsUnavailableError(marketsUnavailableError) : undefined),
      };
    }

    // Host down drops markets, so this wallet's last list stays with the error instead of "No open positions".
    const cachedPositions = lastPositionsRef.current?.owner === owner ? lastPositionsRef.current.data : undefined;
    if (isMarketsUnavailable && cachedPositions) {
      return {
        positionsInfoData: cachedPositions,
        isLoading: false,
        dataSource: "api",
        error: positionsRequest.error ?? new GmsolMarketsUnavailableError(marketsUnavailableError),
      };
    }

    if (positionsRequest.error || isMarketsUnavailable) {
      return {
        isLoading: false,
        error: positionsRequest.error ?? new GmsolMarketsUnavailableError(marketsUnavailableError),
      };
    }

    return { isLoading: true };
  }, [owner, composedPositions, positionsRequest.error, isMarketsUnavailable, marketsUnavailableError]);

  const ordersInfo = useMemo((): AggregatedOrdersDataResult => {
    if (!owner) {
      return { isLoading: false };
    }

    const cachedOrders = lastOrdersRef.current?.owner === owner ? lastOrdersRef.current.data : undefined;
    const ordersInfoData = composedOrders?.data ?? (isMarketsUnavailable ? cachedOrders : undefined);

    if (ordersInfoData) {
      return {
        ordersInfoData,
        count: Object.keys(ordersInfoData).length,
        isLoading: false,
        error:
          ordersRequest.error ??
          (!composedOrders || composedOrders.isIncomplete
            ? new GmsolMarketsUnavailableError(marketsUnavailableError)
            : undefined),
      };
    }

    if (ordersRequest.error || isMarketsUnavailable) {
      return {
        isLoading: false,
        error: ordersRequest.error ?? new GmsolMarketsUnavailableError(marketsUnavailableError),
      };
    }

    return { isLoading: true };
  }, [owner, composedOrders, ordersRequest.error, isMarketsUnavailable, marketsUnavailableError]);

  const positionsInfoData = positionsInfo.positionsInfoData;

  const tradeboxState = useTradeboxState(chainId, true, {
    networkId,
    marketsInfoData,
    marketsData: markets.marketsData,
    tokensData,
    positionsInfoData,
    ordersInfoData: ordersInfo.ordersInfoData,
    srcChainId: undefined,
    jitLiquidityMap: undefined,
  });

  const orderEditor = useOrderEditorState(ordersInfo.ordersInfoData);

  const [closingPositionKeyRaw, setClosingPositionKeyRaw] = useState<string>();
  const closingPositionKey = closingPositionKeyRaw;
  const [closingPositionOrderOption, setClosingPositionOrderOption] = useState<OrderOption>();
  const setClosingPositionKey = useMemo(
    () => (key: string | undefined, orderOption?: OrderOption) => {
      setClosingPositionKeyRaw(key);
      setClosingPositionOrderOption(orderOption);
    },
    []
  );

  const positionSellerState = usePositionSellerState(
    chainId,
    positionsInfoData?.[closingPositionKey ?? ""],
    closingPositionOrderOption,
    networkId
  );
  const positionEditorState = usePositionEditorState(chainId, undefined);
  const confirmationBoxState = useConfirmationBoxState();

  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey(getKeepLeverageKey(networkId), true);
  const [isCandlesLoaded, setIsCandlesLoaded] = useState(false);
  const [missedCoinsModalPlace, setMissedCoinsModalPlace] = useState<MissedCoinsPlace | undefined>(undefined);

  const feeDiscount = feeDiscountRequest.data;
  const feeDiscountError = feeDiscountRequest.error;

  const state = useMemo((): SyntheticsState => {
    return {
      pageType: "trade",
      globals: {
        chainId,
        srcChainId: undefined,
        account: owner,
        signer: undefined,
        markets,
        marketsInfo,
        ordersInfo,
        positionsConstants,
        glvInfo: { glvs: undefined, glvData: undefined, isLoading: false },
        positionsInfo,
        tokensDataResult,
        // gmsol charges no UI fee.
        uiFeeFactor: 0n,
        userReferralInfo: feeDiscount?.userReferralInfo,
        proDiscountFactor: undefined,
        feeDiscountFactor: feeDiscount?.orderFeeDiscountFactor,
        feeDiscountError,
        depositMarketTokensData: undefined,
        progressiveDepositMarketTokensData: undefined,
        multichainMarketTokensBalancesResult: { tokenBalances: EMPTY_OBJECT, isLoading: false },

        closingPositionKey,
        setClosingPositionKey,
        closingPositionOrderOption,

        missedCoinsModalPlace,
        setMissedCoinsModalPlace,

        gasLimits: undefined,
        gasPrice: undefined,

        keepLeverage,
        setKeepLeverage,
        lastWeekAccountStats: undefined,
        lastMonthAccountStats: undefined,
        accountStats: undefined,
        isCandlesLoaded,
        setIsCandlesLoaded,
        isLargeAccount: undefined,
        isFirstOrder: false,
        blockTimestampData: undefined,

        oracleSettings: undefined,

        jitLiquidityData: { jitLiquidityMap: undefined },

        accountWhitelistsResult: { accountWhitelists: undefined },
        usdgBoostAprResult: { usdgBoostAprResponse: undefined },

        chartDataProvider,
      },
      claims: { accruedPositionPriceImpactFees: EMPTY_ARRAY, claimablePositionPriceImpactFees: EMPTY_ARRAY },
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
      poolsDetails: undefined,
      features: undefined,
      uiFlags: undefined,
      gasPaymentTokenAllowance: undefined,
      gasPaymentTokensOnchainState: undefined,
      gasPaymentTokenReplacements: EMPTY_OBJECT,
      setGasPaymentTokenReplacement: noopSetGasPaymentTokenReplacement,
      l1ExpressOrderGasReference: undefined,
    };
  }, [
    chainId,
    owner,
    markets,
    marketsInfo,
    ordersInfo,
    positionsConstants,
    positionsInfo,
    tokensDataResult,
    feeDiscount,
    feeDiscountError,
    closingPositionKey,
    setClosingPositionKey,
    closingPositionOrderOption,
    missedCoinsModalPlace,
    keepLeverage,
    setKeepLeverage,
    isCandlesLoaded,
    chartDataProvider,
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
  ]);

  latestStateRef.current = state;

  return <StateCtx.Provider value={state}>{children}</StateCtx.Provider>;
}
