import { Trans, t } from "@lingui/macro";
import { isLimitOrder, isStopMarketOrder } from "domain/synthetics/orders";
import { useAggregatedOrdersData } from "domain/synthetics/orders/useAggregatedOrdersData";
import { useChainId } from "lib/chains";
import { OrderItem } from "../OrderItem/OrderItem";
import Checkbox from "components/Checkbox/Checkbox";
import { useState } from "react";

type Props = {
  hideActions?: boolean;
};

export function OrderList(p: Props) {
  const { chainId } = useChainId();
  const [selectedOrders, setSelectedOrders] = useState<{ [key: string]: boolean }>({});

  const { aggregatedOrdersData, isLoading } = useAggregatedOrdersData(chainId);

  const orders = Object.values(aggregatedOrdersData).filter(
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
          <div className="Exchange-empty-positions-list-note App-card">{isLoading ? t`Loading...` : t`No orders`}</div>
        )}
        {!isLoading && orders.map((order) => <OrderItem key={order.key} order={order} isLarge={false} />)}
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
          {!isLoading &&
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
