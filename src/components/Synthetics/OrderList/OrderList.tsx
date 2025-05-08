import { Plural, Trans, t } from "@lingui/macro";
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef } from "react";
import { useMeasure, useMedia } from "react-use";

import {
  useIsOrdersLoading,
  useMarketsInfoData,
  usePositionsInfoData,
  useTokensData,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useCancellingOrdersKeysState } from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import {
  makeSelectIsExpressTransactionAvailable,
  makeSelectSubaccountForActions,
  selectAccount,
  selectChainId,
  selectGasLimits,
  selectGasPaymentTokenAllowance,
  selectGasPrice,
  selectIsSponsoredCallAvailable,
  selectL1ExpressOrderGasReference,
  selectMarketsInfoData,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectExecutionFeeBufferBps } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { selectTradeboxAvailableTokensOptions } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectRelayFeeTokens } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getApproximateEstimatedExpressParams } from "domain/synthetics/express/useRelayerFeeHandler";
import {
  OrderInfo,
  PositionOrderInfo,
  SwapOrderInfo,
  TwapOrderInfo,
  isLimitOrderType,
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
import useWallet from "lib/wallets/useWallet";

import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import { OrderEditorContainer } from "components/OrderEditorContainer/OrderEditorContainer";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";

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

  const [ref, { width }] = useMeasure<HTMLDivElement>();
  const isScreenSmall = useMedia("(max-width: 1100px)");
  const isContainerSmall = width === 0 ? isScreenSmall : width < 1000;

  const chainId = useSelector(selectChainId);
  const { signer } = useWallet();

  const { makeOrderTxnCallback } = useOrderTxnCallbacks();
  const subaccount = useSelector(makeSelectSubaccountForActions(1));
  const account = useSelector(selectAccount);
  const tokensData = useSelector(selectTokensData);
  const relayFeeTokens = useSelector(selectRelayFeeTokens);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const gasPrice = useSelector(selectGasPrice);
  const executionFeeBufferBps = useSelector(selectExecutionFeeBufferBps);
  const gasLimits = useSelector(selectGasLimits);
  const l1Reference = useSelector(selectL1ExpressOrderGasReference);
  const gasPaymentAllowance = useSelector(selectGasPaymentTokenAllowance);
  const isExpressEnabled = useSelector(makeSelectIsExpressTransactionAvailable(false));
  const isSponsoredCallAvailable = useSelector(selectIsSponsoredCallAvailable);

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
    if (!signer) return;

    const orderKeys = isTwapOrder(order) ? order.orders.map((o) => o.key) : [order.key];
    setCancellingOrdersKeys((prev) => [...prev, ...orderKeys]);

    const batchParams = {
      createOrderParams: [],
      updateOrderParams: [],
      cancelOrderParams: orderKeys.map((key) => ({ orderKey: key })),
    };

    let approximateExpressParams = isExpressEnabled
      ? await getApproximateEstimatedExpressParams({
          signer,
          chainId,
          batchParams,
          subaccount,
          gasPaymentTokenAddress: relayFeeTokens.gasPaymentToken?.address,
          tokensData,
          marketsInfoData,
          tokenPermits: [],
          findSwapPath: relayFeeTokens.findSwapPath,
          gasPrice,
          gasPaymentAllowanceData: gasPaymentAllowance?.tokensAllowanceData,
          gasLimits,
          l1Reference,
          bufferBps: executionFeeBufferBps,
          isSponsoredCall: isSponsoredCallAvailable,
        })
      : undefined;

    // There is no UI to request an approval
    if (approximateExpressParams?.expressParams?.relayFeeParams.needGasPaymentTokenApproval) {
      approximateExpressParams = undefined;
    }

    sendBatchOrderTxn({
      chainId,
      signer,
      batchParams,
      expressParams: approximateExpressParams?.expressParams,
      simulationParams: undefined,
      callback: makeOrderTxnCallback({}),
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
    <div ref={ref}>
      {(isContainerSmall || isScreenSmall) && !isLoading && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-8 bg-slate-950">
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
            {isScreenSmall && selectedOrdersKeys && selectedOrdersKeys.length > 0 && (
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
        <div className="rounded-4 bg-slate-800 p-14 text-slate-100">
          {isLoading ? t`Loading...` : t`No open orders`}
        </div>
      )}

      {!isContainerSmall && (
        <Table>
          <thead>
            <TableTheadTr bordered>
              {!hideActions && (
                <TableTh className="cursor-pointer" onClick={onSelectAllOrders}>
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
              <TableTh>
                <OrderTypeFilter value={orderTypesFilter} onChange={setOrderTypesFilter} />
              </TableTh>
              <TableTh>
                <Trans>Size</Trans>
              </TableTh>
              <TableTh>
                <Trans>Trigger Price</Trans>
              </TableTh>
              <TableTh>
                <Trans>Mark Price</Trans>
              </TableTh>

              {!hideActions && <TableTh></TableTh>}
            </TableTheadTr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <TableTr hoverable={false} bordered={false}>
                <TableTd colSpan={7} className="text-slate-100">
                  {isLoading ? t`Loading...` : t`No open orders`}
                </TableTd>
              </TableTr>
            )}
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
  chainId: number;
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
        if (isLimitOrderType(order.orderType) || isTriggerDecreaseOrderType(order.orderType)) {
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
