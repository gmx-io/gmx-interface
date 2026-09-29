import { t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";

import { getPaxosTransitConfig } from "config/paxosTransit";
import {
  selectPoolsDetailsFirstTokenAmount,
  selectPoolsDetailsFlags,
  selectPoolsDetailsGlvOrMarketAddress,
  selectPoolsDetailsGlvOrMarketInfo,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsConversionRoutePreference,
  selectPoolsDetailsSetFirstTokenAddress,
  selectPoolsDetailsSetFirstTokenInputValue,
  selectPoolsDetailsSetFocusedInput,
  selectPoolsDetailsSetIsTransitRoute,
  selectPoolsDetailsSetMarketOrGlvTokenInputValue,
  selectPoolsDetailsSetConversionRoutePreference,
  selectPoolsDetailsSetTransitAmountOut,
  selectPoolsDetailsShortTokenAddress,
} from "context/PoolsDetailsContext/selectors";
import {
  selectPoolsDetailsAvailableCollateralSwapToken,
  selectPoolsDetailsCollateralSwapTokens,
} from "context/PoolsDetailsContext/selectors/poolsDetailsDerivedSelectors";
import {
  selectDepositWithdrawalAmounts,
  selectPoolsDetailsCollateralSwapTotalFeesDeltaUsd,
} from "context/PoolsDetailsContext/selectors/selectDepositWithdrawalAmounts";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { selectChainId, selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getGlvOrMarketAddress } from "domain/synthetics/markets";
import { getReceivedTokenAmount } from "domain/synthetics/paxosTransit/getReceivedTokenAmount";
import { getIsTransitOrderFinal } from "domain/synthetics/paxosTransit/transitOrders";
import {
  getTransitRouteProgressForMarket,
  type TransitRouteDirection,
} from "domain/synthetics/paxosTransit/transitRouteProgress";
import { usePaxosTransit } from "domain/synthetics/paxosTransit/usePaxosTransit";
import type { TokenData } from "domain/synthetics/tokens";
import type { ERC20Address } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import { formatAmountFree } from "lib/numbers";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { getToken } from "sdk/configs/tokens";
import type { TransitOrder, TransitQuote } from "sdk/utils/paxos/types";

import type { ConversionRoute } from "./types";
import type { SubmitButtonState } from "./useGmSwapSubmitState";

export type PaxosTransitState = ReturnType<typeof usePaxosTransitState>;

export function usePaxosTransitState({
  isWhitelistIgnored,
  isMocked,
  shouldDisableValidation,
}: {
  isWhitelistIgnored: boolean;
  isMocked: boolean;
  shouldDisableValidation: boolean;
}) {
  const chainId = useSelector(selectChainId);
  const { isDeposit, isWithdrawal } = useSelector(selectPoolsDetailsFlags);
  const longTokenAddress = useSelector(selectPoolsDetailsLongTokenAddress);
  const shortTokenAddress = useSelector(selectPoolsDetailsShortTokenAddress);
  const firstTokenAmount = useSelector(selectPoolsDetailsFirstTokenAmount);
  const amounts = useSelector(selectDepositWithdrawalAmounts);
  const setFirstTokenAddress = useSelector(selectPoolsDetailsSetFirstTokenAddress);
  const setFirstTokenInputValue = useSelector(selectPoolsDetailsSetFirstTokenInputValue);
  const setMarketOrGlvTokenInputValue = useSelector(selectPoolsDetailsSetMarketOrGlvTokenInputValue);
  const setFocusedInput = useSelector(selectPoolsDetailsSetFocusedInput);
  const setIsTransitRoute = useSelector(selectPoolsDetailsSetIsTransitRoute);
  const setTransitAmountOut = useSelector(selectPoolsDetailsSetTransitAmountOut);
  const usdcToken = useSelector(selectPoolsDetailsAvailableCollateralSwapToken);
  const collateralSwapTokens = useSelector(selectPoolsDetailsCollateralSwapTokens);
  const glvOrMarketAddress = useSelector(selectPoolsDetailsGlvOrMarketAddress);
  const glvOrMarketInfo = useSelector(selectPoolsDetailsGlvOrMarketInfo);
  const tokensData = useSelector(selectTokensData);
  const collateralSwapTotalFeesDeltaUsd = useSelector(selectPoolsDetailsCollateralSwapTotalFeesDeltaUsd);
  const conversionRoutePreference = useSelector(selectPoolsDetailsConversionRoutePreference);
  const setConversionRoutePreference = useSelector(selectPoolsDetailsSetConversionRoutePreference);
  const { account } = useWallet();
  const {
    withdrawalStatuses,
    transitRouteProgress,
    paxosTransitOrder,
    isPaxosTransitOrderStatusUnknown,
    startTransitRouteProgress,
    attachTransitRouteConversion,
  } = useSyntheticsEvents();

  const convertedOrderIdRef = useRef<string | undefined>(undefined);

  const paxosTransitConfig = getPaxosTransitConfig(chainId);
  const usdgToken = getByKey(tokensData, paxosTransitConfig?.usdgAddress);
  const isUsdcConversionOffered = usdcToken !== undefined;
  const isConversionNeeded = collateralSwapTokens !== undefined;
  const [tokenIn, tokenOut] = isDeposit ? [usdcToken, usdgToken] : [usdgToken, usdcToken];

  const direction: TransitRouteDirection = isDeposit ? "usdcToUsdg" : "usdgToUsdc";
  const transitRouteProgressForMarket = getTransitRouteProgressForMarket(transitRouteProgress, {
    account,
    glvOrMarketAddress,
  });
  const transitRouteProgressForDirection =
    transitRouteProgressForMarket?.direction === direction ? transitRouteProgressForMarket : undefined;
  const conversionOrder = transitRouteProgressForDirection?.conversion ? paxosTransitOrder : undefined;
  const isConversionFinal = getIsTransitOrderFinal(conversionOrder);
  const isConverting = transitRouteProgressForDirection?.conversion !== undefined && !isConversionFinal;

  const withdrawalUsdgAmount = isWithdrawal && amounts ? amounts.longTokenAmount + amounts.shortTokenAmount : 0n;

  const withdrawalTxnHash =
    isWithdrawal && !isConversionFinal ? transitRouteProgressForDirection?.withdrawalTxnHash : undefined;
  const withdrawalStatus =
    withdrawalTxnHash === undefined
      ? undefined
      : Object.values(withdrawalStatuses).find((status) => status.createdTxnHash === withdrawalTxnHash);
  const executedTxnHash = withdrawalStatus?.executedTxnHash;

  const { data: receivedUsdg } = useSWR(
    executedTxnHash && account && paxosTransitConfig
      ? ["paxosTransitReceivedUsdg", chainId, executedTxnHash, account]
      : null,
    () =>
      getReceivedTokenAmount({
        chainId,
        txnHash: executedTxnHash!,
        tokenAddress: paxosTransitConfig!.usdgAddress,
        account: account!,
      }),
    { refreshInterval: 0, revalidateOnFocus: false, revalidateOnReconnect: false, revalidateIfStale: false }
  );
  const isWithdrawalSettled = receivedUsdg !== undefined && receivedUsdg > 0n;
  const isNoUsdgReceived = receivedUsdg === 0n || withdrawalStatus?.cancelledTxnHash !== undefined;
  const withdrawalStatusWithUsdg = isNoUsdgReceived ? undefined : withdrawalStatus;
  const isWithdrawalSent = withdrawalTxnHash !== undefined && !isNoUsdgReceived;

  let amountIn = 0n;

  if (withdrawalStatusWithUsdg?.data) {
    amountIn =
      receivedUsdg ??
      withdrawalStatusWithUsdg.data.minLongTokenAmount + withdrawalStatusWithUsdg.data.minShortTokenAmount;
  } else if (isConversionNeeded) {
    amountIn = isDeposit ? firstTokenAmount : withdrawalUsdgAmount;
  }

  const onPendingOrderFound = useCallback(
    (order: TransitOrder) => {
      if (!glvOrMarketInfo || !account || transitRouteProgress?.conversion?.orderId === order.id) return;

      startTransitRouteProgress({
        chainId,
        account,
        direction,
        glvOrMarketInfo,
        withdrawalTxnHash: undefined,
        conversion: { orderId: order.id, txnHash: undefined, offerAmount: order.offerAmount, isMocked },
      });
    },
    [account, chainId, direction, glvOrMarketInfo, isMocked, transitRouteProgress, startTransitRouteProgress]
  );

  const transit = usePaxosTransit({
    chainId,
    tokenIn,
    tokenOut,
    amount: amountIn,
    collateralSwapTotalFeesDeltaUsd,
    isTransitRequired: isWithdrawalSettled,
    isAmountEstimated: isWithdrawal && !withdrawalStatusWithUsdg?.data,
    isWhitelistIgnored,
    isMocked,
    enabled: isUsdcConversionOffered,
    onPendingOrderFound,
  });

  const {
    step,
    quote,
    quoteError,
    isBelowMinOrderSize,
    minOrderSize,
    shouldUseTransit,
    isLargeConversion,
    isWhitelisted,
    isQuoteNeeded,
    isFeeTierLoaded,
    feeTierError,
    submitTransit,
    amountOut,
    thresholdUsd,
    isZeroFeeCapacityShort,
    zeroFeeCapacity,
    transitFeesUsd,
  } = transit;

  const isTransitAvailable = !feeTierError;
  const isFeeTierLoading = account !== undefined && !isFeeTierLoaded;
  const isQuoteLoading = isQuoteNeeded && !quote && !quoteError;
  const isTransitLoading = isTransitAvailable && (isFeeTierLoading || isQuoteLoading);

  const isTransitInProgress = step !== "idle" || isConverting || withdrawalStatusWithUsdg !== undefined;
  const hasAmountIn = amountIn > 0n;
  const canPoolFill = collateralSwapTotalFeesDeltaUsd !== undefined;
  const isRouteSelectable = isWhitelisted && !isTransitInProgress && hasAmountIn && quote !== undefined && canPoolFill;

  const isTransitAutoRoute = shouldUseTransit || isTransitLoading || !canPoolFill;
  const autoRoute: ConversionRoute = isTransitAvailable && isTransitAutoRoute ? "transit" : "pool";
  const isPreferenceApplied = isRouteSelectable && conversionRoutePreference !== "auto";
  const conversionRoute = isPreferenceApplied ? conversionRoutePreference : autoRoute;

  const isTransitRouteChosen = isConversionNeeded && hasAmountIn && conversionRoute === "transit";
  const isTransitRoute = isTransitInProgress || isTransitRouteChosen;

  const shouldShowRouteSelector = isConversionNeeded && isFeeTierLoaded;
  const shouldShowWhitelistNote = shouldShowRouteSelector && !isWhitelisted && isLargeConversion;

  const transitAmountOut = isTransitRoute ? amountOut : undefined;

  useEffect(
    function syncTransitRoute() {
      setIsTransitRoute(isTransitRoute);
      setTransitAmountOut(transitAmountOut);
    },
    [isTransitRoute, setIsTransitRoute, setTransitAmountOut, transitAmountOut]
  );

  const onConvert = useCallback(() => {
    submitTransit()
      .then((conversion) => {
        if (!conversion || !glvOrMarketInfo || !account) return;

        if (
          transitRouteProgressForDirection?.withdrawalTxnHash &&
          transitRouteProgressForDirection.conversion === undefined
        ) {
          attachTransitRouteConversion(transitRouteProgressForDirection.id, conversion);
          return;
        }

        startTransitRouteProgress({
          chainId,
          account,
          direction,
          glvOrMarketInfo,
          withdrawalTxnHash: undefined,
          conversion,
        });
      })
      .catch((error: Error) => {
        helperToast.error(t`Conversion failed: ${error.message}`);
      });
  }, [
    account,
    attachTransitRouteConversion,
    chainId,
    direction,
    glvOrMarketInfo,
    startTransitRouteProgress,
    submitTransit,
    transitRouteProgressForDirection,
  ]);

  const fillUsdgPayInput = useCallback(
    (amountDue: bigint | undefined) => {
      if (!paxosTransitConfig) return;

      const usdg = getToken(chainId, paxosTransitConfig.usdgAddress);

      setFirstTokenAddress(paxosTransitConfig.usdgAddress as ERC20Address);

      if (amountDue !== undefined) {
        setFirstTokenInputValue(formatAmountFree(amountDue, usdg.decimals));
      }

      setFocusedInput("first");
    },
    [chainId, paxosTransitConfig, setFirstTokenAddress, setFirstTokenInputValue, setFocusedInput]
  );

  useEffect(
    function applyConvertedOrder() {
      if (
        conversionOrder?.status !== "PROCESSED" ||
        convertedOrderIdRef.current === conversionOrder.id ||
        !paxosTransitConfig
      ) {
        return;
      }

      convertedOrderIdRef.current = conversionOrder.id;

      if (isWithdrawal) {
        setMarketOrGlvTokenInputValue("");
        setFirstTokenInputValue("");
        helperToast.success(t`USDC received.`);
        return;
      }

      const usdg = getToken(chainId, paxosTransitConfig.usdgAddress);

      setFirstTokenAddress(paxosTransitConfig.usdgAddress as ERC20Address);
      setFirstTokenInputValue(formatAmountFree(conversionOrder.amountDue, usdg.decimals));
      setFocusedInput("first");
      helperToast.success(t`USDG received. You can now buy with it.`);
    },
    [
      conversionOrder,
      isWithdrawal,
      paxosTransitConfig,
      setFirstTokenInputValue,
      setMarketOrGlvTokenInputValue,
    ]
  );

  const submitState = useMemo((): SubmitButtonState | undefined => {
    if (!account || !isTransitRoute) {
      return undefined;
    }

    const tokenInSymbol = tokenIn?.symbol;
    const tokenOutSymbol = tokenOut?.symbol;

    if (step === "approving") return { text: t`Approving ${tokenInSymbol}...`, disabled: true };
    if (step === "submitting") return { text: t`Sending conversion...`, disabled: true };

    if (isConverting) {
      if (isPaxosTransitOrderStatusUnknown) return { text: t`Conversion status unavailable`, disabled: true };
      if (!conversionOrder) return { text: t`Confirming conversion...`, disabled: true };
      return { text: t`Converting ${tokenInSymbol} to ${tokenOutSymbol}...`, disabled: true };
    }

    const conversionError = getTransitConversionError({
      isDeposit,
      tokenIn,
      amountIn,
      feeTierError,
      isBelowMinOrderSize,
      minOrderSize,
      quote,
      quoteError,
      isTransitLoading,
    });

    if (isWithdrawal && !withdrawalStatusWithUsdg) {
      if (isWithdrawalSent || shouldDisableValidation) return undefined;
      if (conversionError) return { text: conversionError, disabled: true };
      if (isTransitLoading) return { text: t`Loading...`, disabled: true };
      return undefined;
    }

    if (isWithdrawal && !isWithdrawalSettled) {
      return { text: t`Waiting for ${tokenInSymbol}...`, disabled: true };
    }

    if (conversionError) {
      return { text: conversionError, disabled: !shouldDisableValidation, onSubmit: onConvert };
    }

    if (isTransitLoading) {
      return { text: t`Loading...`, disabled: true };
    }

    return { text: t`Convert ${tokenInSymbol} to ${tokenOutSymbol}`, onSubmit: onConvert };
  }, [
    account,
    amountIn,
    feeTierError,
    isDeposit,
    isWithdrawalSent,
    isWithdrawalSettled,
    isTransitLoading,
    isTransitRoute,
    isWithdrawal,
    onConvert,
    isConverting,
    isPaxosTransitOrderStatusUnknown,
    conversionOrder,
    isBelowMinOrderSize,
    minOrderSize,
    quote,
    quoteError,
    shouldDisableValidation,
    withdrawalStatusWithUsdg,
    step,
    tokenIn,
    tokenOut,
  ]);

  const usdgStepAmount = isDeposit ? quote?.amountOut : amountIn;
  const hasUsdgCollateral =
    paxosTransitConfig !== undefined &&
    (longTokenAddress === paxosTransitConfig.usdgAddress || shortTokenAddress === paxosTransitConfig.usdgAddress);

  return {
    submitState,
    isTransitRoute,
    shouldShowRouteSelector,
    isRouteSelectable,
    conversionRoutePreference,
    setConversionRoutePreference,
    shouldShowWhitelistNote,
    hasUsdgCollateral,
    tokenIn,
    usdgToken,
    usdgStepAmount,
    ...transit,
  };
}

function getTransitConversionError(p: {
  isDeposit: boolean;
  tokenIn: TokenData | undefined;
  amountIn: bigint;
  feeTierError: Error | undefined;
  isBelowMinOrderSize: boolean;
  minOrderSize: bigint | undefined;
  quote: TransitQuote | undefined;
  quoteError: Error | undefined;
  isTransitLoading: boolean;
}): string | undefined {
  const tokenInSymbol = p.tokenIn?.symbol;

  if (p.isDeposit && p.tokenIn?.walletBalance !== undefined && p.tokenIn.walletBalance < p.amountIn) {
    return t`Insufficient ${tokenInSymbol} balance`;
  }

  if (p.feeTierError) {
    return t`${tokenInSymbol} conversion is unavailable`;
  }

  if (p.isBelowMinOrderSize && p.minOrderSize !== undefined && p.tokenIn) {
    return t`Minimum conversion is ${formatAmountFree(p.minOrderSize, p.tokenIn.decimals)} ${tokenInSymbol}`;
  }

  if (p.quoteError) {
    return p.quoteError.message;
  }

  if (!p.quote && !p.isTransitLoading) {
    return t`${tokenInSymbol} conversion is unavailable`;
  }

  return undefined;
}
