import { useMemo } from "react";

import { selectAccount, selectUserReferralInfo } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxCollateralTokenAddress,
  selectTradeboxMarketInfo,
  selectTradeboxSelectedPosition,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { MAX_PERCENTAGE } from "domain/synthetics/sidecarOrders/utils";
import { useMaxAutoCancelOrdersState } from "domain/synthetics/trade/useMaxAutoCancelOrdersState";
import { buildTpSlCreatePayloads } from "domain/tpsl/sidecar";
import { getPositionCloseSizeDeltaUsdForPayload } from "domain/tpsl/utils";
import { useChainId } from "lib/chains";
import { buildUpdateOrderPayload, CancelOrderTxnParams } from "sdk/utils/orderTransactions";

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

    const getPayloadSizeDeltaUsd = (entry: (typeof createSltpEntries)[number] | (typeof updateSltpEntries)[number]) => {
      const amounts = entry.increaseAmounts || entry.decreaseAmounts;
      const isFullClose = Boolean(entry.decreaseAmounts) && entry.percentage?.value === MAX_PERCENTAGE;

      if (!amounts) {
        return 0n;
      }

      return getPositionCloseSizeDeltaUsdForPayload(amounts.sizeDeltaUsd ?? 0n, isFullClose);
    };

    const createPayloads = buildTpSlCreatePayloads({
      autoCancelOrdersLimit,
      chainId,
      account,
      marketAddress: marketInfo.marketTokenAddress,
      indexTokenAddress: marketInfo.indexTokenAddress,
      collateralTokenAddress: collateralAddress,
      isLong,
      entries: createSltpEntries.map((entry) => ({
        amounts: entry.decreaseAmounts,
        executionFeeAmount: getExecutionFeeAmountForEntry(entry) ?? 0n,
        sizeDeltaUsd: getPayloadSizeDeltaUsd(entry),
      })),
      userReferralCode: userReferralInfo?.referralCodeForTxn,
    });

    const updatePayloads = updateSltpEntries.map((entry) => {
      const amounts = entry.increaseAmounts || entry.decreaseAmounts;
      const order = entry.order!;

      return buildUpdateOrderPayload({
        chainId,
        indexTokenAddress: marketInfo.indexTokenAddress,
        orderKey: order.key,
        orderType: order.orderType,
        sizeDeltaUsd: getPayloadSizeDeltaUsd(entry),
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
