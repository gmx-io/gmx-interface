import { t, Trans } from "@lingui/macro";
import { ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { useHistory } from "react-router-dom";
import { useLatest } from "react-use";

import { getChainName } from "config/chains";
import { getContract } from "config/contracts";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
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
  selectExternalSwapBlockReason,
  selectExternalSwapIsLoading,
  selectTradeboxCollateralTokenAddress,
  selectTradeboxFormState,
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxIsTPSLEnabled,
  selectTradeboxLeverageStrategy,
  selectTradeboxMarketAddress,
  selectTradeboxLeverageOption,
  selectTradeboxToToken,
  selectTradeboxToTokenInputValue,
  selectTradeboxTradeFlags,
  selectTradeboxTradeMode,
  selectTradeboxTradeType,
  selectTradeboxTriggerPriceInputValue,
  selectTradeboxTwapDuration,
  selectTradeboxTwapNumberOfParts,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { makeSelectTradeboxSidecarOrdersState } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxSidecarOrders";
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
import { convertToUsd, getBalanceByBalanceType, getMidPrice, TokenBalanceType } from "domain/synthetics/tokens";
import {
  type ConfirmedUsdgOrder,
  getConvertedOrderStatus,
  getConvertedSizeFit,
  getTpSlSetupKey,
} from "domain/synthetics/usdgPools/orderAutoSubmit";
import { formatMaxInstantAmount } from "domain/synthetics/usdgPools/usdcConversion";
import { getApproveButtonText } from "domain/tokens/gasPaymentTokenApproval";
import { useTokenApproval } from "domain/tokens/useTokenApproval";
import { helperToast } from "lib/helperToast";
import { formatAmountFree } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import { TxnEventName } from "lib/transactions";
import useWallet from "lib/wallets/useWallet";
import { getToken } from "sdk/configs/tokens";
import { StatusCode } from "sdk/utils/express";
import { getExecutionFee } from "sdk/utils/fees/executionFee";
import { BatchOrderTxnParams, buildSwapOrderPayload } from "sdk/utils/orderTransactions";
import { TradeMode } from "sdk/utils/trade/types";

import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";
import { TOKEN_INPUT_DISPLAY_DECIMALS } from "components/TradeboxMarginFields/useSizeConversion";

import SpinnerIcon from "img/ic_spinner.svg?react";

import {
  getUsdgConversionSession,
  IDLE_USDG_CONVERSION_STEP,
  type PendingUsdgConversion,
  updateUsdgConversionSession,
  useUsdgConversionSession,
} from "./usdgConversionSession";

// a fallback for a missed execution event; known failures release the button right away
const CONVERSION_TIMEOUT_MS = 3 * 60 * 1000;
// covers loading the order's network fees and signing an approval; after it the trader uses the regular button
const ORDER_AUTO_SUBMIT_TIMEOUT_MS = 2 * 60 * 1000;
const BALANCE_WAIT_TIMEOUT_MS = 30 * 1000;

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
  setToTokenInputValue,
  setFocusedInput,
}: {
  canSwitchGasPaymentToken: boolean;
  setFromTokenInputValue: (value: string, resetPriceImpactAndSwapSlippage?: boolean) => void;
  setToTokenInputValue: (value: string, resetPriceImpactAndSwapSlippage: boolean) => void;
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
  const toToken = useSelector(selectTradeboxToToken);
  const toTokenInputValue = useSelector(selectTradeboxToTokenInputValue);
  const leverageStrategy = useSelector(selectTradeboxLeverageStrategy);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const isTpSlEnabled = useSelector(selectTradeboxIsTPSLEnabled);
  const [tpEntries] = useSelector(makeSelectTradeboxSidecarOrdersState("tp"));
  const [slEntries] = useSelector(makeSelectTradeboxSidecarOrdersState("sl"));
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

  const conversionSession = useUsdgConversionSession();
  const {
    step,
    convertingSince,
    relayTaskId,
    pending: pendingConversion,
    lastConversion,
    orderAutoSubmitArm,
  } = conversionSession;
  // the order the trader set up when converting; the auto submit only sends that one
  const orderSetupKey = JSON.stringify([
    tradeType,
    tradeMode,
    marketAddress,
    collateralTokenAddress,
    leverageOption,
    leverageStrategy,
    triggerPriceInputValue,
    twapDuration,
    twapNumberOfParts,
    tradeFlags.isTwap ? undefined : String(increaseAmounts?.acceptablePrice),
    isTpSlEnabled ? getTpSlSetupKey([...tpEntries, ...slEntries]) : undefined,
  ]);
  const latestMarketAddress = useLatest(marketAddress);
  const latestOrderSetupKey = useLatest(orderSetupKey);
  const latestToTokenInputValue = useLatest(toTokenInputValue);

  const resetConversion = useCallback(() => {
    updateUsdgConversionSession((current) => ({
      ...current,
      ...IDLE_USDG_CONVERSION_STEP,
      generation: current.generation + 1,
    }));
  }, []);

  const onConvert = useCallback(async () => {
    if (isAllowanceLoaded && tokensToApprove.length > 0) {
      if (!isApproving) {
        handleApprove();
      }

      return;
    }

    if (
      !batchParams ||
      !signer ||
      !provider ||
      !tokensData ||
      !conversionSwapAmounts ||
      !usdcAddress ||
      !usdgToken ||
      !increaseAmounts
    ) {
      helperToast.error(t`Conversion failed`);
      return;
    }

    const confirmedOrder: ConfirmedUsdgOrder = {
      setupKey: orderSetupKey,
      sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
      sizeInputValue: leverageStrategy === "leverageBySize" ? toTokenInputValue : undefined,
    };

    updateUsdgConversionSession((current) => ({ ...current, step: "submitting" }));

    try {
      const fulfilledExpressParams = await expressParamsPromise;

      const pending: PendingUsdgConversion = {
        knownOrderStatusKeys: new Set(Object.keys(orderStatuses)),
        marketAddress,
        tokenInAddress: usdcAddress,
        tokenOutAddress: usdgToken.address,
        tokenOutDecimals: usdgToken.decimals,
        minAmountOut: batchParams.createOrderParams[0].orderPayload.numbers.minOutputAmount,
        swapPath: conversionSwapAmounts.swapStrategy.swapPathStats?.swapPath ?? [],
        confirmedOrder,
        isGmxAccount: isFromTokenGmxAccount,
      };
      updateUsdgConversionSession((current) => ({ ...current, pending }));

      const orderTxnCallback = makeOrderTxnCallback({ actionName: "Swap", collateralSymbol: fromToken?.symbol });

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
            const sentRelayTaskId = event.data.relayTaskId;
            updateUsdgConversionSession((current) => ({ ...current, relayTaskId: sentRelayTaskId }));
          }

          if (event.event === TxnEventName.Error) {
            resetConversion();
          }
        },
      });

      if (getUsdgConversionSession().pending === pending) {
        updateUsdgConversionSession((current) => ({ ...current, step: "converting", convertingSince: Date.now() }));

        // a wallet transaction that reverts on chain never creates the order, so its receipt releases the button
        if (result && "wait" in result) {
          result
            .wait()
            .then(({ status }) => {
              if (status === "failed" && getUsdgConversionSession().pending === pending) {
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
    increaseAmounts,
    isAllowanceLoaded,
    isApproving,
    isFromTokenGmxAccount,
    leverageStrategy,
    makeOrderTxnCallback,
    marketAddress,
    orderSetupKey,
    orderStatuses,
    provider,
    resetConversion,
    shouldDisableValidationForTesting,
    signer,
    toTokenInputValue,
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
      const pending = pendingConversion;

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

      updateUsdgConversionSession((current) => ({ ...current, pending: undefined }));

      // the USDG stays in the account either way; the margin only follows it on the market it was converted for
      if (marketAddress !== pending.marketAddress) {
        resetConversion();
        return;
      }

      const { generation } = getUsdgConversionSession();

      // the order's guaranteed minimum stands in when the receipt can't be read
      getReceivedTokenAmount({
        chainId,
        txnHash: executedTxnHash,
        tokenAddress: pending.tokenOutAddress,
        account,
        isGmxAccount: pending.isGmxAccount,
      })
        .catch(() => 0n)
        .then((receivedAmount) => {
          if (generation !== getUsdgConversionSession().generation) {
            return;
          }

          // the trader can switch markets while the receipt loads
          if (latestMarketAddress.current !== pending.marketAddress) {
            resetConversion();
            return;
          }

          const amountOut = receivedAmount > 0n ? receivedAmount : pending.minAmountOut;
          const { confirmedOrder } = pending;
          // a setup changed during the wait (a Long/Short flip outside the form) would otherwise leave a hidden arm
          const isOrderSetupUnchanged =
            latestOrderSetupKey.current === confirmedOrder.setupKey &&
            (confirmedOrder.sizeInputValue === undefined ||
              latestToTokenInputValue.current === confirmedOrder.sizeInputValue);

          updateUsdgConversionSession((current) => ({
            ...current,
            lastConversion: { marketAddress: pending.marketAddress, amountOut },
            orderAutoSubmitArm: isOrderSetupUnchanged
              ? { confirmedOrder, armedAt: Date.now(), requestedApprovalTokens: [] }
              : current.orderAutoSubmitArm,
          }));

          setFromTokenAddress(pending.tokenOutAddress);

          if (confirmedOrder.sizeInputValue === undefined) {
            setFocusedInput("from");
            setFromTokenInputValue(formatAmountFree(amountOut, pending.tokenOutDecimals), true);
          }

          resetConversion();
        });
    },
    [
      account,
      chainId,
      latestMarketAddress,
      latestOrderSetupKey,
      latestToTokenInputValue,
      marketAddress,
      orderStatuses,
      pendingConversion,
      resetConversion,
      setFocusedInput,
      setFromTokenAddress,
      setFromTokenInputValue,
      step,
    ]
  );

  useEffect(
    function releaseConversionOnAccountOrChainSwitch() {
      const { owner } = getUsdgConversionSession();

      // a remount keeps the session; only another account or chain drops it
      if (owner?.account === account && owner?.chainId === chainId) {
        return;
      }

      // the executed swap is matched by account and chain, so after a switch it would only clear on the timeout
      updateUsdgConversionSession((current) => ({
        ...current,
        ...IDLE_USDG_CONVERSION_STEP,
        owner: { account, chainId },
        generation: current.generation + 1,
        lastConversion: undefined,
        orderAutoSubmitArm: undefined,
      }));
    },
    [account, chainId]
  );

  useEffect(
    function releaseStuckConversion() {
      if (step !== "converting" || convertingSince === undefined) {
        return;
      }

      const timerId = setTimeout(resetConversion, Math.max(0, convertingSince + CONVERSION_TIMEOUT_MS - Date.now()));

      return () => clearTimeout(timerId);
    },
    [convertingSince, resetConversion, step]
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
    // the banner shows only when no instant route can fill the amount
    instantAmountOut: undefined,
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

  const externalSwapBlockReason = useSelector(selectExternalSwapBlockReason);
  const subaccountContext = useSubaccountContext();
  const onDisableOneClickTrading = useCallback(() => {
    void subaccountContext.tryDisableSubaccount();
  }, [subaccountContext]);
  // the too-large check can't ask the aggregator while One-Click Trading is on, and its own card is hidden here
  const oneClickTradingHint =
    externalSwapBlockReason === "oneClickTrading" ? (
      <div className="mt-4">
        <Trans>
          One-Click Trading skips external routes, which may convert the full amount.{" "}
          <EmbeddedActionButton tone="link" onClick={onDisableOneClickTrading}>
            Disable One-Click Trading
          </EmbeddedActionButton>
          .
        </Trans>
      </div>
    ) : null;

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

  if (tooLargeAlert !== undefined && oneClickTradingHint !== null) {
    tooLargeAlert = (
      <>
        {tooLargeAlert}
        {oneClickTradingHint}
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
  const isExternalSwapLoading = useSelector(selectExternalSwapIsLoading);

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

    // a limit open may still move to the aggregator, which converts it at creation instead
    if (isExternalSwapLoading) {
      return {
        text: (
          <>
            {t`Loading swap path…`}
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
      text: t`Convert and create order`,
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
    isExternalSwapLoading,
    isMultichainSubmitDisabled,
    onConvert,
    tokensToApprove,
    usdcAddress,
  ]);

  const confirmedOrder = orderAutoSubmitArm?.confirmedOrder;
  const isTypedSizeKept = confirmedOrder?.sizeInputValue !== undefined;
  const isConvertedMarginInPlace =
    lastConversion !== undefined &&
    increaseAmounts !== undefined &&
    fromToken?.address === collateralTokenAddress &&
    lastConversion.marketAddress === marketAddress &&
    (isTypedSizeKept
      ? toTokenInputValue === confirmedOrder?.sizeInputValue
      : fromTokenAmount === lastConversion.amountOut);

  const orderAutoSubmitArmedAt = orderAutoSubmitArm?.armedAt;
  const isOrderAutoSubmitArmed = orderAutoSubmitArmedAt !== undefined;
  const convertedOrderStatus =
    confirmedOrder && lastConversion && increaseAmounts && isConvertedMarginInPlace
      ? getConvertedOrderStatus({
          confirmedOrder,
          setupKey: orderSetupKey,
          sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
          sizeInputValue: toTokenInputValue,
          payAmount: increaseAmounts.initialCollateralAmount,
          convertedAmount: lastConversion.amountOut,
        })
      : undefined;
  const isOrderAutoSubmitPending = convertedOrderStatus === "confirmed";

  let convertedSizeFitInputValue: string | undefined;

  if (convertedOrderStatus === "marginShort" && lastConversion && increaseAmounts && fromToken && toToken) {
    const sizeFit = getConvertedSizeFit({
      increaseAmounts,
      convertedUsd: convertToUsd(lastConversion.amountOut, fromToken.decimals, increaseAmounts.initialCollateralPrice)!,
    });

    convertedSizeFitInputValue =
      sizeFit !== undefined
        ? formatAmountFree(sizeFit, toToken.decimals, TOKEN_INPUT_DISPLAY_DECIMALS, toToken.visualMultiplier)
        : undefined;
  }
  // a GMX Account credit reaches the balance a few seconds after the swap, and its "insufficient balance" isn't final
  const payBalance = getBalanceByBalanceType(
    fromToken,
    isFromTokenGmxAccount ? TokenBalanceType.GmxAccount : TokenBalanceType.Wallet
  );
  const isOrderAutoSubmitAwaitingBalance =
    isOrderAutoSubmitPending &&
    lastConversion !== undefined &&
    (payBalance === undefined || payBalance < lastConversion.amountOut);

  const stopOrderAutoSubmit = useCallback(
    () => updateUsdgConversionSession((current) => ({ ...current, orderAutoSubmitArm: undefined })),
    []
  );

  const markOrderAutoSubmitApprovalRequested = useCallback(
    (tokenAddress: string) =>
      updateUsdgConversionSession((current) =>
        current.orderAutoSubmitArm
          ? {
              ...current,
              orderAutoSubmitArm: {
                ...current.orderAutoSubmitArm,
                requestedApprovalTokens: [...current.orderAutoSubmitArm.requestedApprovalTokens, tokenAddress],
              },
            }
          : current
      ),
    []
  );

  // per mount: a remount gets a fresh grace render before a changed margin counts as a change
  const landedArmedAtRef = useRef<number>();

  useEffect(
    function disarmChangedOrder() {
      if (orderAutoSubmitArmedAt === undefined) {
        return;
      }

      // the pay token switches a render after the arm, so only a change after the margin landed disarms
      if (isConvertedMarginInPlace) {
        landedArmedAtRef.current = orderAutoSubmitArmedAt;
      }

      if (landedArmedAtRef.current !== orderAutoSubmitArmedAt || isOrderAutoSubmitPending) {
        return;
      }

      stopOrderAutoSubmit();

      if (convertedSizeFitInputValue !== undefined) {
        setToTokenInputValue(convertedSizeFitInputValue, false);
      }
    },
    [
      convertedSizeFitInputValue,
      isConvertedMarginInPlace,
      isOrderAutoSubmitPending,
      orderAutoSubmitArmedAt,
      setToTokenInputValue,
      stopOrderAutoSubmit,
    ]
  );

  useEffect(
    function stopWaitingForBalance() {
      if (!isOrderAutoSubmitAwaitingBalance) {
        return;
      }

      // a balance that never catches up must not leave an arm that a later deposit could fire
      const timerId = setTimeout(stopOrderAutoSubmit, BALANCE_WAIT_TIMEOUT_MS);

      return () => clearTimeout(timerId);
    },
    [isOrderAutoSubmitAwaitingBalance, stopOrderAutoSubmit]
  );

  useEffect(
    function expireOrderAutoSubmit() {
      if (orderAutoSubmitArmedAt === undefined) {
        return;
      }

      const timerId = setTimeout(
        stopOrderAutoSubmit,
        Math.max(0, orderAutoSubmitArmedAt + ORDER_AUTO_SUBMIT_TIMEOUT_MS - Date.now())
      );

      return () => clearTimeout(timerId);
    },
    [orderAutoSubmitArmedAt, stopOrderAutoSubmit]
  );

  return {
    isConvertFirst,
    isBusy,
    isOrderAutoSubmitArmed,
    isOrderAutoSubmitPending,
    isOrderAutoSubmitAwaitingBalance,
    orderAutoSubmitRequestedApprovals: orderAutoSubmitArm?.requestedApprovalTokens ?? EMPTY_ARRAY,
    markOrderAutoSubmitApprovalRequested,
    stopOrderAutoSubmit,
    buttonState,
    expressParams,
    isExpressLoading,
    executionFee,
    tooLargeAlert,
    convertFirstNote,
  };
}
