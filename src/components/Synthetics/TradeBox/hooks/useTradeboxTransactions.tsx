import { t } from "@lingui/macro";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccount } from "context/SubaccountContext/SubaccountContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  useTradeboxDecreasePositionAmounts,
  useTradeboxFromTokenAddress,
  useTradeboxMarketInfo,
  useTradeboxSwapAmounts,
  useTradeboxToTokenAddress,
  useTradeboxTradeFlags,
} from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import {
  selectTradeboxFixedTriggerOrderType,
  selectTradeboxFixedTriggerThresholdType,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useUserReferralCode } from "domain/referrals";
import {
  OrderType,
  createDecreaseOrderTxn,
  createIncreaseOrderTxn,
  createSwapOrderTxn,
} from "domain/synthetics/orders";
import { createWrapOrUnwrapTxn } from "domain/synthetics/orders/createWrapOrUnwrapTxn";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { useCallback } from "react";
import {
  useTradeboxCollateralToken,
  useTradeboxExecutionFee,
  useTradeboxIncreasePositionAmounts,
} from "../../../../context/SyntheticsStateContext/hooks/tradeboxHooks";
import { useRequiredActions } from "./useRequiredActions";
import { useSummaryExecutionFee } from "./useSummaryExecutionFee";

interface TradeboxTransactionsProps {
  allowedSlippage: number | undefined;
  setPendingTxns: (txns: any) => void;
}

export function useTradeboxTransactions({ allowedSlippage, setPendingTxns }: TradeboxTransactionsProps) {
  const { chainId } = useChainId();
  const tokensData = useTokensData();
  const marketInfo = useTradeboxMarketInfo();
  const collateralToken = useTradeboxCollateralToken();
  const tradeFlags = useTradeboxTradeFlags();
  const { isLong, isLimit } = tradeFlags;

  const fromTokenAddress = useTradeboxFromTokenAddress();
  const toTokenAddress = useTradeboxToTokenAddress();

  const swapAmounts = useTradeboxSwapAmounts();
  const increaseAmounts = useTradeboxIncreasePositionAmounts();
  const decreaseAmounts = useTradeboxDecreasePositionAmounts();

  const { shouldDisableValidationForTesting } = useSettings();

  const executionFee = useTradeboxExecutionFee();
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);
  const fixedTriggerThresholdType = useSelector(selectTradeboxFixedTriggerThresholdType);
  const fixedTriggerOrderType = useSelector(selectTradeboxFixedTriggerOrderType);
  const { account, signer } = useWallet();
  const { referralCodeForTxn } = useUserReferralCode(signer, chainId, account);

  const fromToken = getByKey(tokensData, fromTokenAddress);
  const toToken = getByKey(tokensData, toTokenAddress);

  const { requiredActions, createSltpEntries, cancelSltpEntries, updateSltpEntries } = useRequiredActions();
  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();

  const { summaryExecutionFee, getExecutionFeeAmountForEntry } = useSummaryExecutionFee();

  const subaccount = useSubaccount(summaryExecutionFee?.feeTokenAmount ?? null, requiredActions);

  const onSubmitSwap = useCallback(
    function onSubmitSwap() {
      if (
        !account ||
        !tokensData ||
        !swapAmounts?.swapPathStats ||
        !fromToken ||
        !toToken ||
        !executionFee ||
        !signer ||
        typeof allowedSlippage !== "number"
      ) {
        helperToast.error(t`Error submitting order`);
        return Promise.resolve();
      }

      return createSwapOrderTxn(chainId, signer, subaccount, {
        account,
        fromTokenAddress: fromToken.address,
        fromTokenAmount: swapAmounts.amountIn,
        swapPath: swapAmounts.swapPathStats?.swapPath,
        toTokenAddress: toToken.address,
        orderType: isLimit ? OrderType.LimitSwap : OrderType.MarketSwap,
        minOutputAmount: swapAmounts.minOutputAmount,
        referralCode: referralCodeForTxn,
        executionFee: executionFee.feeTokenAmount,
        allowedSlippage,
        tokensData,
        setPendingTxns,
        setPendingOrder,
      });
    },
    [
      account,
      allowedSlippage,
      chainId,
      executionFee,
      fromToken,
      isLimit,
      referralCodeForTxn,
      setPendingOrder,
      setPendingTxns,
      signer,
      subaccount,
      swapAmounts,
      tokensData,
      toToken,
    ]
  );

  const onSubmitIncreaseOrder = useCallback(
    function onSubmitIncreaseOrder() {
      if (
        !tokensData ||
        !account ||
        !fromToken ||
        !collateralToken ||
        increaseAmounts?.acceptablePrice === undefined ||
        !executionFee ||
        !marketInfo ||
        !signer ||
        typeof allowedSlippage !== "number"
      ) {
        helperToast.error(t`Error submitting order`);
        return Promise.resolve();
      }

      const commonSecondaryOrderParams = {
        account,
        marketAddress: marketInfo.marketTokenAddress,
        swapPath: [],
        allowedSlippage,
        initialCollateralAddress: collateralToken.address,
        receiveTokenAddress: collateralToken.address,
        isLong,
        indexToken: marketInfo.indexToken,
      };

      return createIncreaseOrderTxn({
        chainId,
        signer,
        subaccount,
        createIncreaseOrderParams: {
          account,
          marketAddress: marketInfo.marketTokenAddress,
          initialCollateralAddress: fromToken?.address,
          initialCollateralAmount: increaseAmounts.initialCollateralAmount,
          targetCollateralAddress: collateralToken.address,
          collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
          swapPath: increaseAmounts.swapPathStats?.swapPath || [],
          sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
          sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
          triggerPrice: isLimit ? triggerPrice : undefined,
          acceptablePrice: increaseAmounts.acceptablePrice,
          isLong,
          orderType: isLimit ? OrderType.LimitIncrease : OrderType.MarketIncrease,
          executionFee: executionFee.feeTokenAmount,
          allowedSlippage,
          referralCode: referralCodeForTxn,
          indexToken: marketInfo.indexToken,
          tokensData,
          skipSimulation: isLimit || shouldDisableValidationForTesting,
          setPendingTxns: setPendingTxns,
          setPendingOrder,
          setPendingPosition,
        },
        createDecreaseOrderParams: createSltpEntries.map((entry) => {
          return {
            ...commonSecondaryOrderParams,
            initialCollateralDeltaAmount: entry.decreaseAmounts.collateralDeltaAmount ?? 0n,
            sizeDeltaUsd: entry.decreaseAmounts.sizeDeltaUsd,
            sizeDeltaInTokens: entry.decreaseAmounts.sizeDeltaInTokens,
            acceptablePrice: entry.decreaseAmounts.acceptablePrice,
            triggerPrice: entry.decreaseAmounts.triggerPrice,
            minOutputUsd: 0n,
            decreasePositionSwapType: entry.decreaseAmounts.decreaseSwapType,
            orderType: entry.decreaseAmounts.triggerOrderType!,
            referralCode: referralCodeForTxn,
            executionFee: getExecutionFeeAmountForEntry(entry) ?? 0n,
            tokensData,
            txnType: entry.txnType!,
            skipSimulation: isLimit || shouldDisableValidationForTesting,
          };
        }),
        cancelOrderParams: cancelSltpEntries.map((entry) => ({
          ...commonSecondaryOrderParams,
          orderKey: entry.order!.key,
          orderType: entry.order!.orderType,
          minOutputAmount: 0n,
          sizeDeltaUsd: entry.order!.sizeDeltaUsd,
          txnType: entry.txnType!,
          initialCollateralDeltaAmount: entry.order?.initialCollateralDeltaAmount ?? 0n,
        })),
        updateOrderParams: updateSltpEntries.map((entry) => ({
          ...commonSecondaryOrderParams,
          orderKey: entry.order!.key,
          orderType: entry.order!.orderType,
          sizeDeltaUsd: (entry.increaseAmounts?.sizeDeltaUsd || entry.decreaseAmounts?.sizeDeltaUsd)!,
          acceptablePrice: (entry.increaseAmounts?.acceptablePrice || entry.decreaseAmounts?.acceptablePrice)!,
          triggerPrice: (entry.increaseAmounts?.triggerPrice || entry.decreaseAmounts?.triggerPrice)!,
          executionFee: getExecutionFeeAmountForEntry(entry) ?? 0n,
          minOutputAmount: 0n,
          txnType: entry.txnType!,
          initialCollateralDeltaAmount: entry.order?.initialCollateralDeltaAmount ?? 0n,
        })),
      });
    },
    [
      account,
      allowedSlippage,
      collateralToken,
      createSltpEntries,
      executionFee,
      fromToken,
      increaseAmounts,
      isLimit,
      marketInfo,
      referralCodeForTxn,
      setPendingOrder,
      setPendingPosition,
      setPendingTxns,
      shouldDisableValidationForTesting,
      signer,
      subaccount,
      tokensData,
      triggerPrice,
      updateSltpEntries,
      cancelSltpEntries,
      chainId,
      isLong,
      getExecutionFeeAmountForEntry,
    ]
  );

  const onSubmitDecreaseOrder = useCallback(
    function onSubmitDecreaseOrder() {
      if (
        !account ||
        !marketInfo ||
        !collateralToken ||
        fixedTriggerOrderType === undefined ||
        fixedTriggerThresholdType === undefined ||
        decreaseAmounts?.acceptablePrice === undefined ||
        decreaseAmounts?.triggerPrice === undefined ||
        !executionFee ||
        !tokensData ||
        !signer ||
        typeof allowedSlippage !== "number"
      ) {
        helperToast.error(t`Error submitting order`);
        return Promise.resolve();
      }

      return createDecreaseOrderTxn(
        chainId,
        signer,
        subaccount,
        {
          account,
          marketAddress: marketInfo.marketTokenAddress,
          swapPath: [],
          initialCollateralDeltaAmount: decreaseAmounts.collateralDeltaAmount,
          initialCollateralAddress: collateralToken.address,
          receiveTokenAddress: collateralToken.address,
          triggerPrice: decreaseAmounts.triggerPrice,
          acceptablePrice: decreaseAmounts.acceptablePrice,
          sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
          sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
          minOutputUsd: BigInt(0),
          isLong,
          decreasePositionSwapType: decreaseAmounts.decreaseSwapType,
          orderType: fixedTriggerOrderType,
          executionFee: executionFee.feeTokenAmount,
          allowedSlippage,
          referralCode: referralCodeForTxn,
          // Skip simulation to avoid EmptyPosition error
          // skipSimulation: !existingPosition || shouldDisableValidation,
          skipSimulation: true,
          indexToken: marketInfo.indexToken,
          tokensData,
        },
        {
          setPendingTxns,
          setPendingOrder,
          setPendingPosition,
        }
      );
    },
    [
      account,
      allowedSlippage,
      chainId,
      collateralToken,
      decreaseAmounts,
      executionFee,
      fixedTriggerOrderType,
      fixedTriggerThresholdType,
      isLong,
      marketInfo,
      referralCodeForTxn,
      setPendingOrder,
      setPendingPosition,
      setPendingTxns,
      signer,
      subaccount,
      tokensData,
    ]
  );

  function onSubmitWrapOrUnwrap() {
    if (!account || !swapAmounts || !fromToken || !signer) {
      return Promise.resolve();
    }

    return createWrapOrUnwrapTxn(chainId, signer, {
      amount: swapAmounts.amountIn,
      isWrap: Boolean(fromToken.isNative),
      setPendingTxns,
    });
  }

  return {
    onSubmitSwap,
    onSubmitIncreaseOrder,
    onSubmitDecreaseOrder,
    onSubmitWrapOrUnwrap,
  };
}
