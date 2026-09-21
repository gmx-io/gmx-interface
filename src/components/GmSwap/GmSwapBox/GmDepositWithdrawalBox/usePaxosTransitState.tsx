import { t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  selectPoolsDetailsTransitSwapFeesUsd,
} from "context/PoolsDetailsContext/selectors/selectDepositWithdrawalAmounts";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { selectChainId, selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getReceivedTokenAmount } from "domain/synthetics/paxosTransit/getReceivedTokenAmount";
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
  const swapFeesUsd = useSelector(selectPoolsDetailsTransitSwapFeesUsd);
  const { withdrawalStatuses } = useSyntheticsEvents();

  const [convertedWithdrawalKeys, setConvertedWithdrawalKeys] = useState<string[]>([]);

  const paxosTransitConfig = getPaxosTransitConfig(chainId);
  const usdgToken = getByKey(tokensData, paxosTransitConfig?.usdgAddress);
  const isUsdgPool = usdcToken !== undefined;
  const isConversionNeeded = collateralSwapTokens !== undefined;
  const [tokenIn, tokenOut] = isDeposit ? [usdcToken, usdgToken] : [usdgToken, usdcToken];
  const poolAddress = glvInfo ? glvInfo.glvToken.address : marketInfo?.marketTokenAddress;

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
  const isWithdrawalEmpty = executedTxnHash !== undefined && (receivedUsdg === 0n || tokenIn?.walletBalance === 0n);

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
      withdrawalKey,
    ]
  );

  const transit = usePaxosTransit({
    chainId,
    tokenIn,
    tokenOut,
    amount: amountIn,
    swapFeesUsd,
    isTransitRequired: isWithdrawalSettled,
    isWhitelistIgnored,
    enabled: isUsdgPool,
    onFulfilled,
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
  const isTransitInProgress = step !== "idle" || withdrawalStatus !== undefined;
  const isTransitLoading = !feeTierError && (!isFeeTierLoaded || (isQuoteNeeded && !quote && !quoteError));

  const isTransitRoute =
    isTransitInProgress ||
    (isConversionNeeded && amountIn > 0n && (shouldUseTransit || isTransitLoading || swapFeesUsd === undefined));

  const transitAmountOut = isDeposit && isTransitRoute ? amountOut : undefined;

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
    if (step === "converting") return { text: t`Converting ${tokenInSymbol} to ${tokenOutSymbol}...`, disabled: true };

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
