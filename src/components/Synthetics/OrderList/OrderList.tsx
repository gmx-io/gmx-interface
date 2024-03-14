import { Trans, t } from "@lingui/macro";
import { Dispatch, SetStateAction, useEffect, useRef } from "react";

import { useSubaccount, useSubaccountCancelOrdersDetailsMessage } from "context/SubaccountContext/SubaccountContext";
import {
  useIsOrdersLoading,
  useMarketsInfoData,
  usePositionsInfoData,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

import Checkbox from "components/Checkbox/Checkbox";
import {
  useCancellingOrdersKeysState,
  useEditingOrderKeyState,
} from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { selectEditingOrder, selectOrdersList } from "context/SyntheticsStateContext/selectors/orderEditorSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { OrderEditor } from "../OrderEditor/OrderEditor";
import { OrderItem } from "../OrderItem/OrderItem";

type Props = {
  hideActions?: boolean;
  setSelectedOrdersKeys?: Dispatch<SetStateAction<{ [key: string]: boolean }>>;
  selectedOrdersKeys?: { [key: string]: boolean };
  setPendingTxns: (txns: any) => void;
  selectedPositionOrderKey?: string;
  setSelectedPositionOrderKey?: Dispatch<SetStateAction<string | undefined>>;
};

export function OrderList(p: Props) {
  const { setSelectedOrdersKeys, selectedPositionOrderKey, setSelectedPositionOrderKey } = p;
  const marketsInfoData = useMarketsInfoData();
  const positionsData = usePositionsInfoData();
  const isLoading = useIsOrdersLoading();

  const { chainId } = useChainId();
  const { signer } = useWallet();

  const subaccount = useSubaccount(null);

  const [canellingOrdersKeys, setCanellingOrdersKeys] = useCancellingOrdersKeysState();
  const [, setEditingOrderKey] = useEditingOrderKeyState();
  const editingOrder = useSelector(selectEditingOrder);
  const orders = useSelector(selectOrdersList);

  const isAllOrdersSelected = orders.length > 0 && orders.every((o) => p.selectedOrdersKeys?.[o.key]);
  const cancelOrdersDetailsMessage = useSubaccountCancelOrdersDetailsMessage(undefined, 1);

  const orderRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>({});

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
      detailsMsg: cancelOrdersDetailsMessage,
    }).finally(() => {
      setCanellingOrdersKeys((prev) => prev.filter((k) => k !== key));
      setSelectedOrdersKeys?.({});
    });
  }

  return (
    <>
      {orders.length === 0 && (
        <div className="Exchange-empty-positions-list-note App-card small">
          {isLoading ? t`Loading...` : t`No open orders`}
        </div>
      )}
      <div className="Exchange-list Orders small">
        {!isLoading &&
          orders.map((order) => (
            <OrderItem
              key={order.key}
              order={order}
              isLarge={false}
              isSelected={p.selectedOrdersKeys?.[order.key]}
              onSelectOrder={() => onSelectOrder(order.key)}
              isCanceling={canellingOrdersKeys.includes(order.key)}
              onCancelOrder={() => onCancelOrder(order.key)}
              marketsInfoData={marketsInfoData}
              positionsInfoData={positionsData}
              hideActions={p.hideActions}
            />
          ))}
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
              <td colSpan={5}>{isLoading ? t`Loading...` : t`No open orders`}</td>
            </tr>
          )}
          {!isLoading &&
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
                  hideActions={p.hideActions}
                  marketsInfoData={marketsInfoData}
                  positionsInfoData={positionsData}
                  setRef={(el) => (orderRefs.current[order.key] = el)}
                />
              );
            })}
        </tbody>
      </table>

      {editingOrder && (
        <OrderEditor
          order={editingOrder}
          onClose={() => setEditingOrderKey(undefined)}
          setPendingTxns={p.setPendingTxns}
        />
      )}
    </>
  );
}
