import { useMemo } from "react";

import { selectAccount, selectUserReferralInfo } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxCollateralTokenAddress,
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  SecondaryCancelOrderParams,
  SecondaryDecreaseOrderParams,
  SecondaryOrderCommonParams,
  SecondaryUpdateOrderParams,
} from "domain/synthetics/gassless/txns/createOrderBuilders";
import { SidecarLimitOrderEntryValid, SidecarSlTpOrderEntryValid } from "domain/synthetics/sidecarOrders/types";
import { useSidecarEntries } from "domain/synthetics/sidecarOrders/useSidecarEntries";
import { useChainId } from "lib/chains";

// TODO: REWRITE ALL THIS STUFF TO SELECTORS
export function useRequiredActions() {
  const sidecarEntries = useSidecarEntries();

  const { cancelSltpEntries, createSltpEntries, updateSltpEntries } = useMemo(() => {
    const [cancelSltpEntries, createSltpEntries, updateSltpEntries] = sidecarEntries.reduce(
      ([cancel, create, update], e) => {
        if (e.txnType === "cancel") cancel.push(e as SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid);
        if (e.txnType === "create" && !!e.decreaseAmounts) create.push(e as SidecarSlTpOrderEntryValid);
        if (e.txnType === "update" && (!!e.decreaseAmounts || !!e.increaseAmounts))
          update.push(e as SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid);
        return [cancel, create, update];
      },
      [[], [], []] as [
        (SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid)[],
        SidecarSlTpOrderEntryValid[],
        (SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid)[],
      ]
    );

    return { cancelSltpEntries, createSltpEntries, updateSltpEntries };
  }, [sidecarEntries]);

  const requiredActions = 1 + cancelSltpEntries.length + createSltpEntries.length + updateSltpEntries.length;

  return {
    requiredActions,
    cancelSltpEntries,
    createSltpEntries,
    updateSltpEntries,
  };
}

export function useSecondaryOrderPayloads({
  cancelSltpEntries,
  createSltpEntries,
  updateSltpEntries,
  autoCancelOrdersLimit,
  getExecutionFeeAmountForEntry,
}: {
  createSltpEntries: SidecarSlTpOrderEntryValid[];
  cancelSltpEntries: (SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid)[];
  updateSltpEntries: (SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid)[];
  autoCancelOrdersLimit: number;
  getExecutionFeeAmountForEntry: (
    entry: SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid
  ) => bigint | undefined;
}) {
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

    const commonSecondaryOrderParams: SecondaryOrderCommonParams = {
      chainId,
      account,
      marketAddress: marketInfo.marketTokenAddress,
      indexTokenAddress: marketInfo.indexToken.address,
      swapPath: [],
      initialCollateralAddress: collateralAddress,
      targetCollateralAddress: collateralAddress,
      isLong,
      allowedSlippage: 0,
      sizeDeltaUsd: 0n,
      initialCollateralDeltaAmount: 0n,
      referralCode: userReferralInfo?.referralCodeForTxn,
    };

    const createPayloads = createSltpEntries.map((entry, i): SecondaryDecreaseOrderParams => {
      return {
        ...commonSecondaryOrderParams,
        ...entry.decreaseAmounts,
        txnType: "create",
        orderType: entry.decreaseAmounts.triggerOrderType!,
        triggerPrice: entry.decreaseAmounts.triggerPrice,
        decreasePositionSwapType: entry.decreaseAmounts.decreaseSwapType,
        minOutputUsd: 0n,
        autoCancel: i < autoCancelOrdersLimit,
        executionFee: getExecutionFeeAmountForEntry(entry) ?? 0n,
        externalSwapQuote: undefined,
      };
    });

    const cancelPayloads = cancelSltpEntries.map((entry): SecondaryCancelOrderParams => {
      const order = entry.order!;

      return {
        ...commonSecondaryOrderParams,
        ...order,
        txnType: "cancel",
        orderKey: order.key,
      };
    });

    const updatePayloads = updateSltpEntries.map((entry): SecondaryUpdateOrderParams => {
      const amounts = entry.increaseAmounts || entry.decreaseAmounts;
      const order = entry.order!;

      return {
        ...commonSecondaryOrderParams,
        ...order,
        orderKey: order.key,
        txnType: "update",
        sizeDeltaUsd: amounts.sizeDeltaUsd ?? 0n,
        acceptablePrice: amounts.acceptablePrice ?? 0n,
        triggerPrice: amounts.triggerPrice ?? 0n,
        executionFee: getExecutionFeeAmountForEntry(entry) ?? 0n,
        minOutputAmount: 0n,
        initialCollateralDeltaAmount: order.initialCollateralDeltaAmount ?? 0n,
        autoCancel: order.autoCancel,
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
