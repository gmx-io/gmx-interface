import { Trans, plural, t } from "@lingui/macro";
import { TransactionStatus, TransactionStatusType } from "components/TransactionStatus/TransactionStatus";
import {
  OrderStatus,
  PendingFundingFeeSettlementData,
  PendingOrderData,
  getPendingOrderKey,
  useSyntheticsEvents,
} from "context/SyntheticsEvents";
import { MarketInfo, MarketsInfoData, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { isMarketOrderType } from "domain/synthetics/orders";
import { getByKey } from "lib/objects";
import { useEffect, useMemo, useState } from "react";
import "./StatusNotification.scss";
import { useToastAutoClose } from "./useToastAutoClose";
import { StatusNotification } from "./StatusNotification";

type Props = {
  toastTimestamp: number;
  orders: PendingFundingFeeSettlementData["orders"];
  marketsInfoData: MarketsInfoData | undefined;
};

export function FeesSettlementStatusNotification({ orders, toastTimestamp, marketsInfoData }: Props) {
  const { orderStatuses: allOrderStatuses, setOrderStatusViewed } = useSyntheticsEvents();

  const [matchedOrderStatusKeys, setMatchedOrderStatusKeys] = useState<string[]>([]);
  const matchedOrderStatuses = useMemo(
    () => matchedOrderStatusKeys.map((key) => allOrderStatuses[key]),
    [allOrderStatuses, matchedOrderStatusKeys]
  );

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

  useEffect(() => {
    Object.values(allOrderStatuses).forEach((orderStatus) => {
      if (orderStatus.isViewed || !orderStatus.data) return;
      const key = getPendingOrderKey(orderStatus.data);
      const order = orderByKey.get(key);
      if (order) {
        if (getPendingOrderKey(order) === getPendingOrderKey(orderStatus.data)) {
          setMatchedOrderStatusKeys((prev) => [...prev, orderStatus.key]);
          setOrderStatusViewed(orderStatus.key);
        }
      }
    });
  }, [allOrderStatuses, orderByKey, setOrderStatusViewed]);

  const orderStatusByOrder = useMemo(() => {
    const res = new Map<PendingOrderData, OrderStatus>();
    matchedOrderStatuses.forEach((orderStatus) => {
      if (!orderStatus.data) return;
      const key = getPendingOrderKey(orderStatus.data);
      const order = orderByKey.get(key);
      if (order) {
        res.set(order, orderStatus);
      }
    });
    return res;
  }, [matchedOrderStatuses, orderByKey]);

  const isCompleted = useMemo(() => {
    return orders.every((order) => {
      const orderStatus = orderStatusByOrder.get(order);
      return orderStatus?.executedTxnHash ?? orderStatus?.cancelledTxnHash;
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

    return orders.reduce(
      (acc, order) => {
        const marketInfo = getByKey(marketsInfoData, order.marketAddress);
        const key = keyByOrder.get(order);

        if (!key) throw new Error("key not found");

        return {
          ...acc,
          [key]: marketInfo,
        };
      },
      {} as Record<string, MarketInfo | undefined>
    );
  }, [keyByOrder, marketsInfoData, orders]);

  const creationStatus = useMemo(() => {
    const order = orders[0];
    const key = keyByOrder.get(order);
    if (!key) throw new Error("key not found");

    const orderStatus = orderStatusByOrder.get(order);

    let text = t`Sending settle request`;
    let status: TransactionStatusType = "loading";

    if (orderStatus?.createdTxnHash) {
      text = t`Settle request for ${plural(orders.length, { one: "# position", other: "# positions" })} sent`;
      status = "success";
    }
    return <TransactionStatus status={status} txnHash={orderStatus?.createdTxnHash} text={text} />;
  }, [keyByOrder, orderStatusByOrder, orders]);

  const executionStatuses = useMemo(() => {
    return (
      <>
        {orders.map((order) => {
          if (!order || !isMarketOrderType(order.orderType)) {
            return null;
          }

          const orderStatus = orderStatusByOrder.get(order);

          if (!orderStatus) return null;

          const key = keyByOrder.get(order);
          if (!key) throw new Error("key not found");
          const marketInfo = marketInfoByKey?.[key];

          if (!marketInfo) throw new Error("marketInfo not found");

          const indexName = getMarketIndexName(marketInfo);
          const poolName = getMarketPoolName(marketInfo);
          const positionName = (
            <Trans>
              <span>{order.isLong ? t`Long` : t`Short`}</span>{" "}
              <div className="inline-flex">
                <span>{indexName}</span>
                <span className="subtext gm-toast">[{poolName}]</span>
              </div>
            </Trans>
          );

          let text = <Trans>{positionName} Fees settling</Trans>;
          let status: TransactionStatusType = "muted";
          let txnHash: string | undefined;

          if (orderStatus?.createdTxnHash) {
            status = "loading";
          }

          if (orderStatus?.executedTxnHash) {
            text = <Trans>{positionName} Fees settled</Trans>;
            status = "success";
            txnHash = orderStatus?.executedTxnHash;
          }

          if (orderStatus?.cancelledTxnHash) {
            text = <Trans>{positionName} Failed to settle</Trans>;
            status = "error";
            txnHash = orderStatus?.cancelledTxnHash;
          }

          return <TransactionStatus key={keyByOrder.get(order)} status={status} txnHash={txnHash} text={text} />;
        })}
      </>
    );
  }, [keyByOrder, marketInfoByKey, orderStatusByOrder, orders]);

  useToastAutoClose(isCompleted, toastTimestamp);

  return (
    <StatusNotification title={t`Settling Positions' Fees`} hasError={hasError}>
      {creationStatus}
      {executionStatuses}
    </StatusNotification>
  );
}
