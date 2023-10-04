import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { TransactionStatus, TransactionStatusType } from "components/TransactionStatus/TransactionStatus";
import {
  OrderStatus,
  PendingFundingFeeSettlementData,
  PendingOrderData,
  getPendingOrderKey,
  useSyntheticsEvents,
} from "context/SyntheticsEvents";
import { MarketInfo, MarketsInfoData } from "domain/synthetics/markets";
import { isMarketOrderType } from "domain/synthetics/orders";
import { getByKey } from "lib/objects";
import { useEffect, useMemo } from "react";
import "./StatusNotification.scss";
import { useToastAutoClose } from "./useToastAutoClose";

type Props = {
  toastTimestamp: number;
  orders: PendingFundingFeeSettlementData["orders"];
  marketsInfoData: MarketsInfoData | undefined;
};

export function FeesSettlementStatusNotification({ orders, toastTimestamp, marketsInfoData }: Props) {
  const { orderStatuses, setOrderStatusViewed } = useSyntheticsEvents();

  const [keyByOrder, orderByKey] = useMemo(() => {
    const map1 = new Map<PendingOrderData, string>();
    const map2 = new Map<string, PendingOrderData>();
    orders.forEach((order) => {
      const key = getPendingOrderKey(order);
      map1.set(order, key);
      map2.set(key, order);
    });
    return [map1, map2];
  }, [orders]);

  const orderStatusByOrder = useMemo(() => {
    const res = new Map<PendingOrderData, OrderStatus>();
    Object.values(orderStatuses).forEach((orderStatus) => {
      const key = getPendingOrderKey(orderStatus.data);
      const order = orderByKey.get(key);
      if (!order) throw new Error("order not found");
      res.set(order, orderStatus);
    }, {} as Map<string, OrderStatus>);
    return res;
  }, [orderByKey, orderStatuses]);

  const isCompleted = useMemo(() => {
    return orders.every((order) => {
      const orderStatus = orderStatusByOrder.get(order);
      return isMarketOrderType(order.orderType)
        ? Boolean(orderStatus?.executedTxnHash)
        : Boolean(orderStatus?.createdTxnHash);
    });
  }, [orderStatusByOrder, orders]);

  const hasError = useMemo(
    () => orders.some((order) => orderStatusByOrder.get(order)?.cancelledTxnHash),
    [orderStatusByOrder, orders]
  );

  const marketInfoByKey = useMemo(() => {
    if (!marketsInfoData) {
      return {};
    }

    return orders.reduce((acc, order) => {
      const marketInfo = getByKey(marketsInfoData, order.marketAddress);
      const key = keyByOrder.get(order);

      if (!key) throw new Error("key not found");

      return {
        ...acc,
        [key]: marketInfo,
      };
    }, {} as Record<string, MarketInfo | undefined>);
  }, [keyByOrder, marketsInfoData, orders]);

  const creationStatuses = useMemo(() => {
    return (
      <>
        {orders.map((order) => {
          const key = keyByOrder.get(order);
          if (!key) throw new Error("key not found");

          const orderStatus = orderStatusByOrder.get(order);
          const marketInfo = marketInfoByKey?.[key];

          let text = t`Sending order request`;
          let status: TransactionStatusType = "loading";

          if (orderStatus?.createdTxnHash) {
            if (marketInfo) {
              text = t`${order.isLong ? "Long" : "Short"} ${marketInfo.name} request sent`;
            } else {
              text = t`Settle request sent`;
            }
            status = "success";
          }

          return <TransactionStatus key={key} status={status} txnHash={orderStatus?.createdTxnHash} text={text} />;
        })}
      </>
    );
  }, [keyByOrder, marketInfoByKey, orderStatusByOrder, orders]);

  const executionStatuses = useMemo(() => {
    return (
      <>
        {orders.map((order) => {
          if (!order || !isMarketOrderType(order.orderType)) {
            return null;
          }

          const orderStatus = orderStatusByOrder.get(order);

          if (!orderStatus) return null;

          let text = t`Fulfilling order request`;
          let status: TransactionStatusType = "muted";
          let txnHash: string | undefined;

          if (orderStatus?.createdTxnHash) {
            status = "loading";
          }

          const key = keyByOrder.get(order);
          if (!key) throw new Error("key not found");
          const marketInfo = marketInfoByKey?.[key];

          if (orderStatus?.executedTxnHash) {
            if (marketInfo) {
              text = t`${order.isLong ? "Long" : "Short"} ${marketInfo.name} Fees settled`;
            } else {
              text = t`Order executed`;
            }
            status = "success";
            txnHash = orderStatus?.executedTxnHash;
          }

          if (orderStatus?.cancelledTxnHash) {
            text = t`Order cancelled`;
            status = "error";
            txnHash = orderStatus?.cancelledTxnHash;
          }

          return <TransactionStatus key={keyByOrder.get(order)} status={status} txnHash={txnHash} text={text} />;
        })}
      </>
    );
  }, [keyByOrder, marketInfoByKey, orderStatusByOrder, orders]);

  useEffect(() => {
    orderStatusByOrder.forEach((orderStatus) => {
      if (!orderStatus.isViewed) {
        setOrderStatusViewed(orderStatus.key);
      }
    });
  }, [orderStatusByOrder, setOrderStatusViewed]);

  useToastAutoClose(isCompleted, toastTimestamp);

  return (
    <div className={"StatusNotification"}>
      <div className="StatusNotification-content">
        <div className="StatusNotification-title">
          <Trans>Settling Positions' Fees</Trans>
        </div>

        <div className="StatusNotification-items">
          {creationStatuses}
          {executionStatuses}
        </div>
      </div>

      <div className={cx("StatusNotification-background", { error: hasError })}></div>
    </div>
  );
}
