import { useEffect } from "react";
import { useHistory } from "react-router-dom";
import groupBy from "lodash/groupBy";

import { selectOrdersInfoData, selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { isLimitDecreaseOrderType, isStopLossOrderType } from "domain/synthetics/orders";
import { getPositionKey } from "domain/synthetics/positions";
import { selectMaxAutoCancelOrders } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { setAutoCancelOrdersTxn } from "./setAutoCancelOrdersTxn";
import useWallet from "lib/wallets/useWallet";
import { usePendingTxns } from "lib/usePendingTxns";
import { PositionOrderInfo } from "domain/synthetics/orders";
import { emitMetricCounter } from "lib/metrics/emitMetricEvent";
import { SetAutoCloseOrdersAction } from "lib/metrics";
import { t } from "@lingui/macro";
import { helperToast } from "lib/helperToast";

import useSearchParams from "lib/useSearchParams";

type SearchParams = {
  setOrdersAutoCancel?: string;
};

export function useSetOrdersAutoCancelByQueryParams() {
  const history = useHistory();
  const searchParams = useSearchParams<SearchParams>();
  const maxAutoCancelOrders = useSelector(selectMaxAutoCancelOrders);
  const chainId = useSelector(selectChainId);
  const [, setPendingTxns] = usePendingTxns();

  const ordersInfoData = useSelector(selectOrdersInfoData);
  const { signer } = useWallet();

  const { setOrdersAutoCancel } = searchParams;

  useEffect(
    function setOrdersAutoCloseByQueryParams() {
      if (!setOrdersAutoCancel || !signer || maxAutoCancelOrders === undefined) return;

      const allowedAutoCancelOrders = Number(maxAutoCancelOrders) - 1;

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
            executionFee: order.executionFee,
            setPendingTxns,
          })),
          {
            updateOrdersCount,
            totalUpdatableOrdersCount,
          }
        );

        emitMetricCounter<SetAutoCloseOrdersAction>({
          event: "announcement.autoCloseOrders.updateExistingOrders",
        });
      } else {
        helperToast.success(t`No orders eligble for conversion`);
      }

      if (history.location.search) {
        history.replace({ search: "" });
      }
    },
    [setOrdersAutoCancel, ordersInfoData, signer, chainId, history, maxAutoCancelOrders, setPendingTxns]
  );
}
