import { Trans, plural, t } from "@lingui/macro";
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
      if (order) {
        res.set(order, orderStatus);
      }
    });
    return res;
  }, [orderByKey, orderStatuses]);

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

  const creationStatus = useMemo(() => {
    const order = orders[0];
    const key = keyByOrder.get(order);
    if (!key) throw new Error("key not found");

    const orderStatus = orderStatusByOrder.get(order);

    let text = t`Sending order request`;
    let status: TransactionStatusType = "loading";

    if (orderStatus?.createdTxnHash) {
      text = t`Settling Fees for ${plural(orders.length, { one: "# position", other: "# positions" })}`;
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

          const positionName = `${order.isLong ? t`Long` : t`Short`} ${marketInfo.name}`;

          let text = t`${positionName} Fees settling`;
          let status: TransactionStatusType = "muted";
          let txnHash: string | undefined;

          if (orderStatus?.createdTxnHash) {
            status = "loading";
          }

          if (orderStatus?.executedTxnHash) {
            text = t`${positionName} Fees settled`;
            status = "success";
            txnHash = orderStatus?.executedTxnHash;
          }

          if (orderStatus?.cancelledTxnHash) {
            text = t`${positionName} Failed to settle`;
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
          {creationStatus}
          {executionStatuses}
        </div>
      </div>

      <div className={cx("StatusNotification-background", { error: hasError })}></div>
    </div>
  );
}
