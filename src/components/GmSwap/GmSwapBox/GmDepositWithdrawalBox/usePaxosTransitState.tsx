import { t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

import { getPaxosTransitConfig } from "config/paxosTransit";
import {
  selectPoolsDetailsFirstTokenAmount,
  selectPoolsDetailsFlags,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsSetFirstTokenAddress,
  selectPoolsDetailsSetFirstTokenInputValue,
  selectPoolsDetailsSetFocusedInput,
  selectPoolsDetailsSetIsTransitRoute,
  selectPoolsDetailsSetMarketOrGlvTokenInputValue,
  selectPoolsDetailsSetTransitAmountOut,
  selectPoolsDetailsShortTokenAddress,
} from "context/PoolsDetailsContext/selectors";
import {
  selectPoolsDetailsAvailableCollateralSwapToken,
  selectPoolsDetailsCollateralSwapTokens,
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsMarketInfo,
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
import { getIsTransitOrderFinal } from "domain/synthetics/paxosTransit/transitRouteProgress";
import { usePaxosTransit } from "domain/synthetics/paxosTransit/usePaxosTransit";
import { findTransitWithdrawalStatus } from "domain/synthetics/paxosTransit/utils";
import type { ERC20Address } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import { formatAmountFree } from "lib/numbers";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { getToken } from "sdk/configs/tokens";
import type { TransitOrder } from "sdk/utils/paxos/types";

import type { SubmitButtonState } from "./useGmSwapSubmitState";

export type PaxosTransitState = ReturnType<typeof usePaxosTransitState>;

export function usePaxosTransitState(isWhitelistIgnored: boolean) {
  const chainId = useSelector(selectChainId);
  const { account } = useWallet();
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
  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);
  const marketInfo = useSelector(selectPoolsDetailsMarketInfo);
  const tokensData = useSelector(selectTokensData);
  const collateralSwapTotalFeesDeltaUsd = useSelector(selectPoolsDetailsCollateralSwapTotalFeesDeltaUsd);
  const { withdrawalStatuses, transitRouteProgress, paxosTransitOrder, startTransitRouteProgress } =
    useSyntheticsEvents();

  const [convertedWithdrawalKeys, setConvertedWithdrawalKeys] = useState<string[]>([]);
  const convertedOrderIdRef = useRef<string | undefined>(undefined);

  const paxosTransitConfig = getPaxosTransitConfig(chainId);
  const usdgToken = getByKey(tokensData, paxosTransitConfig?.usdgAddress);
  const isUsdcConversionOffered = usdcToken !== undefined;
  const isConversionNeeded = collateralSwapTokens !== undefined;
  const [tokenIn, tokenOut] = isDeposit ? [usdcToken, usdgToken] : [usdgToken, usdcToken];
  const poolAddress = glvInfo ? glvInfo.glvToken.address : marketInfo?.marketTokenAddress;
  const glvOrMarketInfo = glvInfo ?? marketInfo;

  const transitRouteProgressForDirection =
    transitRouteProgress?.direction === (isDeposit ? "buy" : "sell") &&
    poolAddress !== undefined &&
    getGlvOrMarketAddress(transitRouteProgress.marketInfo) === poolAddress
      ? transitRouteProgress
      : undefined;
  const conversionOrder = transitRouteProgressForDirection?.conversion ? paxosTransitOrder : undefined;
  const isConverting = transitRouteProgressForDirection?.conversion !== undefined && !getIsTransitOrderFinal(conversionOrder);

  const withdrawalUsdgAmount = isWithdrawal && amounts ? amounts.longTokenAmount + amounts.shortTokenAmount : 0n;

  const withdrawalStatus = useMemo(
    () =>
      isWithdrawal
        ? findTransitWithdrawalStatus(withdrawalStatuses, { account, poolAddress, convertedWithdrawalKeys })
        : undefined,
    [account, convertedWithdrawalKeys, isWithdrawal, poolAddress, withdrawalStatuses]
  );
  const withdrawalKey = withdrawalStatus?.key;
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
  const isWithdrawalEmpty = executedTxnHash !== undefined && (receivedUsdg === 0n || tokenIn?.walletBalance === 0n);

  let amountIn = 0n;

  if (withdrawalStatus?.data) {
    amountIn = receivedUsdg ?? withdrawalStatus.data.minLongTokenAmount + withdrawalStatus.data.minShortTokenAmount;
  } else if (isConversionNeeded) {
    amountIn = isDeposit ? firstTokenAmount : withdrawalUsdgAmount;
  }

  const onPendingOrderFound = useCallback(
    (order: TransitOrder) => {
      if (!glvOrMarketInfo || transitRouteProgress?.conversion?.orderId === order.id) return;

      startTransitRouteProgress({
        chainId,
        direction: isDeposit ? "buy" : "sell",
        marketInfo: glvOrMarketInfo,
        conversion: { orderId: order.id, txnHash: undefined, offerAmount: order.offerAmount },
      });
    },
    [chainId, glvOrMarketInfo, isDeposit, transitRouteProgress, startTransitRouteProgress]
  );

  const transit = usePaxosTransit({
    chainId,
    tokenIn,
    tokenOut,
    amount: amountIn,
    collateralSwapTotalFeesDeltaUsd,
    isTransitRequired: isWithdrawalSettled,
    isWhitelistIgnored,
    enabled: isUsdcConversionOffered,
    onPendingOrderFound,
  });

  const {
    step,
    quote,
    quoteError,
    shouldUseTransit,
    isQuoteNeeded,
    isFeeTierLoaded,
    feeTierError,
    submitTransit,
    amountOut,
  } = transit;
  const isTransitInProgress = step !== "idle" || isConverting || withdrawalStatus !== undefined;
  const isTransitLoading = !feeTierError && (!isFeeTierLoaded || (isQuoteNeeded && !quote && !quoteError));

  const isTransitRoute =
    isTransitInProgress ||
    (isConversionNeeded &&
      amountIn > 0n &&
      (shouldUseTransit || isTransitLoading || collateralSwapTotalFeesDeltaUsd === undefined));

  const transitAmountOut = isTransitRoute ? amountOut : undefined;

  useEffect(
    function dropEmptyWithdrawal() {
      if (isWithdrawalEmpty && withdrawalKey) {
        setConvertedWithdrawalKeys((keys) => [...keys, withdrawalKey]);
      }
    },
    [isWithdrawalEmpty, withdrawalKey]
  );

  useEffect(
    function syncTransitRoute() {
      setIsTransitRoute(isTransitRoute);
      setTransitAmountOut(transitAmountOut);
    },
    [isTransitRoute, setIsTransitRoute, setTransitAmountOut, transitAmountOut]
  );

  const onConvert = useCallback(() => {
    submitTransit()
      .then((submission) => {
        if (!submission || !glvOrMarketInfo) return;

        startTransitRouteProgress({
          chainId,
          direction: isDeposit ? "buy" : "sell",
          marketInfo: glvOrMarketInfo,
          conversion: submission,
        });
      })
      .catch((error: Error) => {
        helperToast.error(t`Conversion failed: ${error.message}`);
      });
  }, [chainId, glvOrMarketInfo, isDeposit, startTransitRouteProgress, submitTransit]);

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
        if (withdrawalKey) {
          setConvertedWithdrawalKeys((keys) => [...keys, withdrawalKey]);
        }

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
      withdrawalKey,
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
      return conversionOrder
        ? { text: t`Converting ${tokenInSymbol} to ${tokenOutSymbol}...`, disabled: true }
        : { text: t`Confirming conversion...`, disabled: true };
    }

    if (isWithdrawal && !withdrawalStatus) {
      return undefined;
    }

    if (isWithdrawal && !isWithdrawalSettled) {
      return { text: t`Waiting for ${tokenInSymbol}...`, disabled: true };
    }

    if (isDeposit && tokenIn?.walletBalance !== undefined && tokenIn.walletBalance < amountIn) {
      return { text: t`Insufficient ${tokenInSymbol} balance`, disabled: true };
    }

    if (feeTierError) {
      return { text: t`${tokenInSymbol} conversion is unavailable`, disabled: true };
    }

    if (quoteError) {
      return { text: quoteError.message, disabled: true };
    }

    if (!shouldUseTransit) {
      return isTransitLoading
        ? { text: t`Loading...`, disabled: true }
        : { text: t`${tokenInSymbol} conversion is unavailable`, disabled: true };
    }

    return { text: t`Convert ${tokenInSymbol} to ${tokenOutSymbol}`, onSubmit: onConvert };
  }, [
    account,
    amountIn,
    feeTierError,
    isDeposit,
    isWithdrawalSettled,
    isTransitLoading,
    isTransitRoute,
    shouldUseTransit,
    isWithdrawal,
    onConvert,
    isConverting,
    conversionOrder,
    quoteError,
    withdrawalStatus,
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
    hasUsdgCollateral,
    tokenIn,
    usdgToken,
    usdgStepAmount,
    ...transit,
  };
}
