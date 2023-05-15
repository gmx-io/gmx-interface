import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import Checkbox from "components/Checkbox/Checkbox";
import { OrdersInfoData, isLimitOrderType, isTriggerDecreaseOrderType } from "domain/synthetics/orders";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { PositionsInfoData } from "domain/synthetics/positions";
import { useChainId } from "lib/chains";
import { Dispatch, SetStateAction, useState } from "react";
import { OrderEditor } from "../OrderEditor/OrderEditor";
import { OrderItem } from "../OrderItem/OrderItem";

type Props = {
  hideActions?: boolean;
  ordersData?: OrdersInfoData;
  positionsData?: PositionsInfoData;
  setSelectedOrdersKeys?: Dispatch<SetStateAction<{ [key: string]: boolean }>>;
  selectedOrdersKeys?: { [key: string]: boolean };
  isLoading: boolean;
  setPendingTxns: (txns: any) => void;
};

export function OrderList(p: Props) {
  const { chainId } = useChainId();
  const { library } = useWeb3React();

  const [canellingOrdersKeys, setCanellingOrdersKeys] = useState<string[]>([]);
  const [editingOrderKey, setEditingOrderKey] = useState<string>();

  const orders = Object.values(p.ordersData || {}).filter(
    (order) => isLimitOrderType(order.orderType) || isTriggerDecreaseOrderType(order.orderType)
  );

  const isAllOrdersSelected = orders.length > 0 && orders.every((o) => p.selectedOrdersKeys?.[o.key]);
  const editingOrder = orders.find((o) => o.key === editingOrderKey);

  function onSelectOrder(key: string) {
    p.setSelectedOrdersKeys?.((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function onSelectAllOrders() {
    if (isAllOrdersSelected) {
      p.setSelectedOrdersKeys?.({});
      return;
    }

    const allSelectedOrders = orders.reduce((acc, order) => ({ ...acc, [order.key]: true }), {});

    p.setSelectedOrdersKeys?.(allSelectedOrders);
  }

  function onCancelOrder(key: string) {
    setCanellingOrdersKeys((prev) => [...prev, key]);

    cancelOrdersTxn(chainId, library, { orderKeys: [key], setPendingTxns: p.setPendingTxns }).finally(() =>
      setCanellingOrdersKeys((prev) => prev.filter((k) => k !== key))
    );
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
                isSelected={p.selectedOrdersKeys?.[order.key]}
                key={order.key}
                order={order}
                isLarge={true}
                onSelectOrder={() => onSelectOrder(order.key)}
                isCanceling={canellingOrdersKeys.includes(order.key)}
                onCancelOrder={() => onCancelOrder(order.key)}
                onEditOrder={() => setEditingOrderKey(order.key)}
              />
            ))}
        </tbody>
      </table>

      {editingOrder && (
        <OrderEditor
          positionsData={p.positionsData || {}}
          order={editingOrder}
          onClose={() => setEditingOrderKey(undefined)}
          setPendingTxns={p.setPendingTxns}
        />
      )}
    </>
  );
}
