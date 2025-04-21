import { Plural, Trans, t } from "@lingui/macro";
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef } from "react";
import { useMeasure, useMedia } from "react-use";

import { useSubaccountCancelOrdersDetailsMessage } from "context/SubaccountContext/useSubaccountCancelOrdersDetailsMessage";
import {
  useIsOrdersLoading,
  useMarketsInfoData,
  usePositionsInfoData,
  useTokensData,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useCancellingOrdersKeysState } from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import {
  makeSelectSubaccountForActions,
  selectAccount,
  selectChainId,
  selectGasPrice,
  selectMarketsInfoData,
  selectSponsoredCallMultiplierFactor,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectTradeboxAvailableTokensOptions } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectRelayFeeTokens } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { sendUniversalBatchTxn } from "domain/synthetics/gassless/txns/universalTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/gassless/txns/useOrderTxnCallbacks";
import {
  getExpressCancelOrdersParams,
  useGasPaymentTokenAllowanceData,
} from "domain/synthetics/gassless/useRelayerFeeHandler";
import {
  OrderType,
  PositionOrderInfo,
  SwapOrderInfo,
  isLimitOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
  sortPositionOrders,
  sortSwapOrders,
} from "domain/synthetics/orders";
import { useOrdersInfoRequest } from "domain/synthetics/orders/useOrdersInfo";
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
  orderTypesFilter: OrderType[];
  setOrderTypesFilter: Dispatch<SetStateAction<OrderType[]>>;
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

  const { makeCancelOrderTxnCallback } = useOrderTxnCallbacks();
  const subaccount = useSelector(makeSelectSubaccountForActions(1));
  const account = useSelector(selectAccount);
  const tokensData = useSelector(selectTokensData);
  const relayFeeTokens = useSelector(selectRelayFeeTokens);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const sponsoredCallMultiplierFactor = useSelector(selectSponsoredCallMultiplierFactor);
  const gasPrice = useSelector(selectGasPrice);
  const gasPaymentAllowanceData = useGasPaymentTokenAllowanceData(chainId, relayFeeTokens.gasPaymentToken?.address);

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

  const cancelOrdersDetailsMessage = useSubaccountCancelOrdersDetailsMessage(1);

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

  async function onCancelOrder(key: string) {
    if (!signer) return;
    setCancellingOrdersKeys((prev) => [...prev, key]);

    const expressParams = await getExpressCancelOrdersParams({
      signer,
      chainId,
      params: [{ orderKey: key }],
      subaccount,
      gasPaymentTokenAddress: relayFeeTokens.gasPaymentToken?.address,
      tokensData,
      marketsInfoData,
      findSwapPath: relayFeeTokens.findSwapPath,
      sponsoredCallMultiplierFactor,
      gasPrice,
      gasPaymentAllowanceData,
    });

    sendUniversalBatchTxn({
      chainId,
      signer,
      batchParams: {
        createOrderParams: [],
        updateOrderParams: [],
        cancelOrderParams: [{ orderKey: key }],
      },
      expressParams,
      simulationParams: undefined,
      callback: makeCancelOrderTxnCallback({
        metricId: undefined,
        slippageInputId: undefined,
        showPreliminaryMsg: Boolean(expressParams?.subaccount),
        detailsMsg: cancelOrdersDetailsMessage,
      }),
    }).finally(() => {
      setCancellingOrdersKeys((prev) => prev.filter((k) => k !== key));
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
      {isContainerSmall && orders.length === 0 && (
        <div className="rounded-4 bg-slate-800 p-14 text-slate-100">
          {isLoading ? t`Loading...` : t`No open orders`}
        </div>
      )}

      {(isContainerSmall || isScreenSmall) && !isLoading && orders.length !== 0 && (
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
                  onCancelOrder={() => onCancelOrder(order.key)}
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
                  onCancelOrder={() => onCancelOrder(order.key)}
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
  orderTypesFilter: OrderType[];
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
          if (isSwapOrderType(order.orderType)) {
            acc.swapOrders.push(order);
          } else {
            acc.positionOrders.push(order as PositionOrderInfo);
          }
        }
        return acc;
      },
      { swapOrders: [] as SwapOrderInfo[], positionOrders: [] as PositionOrderInfo[] }
    );

    return [
      ...sortPositionOrders(positionOrders, sortedIndexTokensWithPoolValue),
      ...sortSwapOrders(swapOrders, sortedLongAndShortTokens),
    ];
  }, [availableTokensOptions, ordersResponse.ordersInfoData]);
  return orders;
}
