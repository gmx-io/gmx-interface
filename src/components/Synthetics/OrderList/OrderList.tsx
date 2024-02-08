import { Trans, t } from "@lingui/macro";
import Checkbox from "components/Checkbox/Checkbox";
import { MarketsInfoData } from "domain/synthetics/markets";
import { OrdersInfoData, isLimitOrderType, isTriggerDecreaseOrderType } from "domain/synthetics/orders";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { PositionsInfoData } from "domain/synthetics/positions";
import { TokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { OrderEditor } from "../OrderEditor/OrderEditor";
import { OrderItem } from "../OrderItem/OrderItem";
import {
  useIsLastSubaccountAction,
  useSubaccount,
  useSubaccountCancelOrdersDetailsMessage,
} from "context/SubaccountContext/SubaccountContext";

type Props = {
  hideActions?: boolean;
  ordersData?: OrdersInfoData;
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  positionsData?: PositionsInfoData;
  setSelectedOrdersKeys?: Dispatch<SetStateAction<{ [key: string]: boolean }>>;
  selectedOrdersKeys?: { [key: string]: boolean };
  isLoading: boolean;
  setPendingTxns: (txns: any) => void;
  selectedPositionOrderKey?: string;
  setSelectedPositionOrderKey?: Dispatch<SetStateAction<string | undefined>>;
};

export function OrderList(p: Props) {
  const {
    marketsInfoData,
    tokensData,
    positionsData,
    selectedPositionOrderKey,
    setSelectedPositionOrderKey,
    setSelectedOrdersKeys,
  } = p;
  const { chainId } = useChainId();
  const { signer } = useWallet();

  const [canellingOrdersKeys, setCanellingOrdersKeys] = useState<string[]>([]);
  const [editingOrderKey, setEditingOrderKey] = useState<string>();

  const subaccount = useSubaccount(null);

  const orders = Object.values(p.ordersData || {}).filter(
    (order) => isLimitOrderType(order.orderType) || isTriggerDecreaseOrderType(order.orderType)
  );

  const isAllOrdersSelected = orders.length > 0 && orders.every((o) => p.selectedOrdersKeys?.[o.key]);
  const editingOrder = orders.find((o) => o.key === editingOrderKey);
  const isLastSubaccountAction = useIsLastSubaccountAction();
  const cancelOrdersDetailsMessage = useSubaccountCancelOrdersDetailsMessage(undefined, 1);

  const orderRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (selectedPositionOrderKey) {
      const orderElement = orderRefs.current[selectedPositionOrderKey];
      if (orderElement) {
        const rect = orderElement.getBoundingClientRect();
        const isInViewPort =
          rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;

        if (!isInViewPort) {
          orderElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }

    return () => {
      setSelectedPositionOrderKey?.(undefined);
    };
  }, [selectedPositionOrderKey, setSelectedPositionOrderKey]);

  function onSelectOrder(key: string) {
    setSelectedOrdersKeys?.((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function onSelectAllOrders() {
    if (isAllOrdersSelected) {
      setSelectedOrdersKeys?.({});
      return;
    }

    const allSelectedOrders = orders.reduce((acc, order) => ({ ...acc, [order.key]: true }), {});

    setSelectedOrdersKeys?.(allSelectedOrders);
  }

  function onCancelOrder(key: string) {
    if (!signer) return;
    setCanellingOrdersKeys((prev) => [...prev, key]);

    cancelOrdersTxn(chainId, signer, subaccount, {
      orderKeys: [key],
      setPendingTxns: p.setPendingTxns,
      isLastSubaccountAction,
      detailsMsg: cancelOrdersDetailsMessage,
    }).finally(() => setCanellingOrdersKeys((prev) => prev.filter((k) => k !== key)));
  }

  return (
    <>
      {orders.length === 0 && (
        <div className="Exchange-empty-positions-list-note App-card small">
          {p.isLoading ? t`Loading...` : t`No open orders`}
        </div>
      )}
      <div className="Exchange-list Orders small">
        {!p.isLoading &&
          orders.map((order) => {
            return (
              <OrderItem
                key={order.key}
                order={order}
                isLarge={false}
                isSelected={p.selectedOrdersKeys?.[order.key]}
                onSelectOrder={() => onSelectOrder(order.key)}
                isCanceling={canellingOrdersKeys.includes(order.key)}
                onCancelOrder={() => onCancelOrder(order.key)}
                onEditOrder={() => setEditingOrderKey(order.key)}
                marketsInfoData={marketsInfoData}
                positionsInfoData={positionsData}
                hideActions={p.hideActions}
              />
            );
          })}
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
                <Trans>Trigger Price</Trans>
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
            orders.map((order) => {
              return (
                <OrderItem
                  isSelected={p.selectedOrdersKeys?.[order.key]}
                  key={order.key}
                  order={order}
                  isLarge={true}
                  onSelectOrder={() => onSelectOrder(order.key)}
                  isCanceling={canellingOrdersKeys.includes(order.key)}
                  onCancelOrder={() => onCancelOrder(order.key)}
                  onEditOrder={() => setEditingOrderKey(order.key)}
                  hideActions={p.hideActions}
                  marketsInfoData={marketsInfoData}
                  positionsInfoData={positionsData}
                  ref={(el) => (orderRefs.current[order.key] = el)}
                />
              );
            })}
        </tbody>
      </table>

      {editingOrder && (
        <OrderEditor
          marketsInfoData={marketsInfoData}
          tokensData={tokensData}
          positionsData={positionsData}
          order={editingOrder}
          onClose={() => setEditingOrderKey(undefined)}
          setPendingTxns={p.setPendingTxns}
        />
      )}
    </>
  );
}
