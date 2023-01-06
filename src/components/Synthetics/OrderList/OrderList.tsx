import { Trans } from "@lingui/macro";
import { OrderItem } from "components/Synthetics/OrderItem/OrderItem";
import { OrderType, getOrders } from "domain/synthetics/orders";
import { useOrdersData } from "domain/synthetics/orders/useOrdersData";
import { useChainId } from "lib/chains";

export function OrderList() {
  const { chainId } = useChainId();

  const { ordersData } = useOrdersData(chainId);

  const orders = getOrders(ordersData)
    .filter((order) => [OrderType.LimitIncrease, OrderType.LimitIncrease, OrderType.LimitSwap].includes(order.type))
    .reverse();

  return (
    <div>
      <table className="Exchange-list Orders App-box">
        <tbody>
          <tr className="Exchange-list-header">
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
          </tr>
          {orders.map((order) => (
            <OrderItem key={order.key} order={order} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
