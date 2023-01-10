import { Trans, t } from "@lingui/macro";
import { AggregatedOrdersData, isLimitOrder, isStopMarketOrder } from "domain/synthetics/orders";
import { OrderItem } from "../OrderItem/OrderItem";
import Checkbox from "components/Checkbox/Checkbox";
import { useState } from "react";

type Props = {
  hideActions?: boolean;
  ordersData: AggregatedOrdersData;
  isLoading: boolean;
};

export function OrderList(p: Props) {
  const [selectedOrders, setSelectedOrders] = useState<{ [key: string]: boolean }>({});

  const orders = Object.values(p.ordersData).filter(
    (order) => isLimitOrder(order.orderType) || isStopMarketOrder(order.orderType)
  );

  const isAllOrdersSelected = orders.length > 0 && orders.every((o) => selectedOrders[o.key]);

  function onSelectOrder(key: string) {
    setSelectedOrders((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function onSelectAllOrders() {
    if (isAllOrdersSelected) setSelectedOrders({});

    const allSelectedOrders = orders.reduce((acc, order) => ({ ...acc, [order.key]: true }), {});
    setSelectedOrders(allSelectedOrders);
  }

  return (
    <>
      <div className="Exchange-list Orders small">
        {orders.length === 0 && (
          <div className="Exchange-empty-positions-list-note App-card">
            {p.isLoading ? t`Loading...` : t`No open orders`}
          </div>
        )}
        {!p.isLoading && orders.map((order) => <OrderItem key={order.key} order={order} isLarge={false} />)}
      </div>

      <table className="Exchange-list Orders large App-box">
        <tbody>
          <tr className="Exchange-list-header">
            {!p.hideActions && orders.length > 0 && (
              <th>
                <div className="checkbox-inline ">
                  <Checkbox isChecked={isAllOrdersSelected} setIsChecked={onSelectAllOrders} />
                </div>
              </th>
            )}

            <th>
              <div>
                <Trans>Type</Trans>
              </div>
            </th>
            <th>
              <div>
                <Trans>Order</Trans>
              </div>
            </th>
            <th>
              <div>
                <Trans>Price</Trans>
              </div>
            </th>
            <th>
              <div>
                <Trans>Mark Price</Trans>
              </div>
            </th>
          </tr>
          {orders.length === 0 && (
            <tr>
              <td colSpan={5}>{p.isLoading ? t`Loading...` : t`No open orders`}</td>
            </tr>
          )}
          {!p.isLoading &&
            orders.map((order) => (
              <OrderItem
                isSelected={selectedOrders[order.key]}
                onSelectOrder={() => onSelectOrder(order.key)}
                key={order.key}
                order={order}
                isLarge={true}
              />
            ))}
        </tbody>
      </table>
    </>
  );
}
