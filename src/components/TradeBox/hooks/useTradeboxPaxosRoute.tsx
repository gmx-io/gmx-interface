import { t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { USD_DECIMALS } from "config/factors";
import {
  DEBUG_PAXOS_TRANSIT_FORCE_STANDARD_KEY,
  DEBUG_PAXOS_TRANSIT_IGNORE_WHITELIST_KEY,
  DEBUG_PAXOS_TRANSIT_MOCK_KEY,
  DEBUG_PAXOS_TRANSIT_THRESHOLD_USD_KEY,
} from "config/localStorage";
import { getPaxosTransitConfig } from "config/paxosTransit";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectShowDebugValues } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import {
  selectExternalSwapIsLoading,
  selectTradeboxFocusedInput,
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
  selectTradeboxSelectSwapToToken,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import {
  selectTradeboxInstantSwapAmountOut,
  selectTradeboxPaxosDirection,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors/tradeboxPaxosSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { mockTransitApi } from "domain/synthetics/paxosTransit/mockTransitApi";
import { submitTransitOrder } from "domain/synthetics/paxosTransit/submitTransitOrder";
import {
  getIsPaxosQuoteWorseThanShown,
  getPaxosRouteStates,
  getTradeboxPaxosDecision,
  type PaxosRouteState,
  type PaxosSubmitStep,
  type PaxosSwapRoute,
  type TradeboxSwapRoutePreference,
} from "domain/synthetics/paxosTransit/tradeboxRoutes";
import { getIsTransitOrderFinal } from "domain/synthetics/paxosTransit/transitOrders";
import type { TransitApi } from "domain/synthetics/paxosTransit/types";
import { useTransitMinOrderSizes } from "domain/synthetics/paxosTransit/useTransitMinOrderSizes";
import { convertToTokenAmount, convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import { useDebounce } from "lib/debounce/useDebounce";
import { helperToast } from "lib/helperToast";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { adjustForDecimals, formatAmountFree, parseValue } from "lib/numbers";
import { retryAtRefreshCadence } from "lib/useSWRWithFreshness";
import { AccountType, useAccountType } from "lib/wallets/useAccountType";
import useWallet from "lib/wallets/useWallet";
import { HttpError } from "sdk/utils/http/http";
import type { TransitFeeTier, TransitQuote, TransitQuoteParams } from "sdk/utils/paxos/types";

const FEE_TIER_REFRESH_INTERVAL = 60_000;
const QUOTE_REFRESH_INTERVAL = 30_000;
const AMOUNT_DEBOUNCE_MS = 500;

const PAXOS_ROUTE_FEE_TIERS: Record<PaxosSwapRoute, TransitFeeTier> = {
  paxosZeroFee: "zeroFee",
  paxosStandard: "standardFee",
};

class PaxosQuoteChangedError extends Error {}

export type TradeboxPaxosRoute = ReturnType<typeof useTradeboxPaxosRoute>;

export function useTradeboxPaxosRoute({
  setFromTokenInputValue,
  setFocusedInput,
}: {
  setFromTokenInputValue: (value: string, resetPriceImpactAndSwapSlippage?: boolean) => void;
  setFocusedInput: (input: "from" | "to") => void;
}) {
  const chainId = useSelector(selectChainId);
  const direction = useSelector(selectTradeboxPaxosDirection);
  const fromToken = useSelector(selectTradeboxFromToken);
  const toToken = useSelector(selectTradeboxSelectSwapToToken);
  const fromTokenAmount = useSelector(selectTradeboxFromTokenAmount);
  const focusedInput = useSelector(selectTradeboxFocusedInput);
  const instantAmountOut = useSelector(selectTradeboxInstantSwapAmountOut);
  const isInstantLoading = useSelector(selectExternalSwapIsLoading);
  const showDebugValues = useSelector(selectShowDebugValues);
  const { account, signer } = useWallet();
  const { accountType } = useAccountType();
  const { transitRouteProgress, paxosTransitOrder, isPaxosTransitOrderStatusUnknown, startTransitRouteProgress } =
    useSyntheticsEvents();
  const sdk = useGmxSdk(chainId);

  const [isWhitelistIgnoredSetting] = useLocalStorageSerializeKey(DEBUG_PAXOS_TRANSIT_IGNORE_WHITELIST_KEY, false);
  const [isMockedSetting] = useLocalStorageSerializeKey(DEBUG_PAXOS_TRANSIT_MOCK_KEY, false);
  const [thresholdUsdInput] = useLocalStorageSerializeKey(DEBUG_PAXOS_TRANSIT_THRESHOLD_USD_KEY, "");
  const [isStandardForcedSetting] = useLocalStorageSerializeKey(DEBUG_PAXOS_TRANSIT_FORCE_STANDARD_KEY, false);
  const isWhitelistIgnored = showDebugValues && Boolean(isWhitelistIgnoredSetting);
  const isStandardForced = showDebugValues && Boolean(isStandardForcedSetting);
  const isMocked = showDebugValues && Boolean(isMockedSetting);
  const thresholdUsdOverride =
    showDebugValues && thresholdUsdInput ? parseValue(thresholdUsdInput, USD_DECIMALS) : undefined;

  const [preference, setPreference] = useState<TradeboxSwapRoutePreference>("auto");
  const [step, setStep] = useState<PaxosSubmitStep>("idle");

  const paxosTransitConfig = getPaxosTransitConfig(chainId);
  const api: TransitApi | undefined = isMocked ? mockTransitApi : sdk;
  const isPaxosPair = direction !== undefined && paxosTransitConfig !== undefined && api !== undefined;
  const isActive = isPaxosPair && account !== undefined && fromToken !== undefined && toToken !== undefined;
  const isByPay = focusedInput === "from";
  const tokenInAddress = fromToken?.address;
  const tokenOutAddress = toToken?.address;

  const debouncedAmount: bigint = useDebounce(fromTokenAmount, AMOUNT_DEBOUNCE_MS);
  const isAmountSettled = debouncedAmount === fromTokenAmount;

  const {
    data: feeTierData,
    error: feeTierError,
    mutate: refreshFeeTier,
  } = useSWR(
    isActive ? ["tradeboxPaxosFeeTier", chainId, account, isMocked] : null,
    () => api!.fetchTransitFeeTier({ userAddress: account! }),
    { refreshInterval: FEE_TIER_REFRESH_INTERVAL, onErrorRetry: retryAtRefreshCadence }
  );
  const isWhitelisted = feeTierData?.feeTier === "zeroFee" && !isWhitelistIgnored;

  const minOrderSizes = useTransitMinOrderSizes({
    api,
    chainId,
    offerAsset: tokenInAddress,
    wantAsset: tokenOutAddress,
    isActive,
    isZeroFeeEligible: isWhitelisted,
  });

  const amountInUsd =
    (fromToken ? convertToUsd(fromTokenAmount, fromToken.decimals, getMidPrice(fromToken.prices)) : undefined) ?? 0n;
  const thresholdUsd = thresholdUsdOverride ?? paxosTransitConfig?.thresholdUsd ?? 0n;
  const isPaxosAvailable = isActive && isByPay && !feeTierError;

  const quotedRouteStates = getPaxosRouteStates({
    isWhitelisted,
    isStandardForced,
    isUsdcToUsdg: direction === "usdcToUsdg",
    amountIn: isPaxosAvailable ? fromTokenAmount : 0n,
    amountInUsd,
    thresholdUsd,
    zeroFeeCapacity: feeTierData?.zeroFeeCapacity,
    zeroFeeMinOrderSize: minOrderSizes.zeroFee,
    standardMinOrderSize: minOrderSizes.standardFee,
  });

  const getQuoteParams = useCallback(
    (offerAmount: bigint, feeTier: TransitFeeTier): TransitQuoteParams => ({
      userAddress: account!,
      offerAsset: tokenInAddress!,
      wantAsset: tokenOutAddress!,
      offerAmount,
      sourceChainId: chainId,
      destinationChainId: chainId,
      feeTier,
    }),
    [account, chainId, tokenInAddress, tokenOutAddress]
  );

  const quoteRequest = {
    api,
    isActive: isPaxosAvailable && feeTierData !== undefined && isAmountSettled && step === "idle",
    paxosRouteStates: quotedRouteStates,
    chainId,
    account,
    tokenInAddress,
    tokenOutAddress,
    amount: fromTokenAmount,
    isMocked,
    getQuoteParams,
  };
  const zeroFeeQuoteResult = useTradeboxPaxosQuote({ ...quoteRequest, route: "paxosZeroFee" });
  const standardQuoteResult = useTradeboxPaxosQuote({ ...quoteRequest, route: "paxosStandard" });
  const zeroFeeQuote = zeroFeeQuoteResult.data;
  const standardQuote = standardQuoteResult.data;

  const zeroFeeQuoteErrorStatus =
    zeroFeeQuoteResult.error instanceof HttpError ? zeroFeeQuoteResult.error.statusCode : undefined;
  const isZeroFeeAccessChanged = zeroFeeQuoteErrorStatus === 403 || zeroFeeQuoteErrorStatus === 409;

  useEffect(
    function refreshFeeTierAfterZeroFeeRejection() {
      if (isZeroFeeAccessChanged) {
        refreshFeeTier();
      }
    },
    [isZeroFeeAccessChanged, refreshFeeTier]
  );

  const minSavingAmount =
    toToken && paxosTransitConfig
      ? convertToTokenAmount(paxosTransitConfig.autoMinSavingUsd, toToken.decimals, toToken.prices.maxPrice) ?? 0n
      : 0n;

  const progressForAccount =
    transitRouteProgress?.account === account && transitRouteProgress?.chainId === chainId
      ? transitRouteProgress
      : undefined;
  const isConversionStatusUnknown =
    progressForAccount?.glvOrMarketAddress === undefined &&
    paxosTransitOrder === undefined &&
    isPaxosTransitOrderStatusUnknown;
  const isConversionInProgress =
    progressForAccount?.conversion !== undefined &&
    !getIsTransitOrderFinal(paxosTransitOrder) &&
    !isConversionStatusUnknown;

  const { paxosRouteStates, routes, buttonState } = getTradeboxPaxosDecision({
    isPaxosAvailable,
    isWhitelisted,
    isStandardForced,
    isUsdcToUsdg: direction === "usdcToUsdg",
    amountIn: fromTokenAmount,
    amountInUsd,
    thresholdUsd,
    zeroFeeCapacity: feeTierData?.zeroFeeCapacity,
    zeroFeeMinOrderSize: minOrderSizes.zeroFee,
    standardMinOrderSize: minOrderSizes.standardFee,
    zeroFee: {
      quote: zeroFeeQuote,
      isError: zeroFeeQuoteResult.error !== undefined,
      errorStatus: zeroFeeQuoteErrorStatus,
    },
    standard: { quote: standardQuote, isError: standardQuoteResult.error !== undefined },
    instantAmountOut,
    isInstantLoading,
    zeroFeeEstimatedAmountOut:
      fromToken && toToken ? adjustForDecimals(fromTokenAmount, fromToken.decimals, toToken.decimals) : 0n,
    minSavingAmount,
    preference,
    walletBalance: fromToken?.walletBalance,
    tokenIn: { symbol: fromToken?.symbol ?? "", decimals: fromToken?.decimals ?? 0 },
    isAmountSettled,
    isConversionInProgress,
    step,
  });

  useEffect(
    function resetPreferenceForNewPair() {
      setPreference("auto");
    },
    [tokenInAddress, tokenOutAddress]
  );

  useEffect(
    function resetPreferenceWhenPaxosIsNotOffered() {
      if (!routes.isPaxosOffered && preference !== "auto") {
        setPreference("auto");
      }
    },
    [preference, routes.isPaxosOffered]
  );

  const activeRoute = routes.activeRoute;
  const activePaxosRoute = activeRoute === "instant" ? undefined : activeRoute;
  const activePaxosQuote: TransitQuote | undefined =
    activePaxosRoute === "paxosZeroFee"
      ? zeroFeeQuote
      : activePaxosRoute === "paxosStandard"
        ? standardQuote
        : undefined;
  const activeOption = routes.options.find((option) => option.route === activeRoute);

  const pendingConversion = useMemo(() => {
    if (
      !isConversionInProgress ||
      !progressForAccount ||
      !paxosTransitOrder ||
      paxosTransitOrder.remainingAmountDue <= 0n ||
      !paxosTransitConfig ||
      progressForAccount.glvOrMarketAddress !== undefined
    ) {
      return undefined;
    }

    const wantTokenAddress =
      progressForAccount.direction === "usdcToUsdg" ? paxosTransitConfig.usdgAddress : paxosTransitConfig.usdcAddress;

    return { tokenAddress: wantTokenAddress, amount: paxosTransitOrder.remainingAmountDue };
  }, [isConversionInProgress, paxosTransitConfig, paxosTransitOrder, progressForAccount]);

  const onSubmit = useCallback(async () => {
    if (!activePaxosRoute || !activePaxosQuote || !api || !signer || !account || !direction || !fromToken || !toToken) {
      return;
    }

    const shownQuote = activePaxosQuote;

    try {
      const conversion = await submitTransitOrder({
        api,
        chainId,
        signer,
        account,
        params: getQuoteParams(fromTokenAmount, PAXOS_ROUTE_FEE_TIERS[activePaxosRoute]),
        isMocked,
        onStep: setStep,
        validateSubmitQuote: (quote) => {
          if (getIsPaxosQuoteWorseThanShown({ shownQuote, quote, tokenIn: fromToken, tokenOut: toToken })) {
            throw new PaxosQuoteChangedError();
          }
        },
      });

      startTransitRouteProgress({
        chainId,
        account,
        direction,
        glvOrMarketAddress: undefined,
        withdrawalTxnHash: undefined,
        conversion,
      });
      setFromTokenInputValue("", true);
    } catch (error) {
      if (error instanceof PaxosQuoteChangedError) {
        helperToast.error(t`The Paxos quote changed. Review the new amount and fee, then confirm again.`);
      } else if (error instanceof HttpError && (error.statusCode === 403 || error.statusCode === 409)) {
        refreshFeeTier();
        helperToast.error(t`Zero-fee capacity changed. Review the route options and confirm again.`);
      } else {
        helperToast.error(t`Conversion failed: ${(error as Error).message}`);
      }
    } finally {
      setStep("idle");
    }
  }, [
    account,
    activePaxosQuote,
    activePaxosRoute,
    api,
    chainId,
    direction,
    fromToken,
    fromTokenAmount,
    getQuoteParams,
    isMocked,
    refreshFeeTier,
    setFromTokenInputValue,
    signer,
    startTransitRouteProgress,
    toToken,
  ]);

  const zeroFeeState = paxosRouteStates.paxosZeroFee;
  const isZeroFeeCapacityShort = zeroFeeState.status === "capacityShort";
  const zeroFeeCapacity = zeroFeeState.status === "capacityShort" ? zeroFeeState.capacity : undefined;

  const onReduceToZeroFeeCapacity = useCallback(() => {
    if (zeroFeeCapacity === undefined || !fromToken) {
      return;
    }

    setFocusedInput("from");
    setFromTokenInputValue(formatAmountFree(zeroFeeCapacity, fromToken.decimals), true);
    setPreference("auto");
  }, [fromToken, setFocusedInput, setFromTokenInputValue, zeroFeeCapacity]);

  const onUsePayAmount = useCallback(() => setFocusedInput("from"), [setFocusedInput]);

  return {
    direction,
    isActive,
    isWhitelisted,
    isByPay,
    isSmartWallet: accountType === AccountType.SmartAccount,
    routes,
    paxosRouteStates,
    preference,
    setPreference,
    activeRoute,
    activePaxosRoute,
    activeOption,
    instantAmountOut,
    minSavingUsd: paxosTransitConfig?.autoMinSavingUsd,
    zeroFeeAvailableCapacity: isWhitelisted && direction === "usdcToUsdg" ? feeTierData?.zeroFeeCapacity : undefined,
    isZeroFeeCapacityShort,
    zeroFeeCapacityShortBy: zeroFeeCapacity !== undefined ? fromTokenAmount - zeroFeeCapacity : undefined,
    zeroFeeCapacity,
    isPayAmountHintShown:
      isActive &&
      !isByPay &&
      fromTokenAmount > 0n &&
      feeTierData !== undefined &&
      (isWhitelisted || amountInUsd >= thresholdUsd),
    buttonState: isActive && buttonState ? { ...buttonState, onSubmit } : undefined,
    pendingConversion,
    onReduceToZeroFeeCapacity,
    onUsePayAmount,
  };
}

function useTradeboxPaxosQuote(p: {
  api: TransitApi | undefined;
  isActive: boolean;
  route: PaxosSwapRoute;
  paxosRouteStates: Record<PaxosSwapRoute, PaxosRouteState>;
  chainId: number;
  account: string | undefined;
  tokenInAddress: string | undefined;
  tokenOutAddress: string | undefined;
  amount: bigint;
  isMocked: boolean;
  getQuoteParams: (offerAmount: bigint, feeTier: TransitFeeTier) => TransitQuoteParams;
}) {
  const isNeeded = p.isActive && p.paxosRouteStates[p.route].status === "quote";

  return useSWR(
    isNeeded
      ? [
          "tradeboxPaxosQuote",
          p.route,
          p.chainId,
          p.account,
          p.tokenInAddress,
          p.tokenOutAddress,
          p.amount.toString(),
          p.isMocked,
        ]
      : null,
    () => p.api!.fetchTransitQuote(p.getQuoteParams(p.amount, PAXOS_ROUTE_FEE_TIERS[p.route])),
    { refreshInterval: QUOTE_REFRESH_INTERVAL, onErrorRetry: retryAtRefreshCadence }
  );
}
