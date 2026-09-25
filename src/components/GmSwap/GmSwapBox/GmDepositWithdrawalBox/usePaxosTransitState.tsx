import { t } from "@lingui/macro";
import { useCallback, useEffect, useMemo } from "react";
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
  selectPoolsDetailsSetTransitWithdrawalTxnHash,
  selectPoolsDetailsTransitWithdrawalTxnHash,
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
import { getReceivedTokenAmount } from "domain/synthetics/paxosTransit/getReceivedTokenAmount";
import { usePaxosTransit } from "domain/synthetics/paxosTransit/usePaxosTransit";
import type { TokenData } from "domain/synthetics/tokens";
import type { ERC20Address } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import { formatAmountFree } from "lib/numbers";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { getToken } from "sdk/configs/tokens";
import type { TransitOrder } from "sdk/utils/paxos/types";

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
  const tokensData = useSelector(selectTokensData);
  const transitWithdrawalTxnHash = useSelector(selectPoolsDetailsTransitWithdrawalTxnHash);
  const setTransitWithdrawalTxnHash = useSelector(selectPoolsDetailsSetTransitWithdrawalTxnHash);
  const collateralSwapTotalFeesDeltaUsd = useSelector(selectPoolsDetailsCollateralSwapTotalFeesDeltaUsd);
  const { withdrawalStatuses } = useSyntheticsEvents();

  const paxosTransitConfig = getPaxosTransitConfig(chainId);
  const usdgToken = getByKey(tokensData, paxosTransitConfig?.usdgAddress);
  const isUsdgPool = usdcToken !== undefined;
  const isConversionNeeded = collateralSwapTokens !== undefined;
  const [tokenIn, tokenOut] = isDeposit ? [usdcToken, usdgToken] : [usdgToken, usdcToken];

  const withdrawalUsdgAmount = isWithdrawal && amounts ? amounts.longTokenAmount + amounts.shortTokenAmount : 0n;

  const withdrawalStatus =
    transitWithdrawalTxnHash === undefined
      ? undefined
      : Object.values(withdrawalStatuses).find((status) => status.createdTxnHash === transitWithdrawalTxnHash);
  const executedTxnHash = withdrawalStatus?.executedTxnHash;

  const { data: receivedUsdg } = useSWR(
    executedTxnHash && account && paxosTransitConfig
      ? ["paxosTransitWithdrawalProceeds", chainId, executedTxnHash, account]
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
  const isWithdrawalWithoutPayout =
    transitWithdrawalTxnHash !== undefined && (receivedUsdg === 0n || withdrawalStatus?.cancelledTxnHash !== undefined);

  let amountIn = 0n;

  if (withdrawalStatus?.data) {
    amountIn = receivedUsdg ?? withdrawalStatus.data.minLongTokenAmount + withdrawalStatus.data.minShortTokenAmount;
  } else if (isConversionNeeded) {
    amountIn = isDeposit ? firstTokenAmount : withdrawalUsdgAmount;
  }

  const onFulfilled = useCallback(
    (order: TransitOrder) => {
      if (!paxosTransitConfig) return;

      if (isWithdrawal) {
        setTransitWithdrawalTxnHash(undefined);
        setMarketOrGlvTokenInputValue("");
        setFirstTokenInputValue("");
        helperToast.success(t`USDC received.`);
        return;
      }

      const usdg = getToken(chainId, paxosTransitConfig.usdgAddress);

      setFirstTokenAddress(paxosTransitConfig.usdgAddress as ERC20Address);
      setFirstTokenInputValue(formatAmountFree(order.amountDue, usdg.decimals));
      setFocusedInput("first");
      helperToast.success(t`USDG received. You can now buy with it.`);
    },
    [
      chainId,
      paxosTransitConfig,
      isWithdrawal,
      setFirstTokenAddress,
      setFirstTokenInputValue,
      setFocusedInput,
      setMarketOrGlvTokenInputValue,
      setTransitWithdrawalTxnHash,
    ]
  );

  const transit = usePaxosTransit({
    chainId,
    tokenIn,
    tokenOut,
    amount: amountIn,
    collateralSwapTotalFeesDeltaUsd,
    isTransitRequired: isWithdrawalSettled,
    isWhitelistIgnored,
    isMocked,
    enabled: isUsdgPool,
    onFulfilled,
  });

  const {
    step,
    quote,
    quoteError,
    isBelowMinOrderSize,
    minOrderSize,
    isOrderStatusUnknown,
    shouldUseTransit,
    isQuoteNeeded,
    isFeeTierLoaded,
    feeTierError,
    submitTransit,
    amountOut,
  } = transit;
  const isTransitLoading = !feeTierError && (!isFeeTierLoaded || (isQuoteNeeded && !quote && !quoteError));
  const isTransitOffered =
    isConversionNeeded && (shouldUseTransit || isTransitLoading || collateralSwapTotalFeesDeltaUsd === undefined);

  const isTransitRoute =
    step !== "idle" || transitWithdrawalTxnHash !== undefined || (isTransitOffered && amountIn > 0n);

  const transitAmountOut = isDeposit && isTransitRoute ? amountOut : undefined;

  useEffect(
    function dropWithdrawalWithoutPayout() {
      if (isWithdrawalWithoutPayout) {
        setTransitWithdrawalTxnHash(undefined);
      }
    },
    [isWithdrawalWithoutPayout, setTransitWithdrawalTxnHash]
  );

  useEffect(
    function syncTransitRoute() {
      setIsTransitRoute(isTransitRoute);
      setTransitAmountOut(transitAmountOut);
    },
    [isTransitRoute, setIsTransitRoute, setTransitAmountOut, transitAmountOut]
  );

  const onConvert = useCallback(() => {
    submitTransit().catch((error: Error) => {
      helperToast.error(t`Conversion failed: ${error.message}`);
    });
  }, [submitTransit]);

  const submitState = useMemo((): SubmitButtonState | undefined => {
    if (!account || !isTransitRoute) {
      return undefined;
    }

    const tokenInSymbol = tokenIn?.symbol;
    const tokenOutSymbol = tokenOut?.symbol;

    if (step === "approving") return { text: t`Approving ${tokenInSymbol}...`, disabled: true };
    if (step === "submitting") return { text: t`Sending conversion...`, disabled: true };
    if (step === "locating") return { text: t`Confirming conversion...`, disabled: true };
    if (step === "converting") {
      return isOrderStatusUnknown
        ? { text: t`Conversion status unavailable`, disabled: true }
        : { text: t`Converting ${tokenInSymbol} to ${tokenOutSymbol}...`, disabled: true };
    }

    if (isWithdrawal && !withdrawalStatus) {
      return undefined;
    }

    if (isWithdrawal && !isWithdrawalSettled) {
      return { text: t`Waiting for ${tokenInSymbol}...`, disabled: true };
    }

    const conversionError = getTransitConversionError({
      isDeposit,
      tokenIn,
      amountIn,
      feeTierError,
      isBelowMinOrderSize,
      minOrderSize,
      quoteError,
      shouldUseTransit,
      isTransitLoading,
    });

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
    isTransitLoading,
    isTransitRoute,
    shouldUseTransit,
    isWithdrawal,
    onConvert,
    isOrderStatusUnknown,
    isBelowMinOrderSize,
    minOrderSize,
    quoteError,
    isWithdrawalSettled,
    shouldDisableValidation,
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

function getTransitConversionError(p: {
  isDeposit: boolean;
  tokenIn: TokenData | undefined;
  amountIn: bigint;
  feeTierError: Error | undefined;
  isBelowMinOrderSize: boolean;
  minOrderSize: bigint | undefined;
  quoteError: Error | undefined;
  shouldUseTransit: boolean;
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

  if (!p.shouldUseTransit && !p.isTransitLoading) {
    return t`${tokenInSymbol} conversion is unavailable`;
  }

  return undefined;
}
