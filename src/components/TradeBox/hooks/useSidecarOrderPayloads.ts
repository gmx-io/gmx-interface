import { useMemo } from "react";

import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { selectAccount, selectUserReferralInfo } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxCollateralTokenAddress,
  selectTradeboxMarketInfo,
  selectTradeboxSelectedPosition,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useMaxAutoCancelOrdersState } from "domain/synthetics/trade/useMaxAutoCancelOrdersState";
import { useChainId } from "lib/chains";
import { buildDecreaseOrderPayload, buildUpdateOrderPayload, CancelOrderTxnParams } from "sdk/utils/orderTransactions";

import { useRequiredActions } from "./useRequiredActions";
import { useTPSLSummaryExecutionFee } from "./useTPSLSummaryExecutionFee";

export function useSidecarOrderPayloads() {
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const { autoCancelOrdersLimit } = useMaxAutoCancelOrdersState({ positionKey: selectedPosition?.key });
  const { getExecutionFeeAmountForEntry } = useTPSLSummaryExecutionFee();
  const { cancelSltpEntries, createSltpEntries, updateSltpEntries } = useRequiredActions();

  const { chainId } = useChainId();
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const account = useSelector(selectAccount);
  const collateralAddress = useSelector(selectTradeboxCollateralTokenAddress);
  const { isLong } = useSelector(selectTradeboxTradeFlags);
  const userReferralInfo = useSelector(selectUserReferralInfo);

  const secondaryOrdersParams = useMemo(() => {
    if (!marketInfo || !account || !collateralAddress) {
      return undefined;
    }

    const createPayloads = createSltpEntries.map((entry, i) => {
      const amounts = entry.decreaseAmounts;

      return buildDecreaseOrderPayload({
        chainId,
        receiver: account,
        collateralDeltaAmount: amounts.collateralDeltaAmount ?? 0n,
        collateralTokenAddress: collateralAddress,
        sizeDeltaUsd: amounts.sizeDeltaUsd,
        sizeDeltaInTokens: amounts.sizeDeltaInTokens,
        referralCode: userReferralInfo?.referralCodeForTxn,
        uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT,
        allowedSlippage: 0,
        orderType: amounts.triggerOrderType!,
        autoCancel: i < autoCancelOrdersLimit,
        swapPath: [],
        externalSwapQuote: undefined,
        marketAddress: marketInfo.marketTokenAddress,
        indexTokenAddress: marketInfo.indexTokenAddress,
        isLong,
        acceptablePrice: amounts.acceptablePrice,
        triggerPrice: amounts.triggerPrice,
        receiveTokenAddress: collateralAddress,
        minOutputUsd: 0n,
        decreasePositionSwapType: amounts.decreaseSwapType,
        executionFeeAmount: getExecutionFeeAmountForEntry(entry) ?? 0n,
        executionGasLimit: 0n, // Don't need for tp/sl entries
        validFromTime: 0n,
      });
    });

    const updatePayloads = updateSltpEntries.map((entry) => {
      const amounts = entry.increaseAmounts || entry.decreaseAmounts;
      const order = entry.order!;

      return buildUpdateOrderPayload({
        chainId,
        indexTokenAddress: marketInfo.indexTokenAddress,
        orderKey: order.key,
        orderType: order.orderType,
        sizeDeltaUsd: amounts.sizeDeltaUsd ?? 0n,
        triggerPrice: amounts.triggerPrice ?? 0n,
        acceptablePrice: amounts.acceptablePrice ?? 0n,
        minOutputAmount: 0n,
        validFromTime: 0n,
        autoCancel: order.autoCancel,
        executionFeeTopUp: getExecutionFeeAmountForEntry(entry) ?? 0n,
      });
    });

    const cancelPayloads = cancelSltpEntries.map((entry): CancelOrderTxnParams => {
      const order = entry.order!;

      return {
        orderKey: order.key,
      };
    });

    const secondaryOrderPayloads = { createPayloads, cancelPayloads, updatePayloads };

    return secondaryOrderPayloads;
  }, [
    account,
    autoCancelOrdersLimit,
    cancelSltpEntries,
    chainId,
    collateralAddress,
    createSltpEntries,
    getExecutionFeeAmountForEntry,
    isLong,
    marketInfo,
    updateSltpEntries,
    userReferralInfo?.referralCodeForTxn,
  ]);

  return secondaryOrdersParams;
}
