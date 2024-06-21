import { Trans, t } from "@lingui/macro";
import values from "lodash/values";
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { useMeasure } from "react-use";

import { useSubaccount, useSubaccountCancelOrdersDetailsMessage } from "context/SubaccountContext/SubaccountContext";
import {
  useIsOrdersLoading,
  useMarketsInfoData,
  usePositionsInfoData,
  useTokensData,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useCancellingOrdersKeysState } from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { selectAccount, selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { OrderType } from "domain/synthetics/orders";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { useOrdersInfoRequest } from "domain/synthetics/orders/useOrdersInfo";
import { EMPTY_ARRAY } from "lib/objects";
import useWallet from "lib/wallets/useWallet";

import Checkbox from "components/Checkbox/Checkbox";
import { OrderEditorContainer } from "components/OrderEditorContainer/OrderEditorContainer";
import { OrderItem } from "../OrderItem/OrderItem";
import { MarketFilterLongShort, MarketFilterLongShortItemData } from "../TableMarketFilter/MarketFilterLongShort";
import { ExchangeTable, ExchangeTd, ExchangeTh, ExchangeTheadTr } from "./ExchangeTable";
import { OrderTypeFilter } from "./filters/OrderTypeFilter";

type Props = {
  hideActions?: boolean;
  setSelectedOrderKeys?: Dispatch<SetStateAction<string[]>>;
  selectedOrdersKeys?: string[];
  setPendingTxns: (txns: any) => void;
  selectedPositionOrderKey?: string;
  setSelectedPositionOrderKey?: Dispatch<SetStateAction<string | undefined>>;
};

export function OrderList(p: Props) {
  const { setSelectedOrderKeys, selectedPositionOrderKey, setSelectedPositionOrderKey } = p;
  const positionsData = usePositionsInfoData();
  const isLoading = useIsOrdersLoading();

  const [ref, { width }] = useMeasure<HTMLDivElement>();
  const isMobile = width < 1000;

  const chainId = useSelector(selectChainId);
  const { signer } = useWallet();

  const subaccount = useSubaccount(null);
  const account = useSelector(selectAccount);

  const [cancellingOrdersKeys, setCanellingOrdersKeys] = useCancellingOrdersKeysState();

  const [marketsDirectionsFilter, setMarketsDirectionsFilter] = useState<MarketFilterLongShortItemData[]>([]);
  const [orderTypesFilter, setOrderTypesFilter] = useState<OrderType[]>([]);

  const ordersRaw = useOrdersInfoRequest(chainId, {
    account: subaccount?.address ?? account,
    marketsDirectionsFilter,
    orderTypesFilter,
    marketsInfoData: useMarketsInfoData(),
    tokensData: useTokensData(),
  });
  const orders = useMemo(() => values(ordersRaw.ordersInfoData ?? {}), [ordersRaw.ordersInfoData]);

  const areAllOrdersSelected = orders.length > 0 && orders.every((o) => p.selectedOrdersKeys?.includes(o.key));
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

  function onToggleOrder(key: string) {
    setSelectedOrderKeys?.((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      }

      return prev.concat(key);
    });
  }

  function onSelectAllOrders() {
    if (areAllOrdersSelected) {
      setSelectedOrderKeys?.(EMPTY_ARRAY);
      return;
    }

    const allSelectedOrders = orders.map((o) => o.key);

    setSelectedOrderKeys?.(allSelectedOrders);
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
      setSelectedOrderKeys?.(EMPTY_ARRAY);
    });
  }

  return (
    <div ref={ref}>
      {((isMobile && orders.length === 0) || isLoading) && (
        <div className="rounded-4 bg-slate-800 p-14">{isLoading ? t`Loading...` : t`No open orders`}</div>
      )}
      {isMobile && !isLoading && orders.length !== 0 && (
        <div className="flex flex-col gap-8">
          <div className="flex gap-8">
            <MarketFilterLongShort asButton value={marketsDirectionsFilter} onChange={setMarketsDirectionsFilter} />
            <OrderTypeFilter asButton value={orderTypesFilter} onChange={setOrderTypesFilter} />
          </div>
          <div className="sm:grid-cols-auto-fill-350 grid gap-8">
            {orders.map((order) => (
              <OrderItem
                key={order.key}
                order={order}
                isLarge={false}
                isSelected={p.selectedOrdersKeys?.includes(order.key)}
                onToggleOrder={() => onToggleOrder(order.key)}
                isCanceling={cancellingOrdersKeys.includes(order.key)}
                onCancelOrder={() => onCancelOrder(order.key)}
                positionsInfoData={positionsData}
                hideActions={p.hideActions}
              />
            ))}
          </div>
        </div>
      )}

      {!isMobile && (
        <ExchangeTable>
          <thead>
            <ExchangeTheadTr>
              {!p.hideActions && orders.length > 0 && (
                <ExchangeTh>
                  <div className="checkbox-inline">
                    <Checkbox isChecked={areAllOrdersSelected} setIsChecked={onSelectAllOrders} />
                  </div>
                </ExchangeTh>
              )}
              <ExchangeTh>
                <MarketFilterLongShort value={marketsDirectionsFilter} onChange={setMarketsDirectionsFilter} />
              </ExchangeTh>
              <ExchangeTh>
                <OrderTypeFilter value={orderTypesFilter} onChange={setOrderTypesFilter} />
              </ExchangeTh>
              <ExchangeTh>
                <Trans>Order</Trans>
              </ExchangeTh>
              <ExchangeTh>
                <Trans>Trigger Price</Trans>
              </ExchangeTh>
              <ExchangeTh>
                <Trans>Mark Price</Trans>
              </ExchangeTh>
            </ExchangeTheadTr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <ExchangeTd colSpan={5}>{isLoading ? t`Loading...` : t`No open orders`}</ExchangeTd>
              </tr>
            )}
            {!isLoading &&
              orders.map((order) => (
                <OrderItem
                  isLarge
                  isSelected={p.selectedOrdersKeys?.includes(order.key)}
                  key={order.key}
                  order={order}
                  onToggleOrder={() => onToggleOrder(order.key)}
                  isCanceling={cancellingOrdersKeys.includes(order.key)}
                  onCancelOrder={() => onCancelOrder(order.key)}
                  hideActions={p.hideActions}
                  positionsInfoData={positionsData}
                  setRef={(el) => (orderRefs.current[order.key] = el)}
                />
              ))}
          </tbody>
        </ExchangeTable>
      )}

      <OrderEditorContainer />
    </div>
  );
}
