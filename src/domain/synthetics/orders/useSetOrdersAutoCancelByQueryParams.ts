import groupBy from "lodash/groupBy";
import { useEffect } from "react";
import { useHistory } from "react-router-dom";

import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { selectOrdersInfoData, selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectMaxAutoCancelOrders } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { isLimitDecreaseOrderType, isStopLossOrderType } from "domain/synthetics/orders";
import { PositionOrderInfo } from "domain/synthetics/orders";
import { getPositionKey } from "domain/synthetics/positions";
import { helperToast } from "lib/helperToast";
import { SetAutoCloseOrdersAction } from "lib/metrics";
import { emitMetricCounter } from "lib/metrics/emitMetricEvent";
import useSearchParams from "lib/useSearchParams";
import useWallet from "lib/wallets/useWallet";

import { setAutoCancelOrdersTxn } from "./setAutoCancelOrdersTxn";

type SearchParams = {
  setOrdersAutoCancel?: string;
};

export function useSetOrdersAutoCancelByQueryParams() {
  const history = useHistory();
  const searchParams = useSearchParams<SearchParams>();
  const maxAutoCancelOrders = useSelector(selectMaxAutoCancelOrders);
  const chainId = useSelector(selectChainId);
  const { setPendingTxns } = usePendingTxns();

  const ordersInfoData = useSelector(selectOrdersInfoData);
  const { signer } = useWallet();

  const { setOrdersAutoCancel } = searchParams;

  useEffect(
    function setOrdersAutoCloseByQueryParams() {
      if (!setOrdersAutoCancel || maxAutoCancelOrders === undefined) return;

      if (!signer) {
        helperToast.error("Connect your wallet to proceed with orders conversion.");
        return;
      }

      const allowedAutoCancelOrders = Number(maxAutoCancelOrders);

      const tpSlOrders = Object.values(ordersInfoData || {}).filter(
        (order) => isLimitDecreaseOrderType(order.orderType) || isStopLossOrderType(order.orderType)
      ) as PositionOrderInfo[];

      const groupedOrders = groupBy(tpSlOrders, (order) =>
        getPositionKey(order.account, order.marketAddress, order.targetCollateralToken.address, order.isLong)
      );

      let updateOrdersCount = 0;
      let totalUpdatableOrdersCount = 0;

      const ordersToAutoCancel = Object.values(groupedOrders).reduce((acc, orders) => {
        const existingAutoCancelCount = orders.filter((order) => order.autoCancel).length;
        const availableSlots = Math.max(0, allowedAutoCancelOrders - existingAutoCancelCount);

        const ordersPossibleToUpdate = orders.filter((order) => !order.autoCancel);
        const ordersToBeUpdated = ordersPossibleToUpdate.slice(0, availableSlots);

        totalUpdatableOrdersCount += ordersPossibleToUpdate.length;
        updateOrdersCount += ordersToBeUpdated.length;

        return [...acc, ...ordersToBeUpdated];
      }, []);

      if (ordersToAutoCancel.length > 0) {
        setAutoCancelOrdersTxn(
          chainId,
          signer,
          setPendingTxns,
          ordersToAutoCancel.map((order) => ({
            orderKey: order.key,
            indexToken: order.indexToken,
            sizeDeltaUsd: order.sizeDeltaUsd,
            triggerPrice: order.triggerPrice,
            acceptablePrice: order.acceptablePrice,
            minOutputAmount: order.minOutputAmount,
            orderType: order.orderType,
            executionFee: order.executionFee,
            setPendingTxns,
          })),
          {
            updateOrdersCount,
            totalUpdatableOrdersCount,
          }
        );
      } else {
        helperToast.success("No orders eligble for conversion.");
      }

      emitMetricCounter<SetAutoCloseOrdersAction>({
        event: "announcement.autoCloseOrders.updateExistingOrders",
      });

      if (history.location.search) {
        history.replace({ search: "" });
      }
    },
    [setOrdersAutoCancel, ordersInfoData, signer, chainId, history, maxAutoCancelOrders, setPendingTxns]
  );
}
