import { Plural, Trans } from "@lingui/macro";
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef } from "react";

import {
  useIsOrdersLoading,
  useMarketsInfoData,
  usePositionsInfoData,
  useTokensData,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useCancellingOrdersKeysState } from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectAccount,
  selectChainId,
  selectSrcChainId,
  selectSubaccountForChainAction,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectTradeboxAvailableTokensOptions } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { estimateBatchExpressParams } from "domain/synthetics/express/expressOrderUtils";
import {
  OrderInfo,
  PositionOrderInfo,
  SwapOrderInfo,
  TwapOrderInfo,
  isLimitOrderType,
  isMarketOrderType,
  isPositionOrder,
  isSwapOrder,
  isTriggerDecreaseOrderType,
  isTwapOrder,
  sortPositionOrders,
  sortSwapOrders,
} from "domain/synthetics/orders";
import { OrderTypeFilterValue } from "domain/synthetics/orders/ordersFilters";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrdersInfoRequest } from "domain/synthetics/orders/useOrdersInfo";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import { EMPTY_ARRAY } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import { useBreakpoints } from "lib/useBreakpoints";
import useWallet from "lib/wallets/useWallet";
import { ContractsChainId } from "sdk/configs/chains";

import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { OrderEditorContainer } from "components/OrderEditorContainer/OrderEditorContainer";
import { Table, TableTh, TableTheadTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import { OrderItem } from "../OrderItem/OrderItem";
import { MarketFilterLongShort, MarketFilterLongShortItemData } from "../TableMarketFilter/MarketFilterLongShort";
import { OrderTypeFilter } from "./filters/OrderTypeFilter";

type Props = {
  hideActions?: boolean;
  setSelectedOrderKeys?: Dispatch<SetStateAction<string[]>>;
  selectedOrdersKeys?: string[];
  selectedPositionOrderKey?: string;
  setSelectedPositionOrderKey?: Dispatch<SetStateAction<string | undefined>>;
  marketsDirectionsFilter: MarketFilterLongShortItemData[];
  setMarketsDirectionsFilter: Dispatch<SetStateAction<MarketFilterLongShortItemData[]>>;
  orderTypesFilter: OrderTypeFilterValue[];
  setOrderTypesFilter: Dispatch<SetStateAction<OrderTypeFilterValue[]>>;
  onCancelSelectedOrders?: () => void;
};

export function OrderList({
  selectedOrdersKeys,
  setSelectedOrderKeys,
  selectedPositionOrderKey,
  setSelectedPositionOrderKey,
  marketsDirectionsFilter,
  orderTypesFilter,
  setMarketsDirectionsFilter,
  setOrderTypesFilter,
  hideActions,
  onCancelSelectedOrders,
}: Props) {
  const positionsData = usePositionsInfoData();
  const isLoading = useIsOrdersLoading();

  const { isTablet: isContainerSmall } = useBreakpoints();

  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const { signer } = useWallet();
  const { provider } = useJsonRpcProvider(chainId);

  const { makeOrderTxnCallback } = useOrderTxnCallbacks();

  const account = useSelector(selectAccount);
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const subaccount = useSelector(selectSubaccountForChainAction);
  const [cancellingOrdersKeys, setCancellingOrdersKeys] = useCancellingOrdersKeysState();

  const orders = useFilteredOrders({
    chainId,
    account,
    marketsDirectionsFilter: marketsDirectionsFilter,
    orderTypesFilter: orderTypesFilter,
  });

  const [onlySomeOrdersSelected, areAllOrdersSelected] = useMemo(() => {
    const onlySomeSelected =
      selectedOrdersKeys && selectedOrdersKeys.length > 0 && selectedOrdersKeys.length < orders.length;
    const allSelected = orders.length > 0 && orders.every((o) => selectedOrdersKeys?.includes(o.key));
    return [onlySomeSelected, allSelected];
  }, [selectedOrdersKeys, orders]);

  const orderRefs = useRef<{ [key: string]: HTMLElement | null }>({});

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

      return () => {
        setSelectedPositionOrderKey?.(undefined);
      };
    }
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

  async function onCancelOrder(order: OrderInfo) {
    if (!signer || !provider) return;

    const orderKeys = isTwapOrder(order) ? order.orders.map((o) => o.key) : [order.key];
    setCancellingOrdersKeys((prev) => [...prev, ...orderKeys]);

    const batchParams = {
      createOrderParams: [],
      updateOrderParams: [],
      cancelOrderParams: orderKeys.map((key) => ({ orderKey: key })),
    };

    const expressParams = await estimateBatchExpressParams({
      signer,
      chainId,
      batchParams,
      requireValidations: true,
      globalExpressParams,
      estimationMethod: "approximate",
      provider,
      isGmxAccount: srcChainId !== undefined,
      subaccount,
    });

    sendBatchOrderTxn({
      chainId,
      signer,
      batchParams,
      expressParams,
      simulationParams: undefined,
      callback: makeOrderTxnCallback({}),
      provider,
      isGmxAccount: srcChainId !== undefined,
    }).finally(() => {
      setCancellingOrdersKeys((prev) => prev.filter((k) => !orderKeys.includes(k)));
      setSelectedOrderKeys?.(EMPTY_ARRAY);
    });
  }

  const handleSetRef = useCallback((el: HTMLElement | null, orderKey: string) => {
    if (el === null) {
      delete orderRefs.current[orderKey];
    } else {
      orderRefs.current[orderKey] = el;
    }
  }, []);

  return (
    <div className="flex grow flex-col">
      {isContainerSmall && !isLoading && (
        <div className="flex grow flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-8">
            {isContainerSmall ? (
              <div className="flex gap-8">
                <Button variant="secondary" onClick={onSelectAllOrders}>
                  <Checkbox
                    isPartialChecked={onlySomeOrdersSelected}
                    isChecked={areAllOrdersSelected}
                    setIsChecked={onSelectAllOrders}
                  ></Checkbox>
                </Button>
                <MarketFilterLongShort
                  asButton
                  withPositions="withOrders"
                  value={marketsDirectionsFilter}
                  onChange={setMarketsDirectionsFilter}
                />
                <OrderTypeFilter asButton value={orderTypesFilter} onChange={setOrderTypesFilter} />
              </div>
            ) : (
              <div />
            )}
            {isContainerSmall && selectedOrdersKeys && selectedOrdersKeys.length > 0 && (
              <Button variant="secondary" onClick={onCancelSelectedOrders}>
                <Plural value={selectedOrdersKeys.length} one="Cancel order" other="Cancel # orders" />
              </Button>
            )}
          </div>
          {isContainerSmall && (
            <div className="grid gap-8 sm:grid-cols-auto-fill-350">
              {orders.map((order) => (
                <OrderItem
                  key={order.key}
                  order={order}
                  isLarge={false}
                  isSelected={selectedOrdersKeys?.includes(order.key)}
                  onToggleOrder={() => onToggleOrder(order.key)}
                  isCanceling={cancellingOrdersKeys.includes(order.key)}
                  onCancelOrder={() => onCancelOrder(order)}
                  positionsInfoData={positionsData}
                  hideActions={hideActions}
                  setRef={handleSetRef}
                />
              ))}
            </div>
          )}
          {!isContainerSmall && <div />}
        </div>
      )}

      {isContainerSmall && orders.length === 0 && (
        <EmptyTableContent
          isLoading={isLoading}
          isEmpty={orders.length === 0}
          emptyText={<Trans>No open orders</Trans>}
        />
      )}

      {!isContainerSmall && (
        <TableScrollFadeContainer disableScrollFade={orders.length === 0} className="flex grow flex-col bg-slate-900">
          <Table className="!w-[max(100%,580px)] table-fixed">
            <thead>
              <TableTheadTr>
                {!hideActions && (
                  <TableTh className="w-[48px] cursor-pointer" onClick={onSelectAllOrders}>
                    <Checkbox
                      isPartialChecked={onlySomeOrdersSelected}
                      isChecked={areAllOrdersSelected}
                      setIsChecked={onSelectAllOrders}
                    />
                  </TableTh>
                )}
                <TableTh>
                  <MarketFilterLongShort
                    withPositions="withOrders"
                    value={marketsDirectionsFilter}
                    onChange={setMarketsDirectionsFilter}
                  />
                </TableTh>
                <TableTh className="w-[10%]">
                  <OrderTypeFilter value={orderTypesFilter} onChange={setOrderTypesFilter} />
                </TableTh>
                <TableTh className="w-[15%]">
                  <Trans>Size</Trans>
                </TableTh>
                <TableTh className="w-[16%]">
                  <Trans>Trigger Price</Trans>
                </TableTh>
                <TableTh className="w-[16%]">
                  <Trans>Mark Price</Trans>
                </TableTh>

                {!hideActions && <TableTh className="w-[10%]"></TableTh>}
              </TableTheadTr>
            </thead>
            <tbody>
              {!isLoading &&
                orders.map((order) => (
                  <OrderItem
                    isLarge
                    isSelected={selectedOrdersKeys?.includes(order.key)}
                    key={order.key}
                    order={order}
                    onToggleOrder={() => onToggleOrder(order.key)}
                    isCanceling={cancellingOrdersKeys.includes(order.key)}
                    onCancelOrder={() => onCancelOrder(order)}
                    hideActions={hideActions}
                    positionsInfoData={positionsData}
                    setRef={(el) => (orderRefs.current[order.key] = el)}
                  />
                ))}
            </tbody>
          </Table>

          <EmptyTableContent
            isLoading={isLoading}
            isEmpty={orders.length === 0}
            emptyText={<Trans>No open orders</Trans>}
          />
        </TableScrollFadeContainer>
      )}

      <OrderEditorContainer />
    </div>
  );
}

function useFilteredOrders({
  chainId,
  account,
  marketsDirectionsFilter,
  orderTypesFilter,
}: {
  chainId: ContractsChainId;
  account: string | undefined;
  marketsDirectionsFilter: MarketFilterLongShortItemData[];
  orderTypesFilter: OrderTypeFilterValue[];
}) {
  const ordersResponse = useOrdersInfoRequest(chainId, {
    account: account,
    marketsDirectionsFilter: marketsDirectionsFilter,
    orderTypesFilter: orderTypesFilter,
    marketsInfoData: useMarketsInfoData(),
    tokensData: useTokensData(),
  });

  const availableTokensOptions = useSelector(selectTradeboxAvailableTokensOptions);
  const orders = useMemo(() => {
    const { sortedIndexTokensWithPoolValue, sortedLongAndShortTokens } = availableTokensOptions;

    const { swapOrders, positionOrders } = Object.values(ordersResponse.ordersInfoData || {}).reduce(
      (acc, order) => {
        if (
          isLimitOrderType(order.orderType) ||
          isTriggerDecreaseOrderType(order.orderType) ||
          isMarketOrderType(order.orderType)
        ) {
          if (isSwapOrder(order)) {
            acc.swapOrders.push(order);
          } else if (isPositionOrder(order)) {
            acc.positionOrders.push(order);
          }
        }
        return acc;
      },
      {
        swapOrders: [] as (SwapOrderInfo | TwapOrderInfo<SwapOrderInfo>)[],
        positionOrders: [] as (PositionOrderInfo | TwapOrderInfo<PositionOrderInfo>)[],
      }
    );

    return [
      ...sortPositionOrders(positionOrders, sortedIndexTokensWithPoolValue),
      ...sortSwapOrders(swapOrders, sortedLongAndShortTokens),
    ];
  }, [availableTokensOptions, ordersResponse.ordersInfoData]);

  return orders;
}
