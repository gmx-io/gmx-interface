import { t, Trans } from "@lingui/macro";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import { useLatest } from "react-use";

import { getChainName } from "config/chains";
import { getContract } from "config/contracts";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useSavedAllowedSlippage } from "context/SyntheticsStateContext/hooks/settingsHooks";
import {
  selectBlockTimestampData,
  selectChainId,
  selectGasLimits,
  selectGasPrice,
  selectTokensData,
  selectUserReferralInfo,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxCollateralTokenAddress,
  selectTradeboxFormState,
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
  selectTradeboxMarketAddress,
  selectTradeboxLeverageOption,
  selectTradeboxTradeFlags,
  selectTradeboxTradeMode,
  selectTradeboxTradeType,
  selectTradeboxTriggerPriceInputValue,
  selectTradeboxTwapDuration,
  selectTradeboxTwapNumberOfParts,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import {
  selectTradeboxIsUsdgConversionTooLarge,
  selectTradeboxIsUsdgConvertFirst,
  selectTradeboxUsdgConvertFirstSwapAmounts,
  selectTradeboxUsdgMaxInstantAmount,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors/tradeboxUsdgConversionSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useExpressOrdersParams } from "domain/synthetics/express/useRelayerFeeHandler";
import { getExpressParamsForSubmit } from "domain/synthetics/express/validateMultichainExpressSubmit";
import { estimateExecuteSwapOrderGasLimit, estimateOrderOraclePriceCount } from "domain/synthetics/fees";
import { OrderType } from "domain/synthetics/orders";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import { getReceivedTokenAmount } from "domain/synthetics/paxosTransit/getReceivedTokenAmount";
import { useIsSwapTabPaxosOffered } from "domain/synthetics/paxosTransit/useIsSwapTabPaxosOffered";
import { convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import { formatMaxInstantAmount } from "domain/synthetics/usdgPools/usdcConversion";
import { getApproveButtonText } from "domain/tokens/gasPaymentTokenApproval";
import { useTokenApproval } from "domain/tokens/useTokenApproval";
import { helperToast } from "lib/helperToast";
import { formatAmountFree } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { TxnEventName } from "lib/transactions";
import useWallet from "lib/wallets/useWallet";
import { getToken } from "sdk/configs/tokens";
import { StatusCode } from "sdk/utils/express";
import { getExecutionFee } from "sdk/utils/fees/executionFee";
import { BatchOrderTxnParams, buildSwapOrderPayload } from "sdk/utils/orderTransactions";
import { TradeMode } from "sdk/utils/trade/types";

import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";

import SpinnerIcon from "img/ic_spinner.svg?react";

type ConversionStep = "idle" | "submitting" | "converting";

// a fallback for a missed execution event; known failures release the button right away
const CONVERSION_TIMEOUT_MS = 3 * 60 * 1000;
// covers loading the order's network fees and signing an approval; after it the trader uses the regular button
const ORDER_AUTO_SUBMIT_TIMEOUT_MS = 2 * 60 * 1000;

type ButtonStateOverride = {
  text: ReactNode;
  disabled: boolean;
  onSubmit: () => Promise<void>;
};

export type TradeboxUsdgConversion = ReturnType<typeof useTradeboxUsdgConversion>;

/**
 * USDG pools take only USDG: a USDC margin converts inside market orders, but limit, stop market and TWAP orders
 * would convert only at trigger and freeze if our pool is short then, so they convert first.
 * A pool swap needs a keeper, so it can't share a transaction with the order: once it executes, the order is
 * submitted for a second signature.
 */
export function useTradeboxUsdgConversion({
  canSwitchGasPaymentToken,
  setFromTokenInputValue,
  setFocusedInput,
}: {
  canSwitchGasPaymentToken: boolean;
  setFromTokenInputValue: (value: string, resetPriceImpactAndSwapSlippage?: boolean) => void;
  setFocusedInput: (input: "from" | "to") => void;
}) {
  const history = useHistory();
  const chainId = useSelector(selectChainId);
  const tokensData = useSelector(selectTokensData);
  const gasLimits = useSelector(selectGasLimits);
  const gasPrice = useSelector(selectGasPrice);
  const blockTimestampData = useSelector(selectBlockTimestampData);
  const userReferralInfo = useSelector(selectUserReferralInfo);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const tradeMode = useSelector(selectTradeboxTradeMode);
  const tradeType = useSelector(selectTradeboxTradeType);
  const leverageOption = useSelector(selectTradeboxLeverageOption);
  const triggerPriceInputValue = useSelector(selectTradeboxTriggerPriceInputValue);
  const twapDuration = useSelector(selectTradeboxTwapDuration);
  const twapNumberOfParts = useSelector(selectTradeboxTwapNumberOfParts);
  const marketAddress = useSelector(selectTradeboxMarketAddress);
  const collateralTokenAddress = useSelector(selectTradeboxCollateralTokenAddress);
  const fromToken = useSelector(selectTradeboxFromToken);
  const fromTokenAmount = useSelector(selectTradeboxFromTokenAmount);
  const isTooLarge = useSelector(selectTradeboxIsUsdgConversionTooLarge);
  const maxInstantAmount = useSelector(selectTradeboxUsdgMaxInstantAmount);
  const isConvertFirst = useSelector(selectTradeboxIsUsdgConvertFirst) && !isTooLarge;
  const conversionSwapAmounts = useSelector(selectTradeboxUsdgConvertFirstSwapAmounts);
  const { isFromTokenGmxAccount, setFromTokenAddress } = useSelector(selectTradeboxFormState);
  const allowedSlippage = useSavedAllowedSlippage();
  const { shouldDisableValidationForTesting } = useSettings();
  const { account, signer } = useWallet();
  const { provider } = useJsonRpcProvider(chainId);
  const { makeOrderTxnCallback } = useOrderTxnCallbacks();
  const { orderStatuses, relayTaskStatuses } = useSyntheticsEvents();

  const usdgToken = collateralTokenAddress ? tokensData?.[collateralTokenAddress] : undefined;
  const usdcAddress = fromToken?.address;

  const executionFee = useMemo(() => {
    const swapsCount = conversionSwapAmounts?.swapStrategy.swapPathStats?.swapPath.length;

    if (!gasLimits || gasPrice === undefined || !tokensData || swapsCount === undefined) {
      return undefined;
    }

    const estimatedGas = estimateExecuteSwapOrderGasLimit(gasLimits, { swapsCount, callbackGasLimit: 0n });

    return getExecutionFee(
      chainId,
      gasLimits,
      tokensData,
      estimatedGas,
      gasPrice,
      estimateOrderOraclePriceCount(swapsCount)
    );
  }, [chainId, conversionSwapAmounts, gasLimits, gasPrice, tokensData]);

  const batchParams: BatchOrderTxnParams | undefined = useMemo(() => {
    const swapPath = conversionSwapAmounts?.swapStrategy.swapPathStats?.swapPath;

    if (
      !isConvertFirst ||
      !account ||
      !conversionSwapAmounts ||
      !swapPath ||
      !executionFee ||
      !usdcAddress ||
      !collateralTokenAddress
    ) {
      return undefined;
    }

    return {
      createOrderParams: [
        buildSwapOrderPayload({
          chainId,
          receiver: account,
          executionFeeAmount: executionFee.feeTokenAmount,
          executionGasLimit: executionFee.gasLimit,
          referralCode: userReferralInfo?.referralCodeForTxn,
          uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT,
          payTokenAddress: usdcAddress,
          payTokenAmount: conversionSwapAmounts.amountIn,
          receiveTokenAddress: collateralTokenAddress,
          minOutputAmount: conversionSwapAmounts.minOutputAmount,
          expectedOutputAmount: conversionSwapAmounts.amountOut,
          swapPath,
          triggerRatio: undefined,
          externalSwapQuote: undefined,
          allowedSlippage,
          orderType: OrderType.MarketSwap,
          autoCancel: false,
          validFromTime: 0n,
        }),
      ],
      updateOrderParams: [],
      cancelOrderParams: [],
    };
  }, [
    account,
    allowedSlippage,
    chainId,
    collateralTokenAddress,
    conversionSwapAmounts,
    executionFee,
    isConvertFirst,
    usdcAddress,
    userReferralInfo?.referralCodeForTxn,
  ]);

  const {
    expressParams,
    expressParamsPromise,
    isLoading: isExpressLoading,
    isMultichainSubmitDisabled,
  } = useExpressOrdersParams({
    label: "USDG conversion",
    orderParams: batchParams,
    isGmxAccount: isFromTokenGmxAccount,
    canSwitchGasPaymentToken,
  });

  const approvalTokens = useMemo(() => {
    const list: { tokenAddress: string; amount: bigint | undefined }[] = [];

    if (isConvertFirst && usdcAddress && fromTokenAmount !== undefined) {
      list.push({ tokenAddress: usdcAddress, amount: fromTokenAmount });
    }

    if (expressParams?.gasPaymentParams) {
      list.push({
        tokenAddress: expressParams.gasPaymentParams.gasPaymentTokenAddress,
        amount: expressParams.gasPaymentParams.gasPaymentTokenAmount,
      });
    }

    return list;
  }, [expressParams?.gasPaymentParams, fromTokenAmount, isConvertFirst, usdcAddress]);

  const { tokensToApprove, isAllowanceLoaded, isApproving, handleApprove } = useTokenApproval({
    chainId,
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokens: approvalTokens,
    allowPermit: Boolean(expressParams),
    skip: isFromTokenGmxAccount || !isConvertFirst,
    metric: {
      flow: "trade",
      isExpress: Boolean(expressParams),
      isExpress1CT: Boolean(expressParams?.subaccount),
      gasPaymentTokenAddress: expressParams?.gasPaymentParams?.gasPaymentTokenAddress,
      payTokenAddress: usdcAddress,
    },
  });

  const [step, setStep] = useState<ConversionStep>("idle");
  // the order the trader set up when converting; the auto submit only sends that one
  const orderSetupKey = JSON.stringify([
    tradeType,
    tradeMode,
    marketAddress,
    collateralTokenAddress,
    leverageOption,
    triggerPriceInputValue,
    twapDuration,
    twapNumberOfParts,
  ]);
  const [orderAutoSubmitArm, setOrderAutoSubmitArm] = useState<{ setupKey: string; armedAt: number }>();
  const latestMarketAddress = useLatest(marketAddress);
  const [relayTaskId, setRelayTaskId] = useState<string>();
  const [lastConversion, setLastConversion] = useState<{ marketAddress: string | undefined; amountOut: bigint }>();
  const pendingConversionRef = useRef<{
    knownOrderStatusKeys: Set<string>;
    marketAddress: string | undefined;
    tokenInAddress: string;
    tokenOutAddress: string;
    tokenOutDecimals: number;
    minAmountOut: bigint;
    swapPath: string[];
    orderSetupKey: string;
  }>();

  // bumped on every reset, so a receipt that lands after a reset is ignored
  const conversionGenerationRef = useRef(0);

  const resetConversion = useCallback(() => {
    conversionGenerationRef.current += 1;
    pendingConversionRef.current = undefined;
    setRelayTaskId(undefined);
    setStep("idle");
  }, []);

  const onConvert = useCallback(async () => {
    if (isAllowanceLoaded && tokensToApprove.length > 0) {
      if (!isApproving) {
        handleApprove();
      }

      return;
    }

    if (!batchParams || !signer || !provider || !tokensData || !conversionSwapAmounts || !usdcAddress || !usdgToken) {
      helperToast.error(t`Conversion failed`);
      return;
    }

    setStep("submitting");

    try {
      const fulfilledExpressParams = await expressParamsPromise;

      pendingConversionRef.current = {
        knownOrderStatusKeys: new Set(Object.keys(orderStatuses)),
        marketAddress,
        tokenInAddress: usdcAddress,
        tokenOutAddress: usdgToken.address,
        tokenOutDecimals: usdgToken.decimals,
        minAmountOut: batchParams.createOrderParams[0].orderPayload.numbers.minOutputAmount,
        swapPath: conversionSwapAmounts.swapStrategy.swapPathStats?.swapPath ?? [],
        orderSetupKey,
      };

      const orderTxnCallback = makeOrderTxnCallback({ actionName: "Swap", collateralSymbol: fromToken?.symbol });

      const pending = pendingConversionRef.current;
      const result = await sendBatchOrderTxn({
        chainId,
        signer,
        provider,
        batchParams,
        isGmxAccount: isFromTokenGmxAccount,
        expressParams: getExpressParamsForSubmit(fulfilledExpressParams),
        simulationParams: shouldDisableValidationForTesting ? undefined : { tokensData, blockTimestampData },
        callback: (event) => {
          orderTxnCallback(event);

          if (event.event === TxnEventName.Sent && event.data.type !== "wallet") {
            setRelayTaskId(event.data.relayTaskId);
          }

          if (event.event === TxnEventName.Error) {
            resetConversion();
          }
        },
      });

      if (pendingConversionRef.current === pending) {
        setStep("converting");

        // a wallet transaction that reverts on chain never creates the order, so its receipt releases the button
        if (result && "wait" in result) {
          result
            .wait()
            .then(({ status }) => {
              if (status === "failed" && pendingConversionRef.current === pending) {
                resetConversion();
              }
            })
            .catch(() => undefined);
        }
      }
    } catch {
      resetConversion();
    }
  }, [
    batchParams,
    blockTimestampData,
    chainId,
    conversionSwapAmounts,
    expressParamsPromise,
    fromToken?.symbol,
    handleApprove,
    isAllowanceLoaded,
    isApproving,
    isFromTokenGmxAccount,
    makeOrderTxnCallback,
    marketAddress,
    orderSetupKey,
    orderStatuses,
    provider,
    resetConversion,
    shouldDisableValidationForTesting,
    signer,
    tokensData,
    tokensToApprove.length,
    usdcAddress,
    usdgToken,
  ]);

  const relayTaskStatusCode = relayTaskId ? relayTaskStatuses[relayTaskId]?.statusCode : undefined;

  useEffect(
    function releaseFailedRelay() {
      if (relayTaskStatusCode === StatusCode.Rejected || relayTaskStatusCode === StatusCode.Reverted) {
        resetConversion();
      }
    },
    [relayTaskStatusCode, resetConversion]
  );

  useEffect(
    function applyExecutedConversion() {
      const pending = pendingConversionRef.current;

      if (step !== "converting" || !pending || !account) {
        return;
      }

      const orderStatus = Object.values(orderStatuses).find(
        (status) =>
          !pending.knownOrderStatusKeys.has(status.key) &&
          status.data?.orderType === OrderType.MarketSwap &&
          status.data.account === account &&
          status.data.initialCollateralTokenAddress === pending.tokenInAddress &&
          status.data.swapPath.join() === pending.swapPath.join()
      );

      if (orderStatus?.cancelledTxnHash) {
        resetConversion();
        return;
      }

      const executedTxnHash = orderStatus?.executedTxnHash;

      if (!executedTxnHash) {
        return;
      }

      pendingConversionRef.current = undefined;

      // the USDG stays in the account either way; the margin only follows it on the market it was converted for
      if (marketAddress !== pending.marketAddress) {
        resetConversion();
        return;
      }

      const generation = conversionGenerationRef.current;

      // GMX Account payouts land in the multichain vault, so the order's guaranteed minimum stands in for the transfer
      getReceivedTokenAmount({ chainId, txnHash: executedTxnHash, tokenAddress: pending.tokenOutAddress, account })
        .catch(() => 0n)
        .then((receivedAmount) => {
          if (generation !== conversionGenerationRef.current) {
            return;
          }

          // the trader can switch markets while the receipt loads
          if (latestMarketAddress.current !== pending.marketAddress) {
            resetConversion();
            return;
          }

          const amountOut = receivedAmount > 0n ? receivedAmount : pending.minAmountOut;

          setFromTokenAddress(pending.tokenOutAddress);
          setFocusedInput("from");
          setFromTokenInputValue(formatAmountFree(amountOut, pending.tokenOutDecimals), true);
          setLastConversion({ marketAddress: pending.marketAddress, amountOut });
          setOrderAutoSubmitArm({ setupKey: pending.orderSetupKey, armedAt: Date.now() });
          resetConversion();
        });
    },
    [
      account,
      chainId,
      latestMarketAddress,
      marketAddress,
      orderStatuses,
      resetConversion,
      setFocusedInput,
      setFromTokenAddress,
      setFromTokenInputValue,
      step,
    ]
  );

  useEffect(
    function releaseConversionOnAccountOrChainSwitch() {
      // the executed swap is matched by account and chain, so after a switch it would only clear on the timeout
      resetConversion();
      setOrderAutoSubmitArm(undefined);
    },
    [account, chainId, resetConversion]
  );

  useEffect(
    function releaseStuckConversion() {
      if (step !== "converting") {
        return;
      }

      const timerId = setTimeout(resetConversion, CONVERSION_TIMEOUT_MS);

      return () => clearTimeout(timerId);
    },
    [resetConversion, step]
  );

  const onUseMaxInstant = useCallback(() => {
    if (maxInstantAmount === undefined || !fromToken) return;

    setFocusedInput("from");
    setFromTokenInputValue(formatAmountFree(maxInstantAmount, fromToken.decimals), true);
  }, [fromToken, maxInstantAmount, setFocusedInput, setFromTokenInputValue]);

  const onConvertWithPaxos = useCallback(() => {
    if (!fromToken || !usdgToken || fromTokenAmount === undefined) return;

    history.push(
      `/trade/swap?mode=market&from=${fromToken.symbol}&to=${usdgToken.symbol}&amount=${formatAmountFree(
        fromTokenAmount,
        fromToken.decimals
      )}`
    );
  }, [fromToken, fromTokenAmount, history, usdgToken]);

  const maxInstantText =
    maxInstantAmount !== undefined && fromToken ? formatMaxInstantAmount(fromToken, maxInstantAmount) : undefined;
  const fromTokenUsd =
    isTooLarge && fromToken && fromTokenAmount !== undefined
      ? convertToUsd(fromTokenAmount, fromToken.decimals, getMidPrice(fromToken.prices))
      : undefined;
  const {
    isOffered: isPaxosOffered,
    minimumText: paxosMinimumText,
    isWalletOnly: isPaxosWalletOnly,
  } = useIsSwapTabPaxosOffered({
    amount: fromTokenAmount,
    amountUsd: fromTokenUsd,
    isGmxAccount: isFromTokenGmxAccount,
    enabled: isTooLarge,
  });
  const settlementChainName = getChainName(chainId);
  let paxosHint: ReactNode = null;

  if (isPaxosWalletOnly) {
    paxosHint = (
      <div className="mt-4">
        <Trans>Paxos converts USDC from your wallet on {settlementChainName}.</Trans>
      </div>
    );
  } else if (!isPaxosOffered && paxosMinimumText) {
    paxosHint = (
      <div className="mt-4">
        <Trans>Paxos converts amounts from {paxosMinimumText}.</Trans>
      </div>
    );
  }

  let tooLargeAlert: ReactNode = undefined;

  if (isTooLarge && maxInstantAmount !== undefined && maxInstantAmount > 0n && isPaxosOffered) {
    tooLargeAlert = (
      <Trans>
        Up to {maxInstantText} can be converted instantly.{" "}
        <EmbeddedActionButton tone="link" onClick={onUseMaxInstant}>
          Use max instant
        </EmbeddedActionButton>
        , or{" "}
        <EmbeddedActionButton tone="link" onClick={onConvertWithPaxos}>
          convert with Paxos first
        </EmbeddedActionButton>{" "}
        in the Swap tab: a one-time conversion, 2 to 10 min or longer. Trades paid in USDG need no conversion.
      </Trans>
    );
  } else if (isTooLarge && maxInstantAmount !== undefined && maxInstantAmount > 0n) {
    tooLargeAlert = (
      <>
        <Trans>
          Up to {maxInstantText} can be converted instantly.{" "}
          <EmbeddedActionButton tone="link" onClick={onUseMaxInstant}>
            Use max instant
          </EmbeddedActionButton>
          . Trades paid in USDG need no conversion.
        </Trans>
        {paxosHint}
      </>
    );
  } else if (isTooLarge && maxInstantAmount !== undefined && isPaxosOffered) {
    tooLargeAlert = (
      <Trans>
        Nothing can be converted instantly right now.{" "}
        <EmbeddedActionButton tone="link" onClick={onConvertWithPaxos}>
          Convert with Paxos first
        </EmbeddedActionButton>{" "}
        in the Swap tab: a one-time conversion, 2 to 10 min or longer. Trades paid in USDG need no conversion.
      </Trans>
    );
  } else if (isTooLarge && maxInstantAmount !== undefined) {
    tooLargeAlert = (
      <>
        <Trans>Nothing can be converted instantly right now. Trades paid in USDG need no conversion.</Trans>
        {paxosHint}
      </>
    );
  }

  let convertFirstNote: ReactNode = undefined;

  if (isConvertFirst) {
    if (tradeFlags.isTwap) {
      convertFirstNote = (
        <Trans>On USDG pools, TWAP orders hold USDG. Your USDC converts first, then you sign the order.</Trans>
      );
    } else if (tradeMode === TradeMode.StopMarket) {
      convertFirstNote = (
        <Trans>On USDG pools, Stop Market orders hold USDG. Your USDC converts first, then you sign the order.</Trans>
      );
    } else {
      convertFirstNote = (
        <Trans>On USDG pools, Limit orders hold USDG. Your USDC converts first, then you sign the order.</Trans>
      );
    }
  }

  const isBusy = step !== "idle" || isApproving;

  const buttonState = useMemo((): ButtonStateOverride | undefined => {
    if (!account || (!isConvertFirst && !isBusy)) {
      return undefined;
    }

    const approveButtonText =
      tokensToApprove.length > 0
        ? getApproveButtonText({
            tokenSymbol: getToken(chainId, tokensToApprove[0]).symbol,
            isGasPaymentToken: tokensToApprove[0] !== usdcAddress,
          })
        : undefined;

    if (isBusy) {
      return {
        text: (
          <>
            {isApproving ? approveButtonText ?? t`Approving USDC...` : t`Converting USDC to USDG...`}
            <SpinnerIcon className="ml-4 animate-spin" />
          </>
        ),
        disabled: true,
        onSubmit: async () => undefined,
      };
    }

    if (isAllowanceLoaded && approveButtonText !== undefined) {
      return {
        text: approveButtonText,
        disabled: false,
        onSubmit: onConvert,
      };
    }

    return {
      text: t`Convert and place order`,
      disabled: !batchParams || !isAllowanceLoaded || isExpressLoading || isMultichainSubmitDisabled,
      onSubmit: onConvert,
    };
  }, [
    account,
    batchParams,
    chainId,
    isAllowanceLoaded,
    isApproving,
    isBusy,
    isConvertFirst,
    isExpressLoading,
    isMultichainSubmitDisabled,
    onConvert,
    tokensToApprove,
    usdcAddress,
  ]);

  // only while the margin still is the converted amount on the same market
  const isConvertedMarginInPlace =
    lastConversion !== undefined &&
    fromToken?.address === collateralTokenAddress &&
    lastConversion.marketAddress === marketAddress &&
    fromTokenAmount === lastConversion.amountOut;

  const orderAutoSubmitArmedAt = orderAutoSubmitArm?.armedAt;
  const isOrderAutoSubmitArmed = orderAutoSubmitArmedAt !== undefined;
  const isOrderAutoSubmitPending =
    isOrderAutoSubmitArmed && isConvertedMarginInPlace && orderAutoSubmitArm?.setupKey === orderSetupKey;
  const stopOrderAutoSubmit = useCallback(() => setOrderAutoSubmitArm(undefined), []);

  const landedArmedAtRef = useRef<number>();

  useEffect(
    function disarmOrderAutoSubmit() {
      if (orderAutoSubmitArmedAt === undefined) {
        return;
      }

      // the pay token switches a render after the arm, so only a change after the margin landed disarms
      if (isOrderAutoSubmitPending) {
        landedArmedAtRef.current = orderAutoSubmitArmedAt;
      } else if (landedArmedAtRef.current === orderAutoSubmitArmedAt) {
        stopOrderAutoSubmit();
      }
    },
    [isOrderAutoSubmitPending, orderAutoSubmitArmedAt, stopOrderAutoSubmit]
  );

  useEffect(
    function expireOrderAutoSubmit() {
      if (orderAutoSubmitArmedAt === undefined) {
        return;
      }

      const timerId = setTimeout(stopOrderAutoSubmit, ORDER_AUTO_SUBMIT_TIMEOUT_MS);

      return () => clearTimeout(timerId);
    },
    [orderAutoSubmitArmedAt, stopOrderAutoSubmit]
  );

  return {
    isConvertFirst,
    isBusy,
    isOrderAutoSubmitArmed,
    isOrderAutoSubmitPending,
    stopOrderAutoSubmit,
    buttonState,
    expressParams,
    isExpressLoading,
    executionFee,
    tooLargeAlert,
    convertFirstNote,
  };
}
