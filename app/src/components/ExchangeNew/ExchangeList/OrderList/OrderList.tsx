import { BottomTablePagination } from '@/components/Common/Pagination/BottomTablePagination';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import { OrderItem } from '@/components/ExchangeNew/ExchangeList/OrderList/OrderItem';
import { OrderEditorContainer } from '@/components/OrderEditor/OrderEditorContainer';
import { NEW_EXCHANGE_LIST_PER_PAGE } from '@/config/ui';
import { useAnchor } from '@/contexts/anchor';
import { useOrdersData } from '@/hooks/orderHooks/useOrdersData';
import { useOrdersInfoRequest } from '@/hooks/orderHooks/useOrdersInfoRequest';
import { useTriggerCancelOrder } from '@/hooks/triggerHooks/useTriggerCancelOrder';
import { getGmw385Enabled } from '@/config/featureFlagEnable';
import { selectMarketsInfo } from '@/selectors/market/selectMarketsInfo';
import { selectIsOrdersLoading } from '@/selectors/order/baseSelectors';
import {
  Order,
  PositionOrderInfo,
  SwapOrderInfo,
  OrderType,
} from '@/selectors/order/types';
import { selectOrderEditorCancellingOrdersAddresses } from '@/selectors/orderEditor/baseSelectors';
import { selectPositionsInfo } from '@/selectors/position/selectPositionsInfo';
import { selectAvailableTokenOptions } from '@/selectors/token/selectAvailableTokenOptions';
import { selectTokensData } from '@/selectors/token/selectTokensData';
import {
  isLimitOrderType,
  isOrdersListShowType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
  isUserCreatedMarketOrderType,
} from '@/utils/order/isOrderType';
import { sortPositionOrders } from '@/utils/order/sortPositionOrders';
import { sortSwapOrders } from '@/utils/order/sortSwapOrders';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { getIconUrlPath } from '@/utils/lib/icon';
import { useAppStore } from '@/zustand/useAppStore';
import { t, Trans } from '@lingui/macro';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useMarketFilterData,
  useMarketFilter,
} from '@/components/ExchangeNew/ExchangeList/components/MarketFliter';
import { useMeasure, useMedia } from 'react-use';
import { useShallow } from 'zustand/react/shallow';
import FilterIcon from '@/img/Filter.svg?react';
import { TableScrollFadeContainer } from '@/components/Common/Table/TableScrollFade/TableScrollFade';
import FilterBox, { TreeNode } from '@/components/Common/FilterBox/FilterBox';
import { Popover } from '@headlessui/react';
import LoadingComponent from '@/utils/LoadingComponent';
import { getTableEmptyStateClass } from '@/config/tableHeights';
import { getNormalizedTokenSymbolGMX } from '@/utils/token/getNormalizedTokenSymbolGMX';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import { resolveOrderMarketData } from '@/utils/order/resolveOrderMarketData';

import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react';
type Props = {
  hideActions?: boolean;
};

function isWaitingForOrderMarketName(
  order: Order,
  marketsMap: Map<string, unknown>,
  tokenPriceMap: Map<string, unknown>
) {
  if (isSwapOrderType(order.orderType)) {
    return false;
  }

  const { indexTokenAddress, isReady } = resolveOrderMarketData(
    order,
    marketsMap,
    tokenPriceMap
  );

  return !isReady || !formatMarketName(indexTokenAddress);
}

export function OrderList({ hideActions }: Props) {
  const positionsData = useAppStore(selectPositionsInfo);
  const isLoading = useAppStore(selectIsOrdersLoading);
  const [page, setPage] = useState(1);
  const [ref, { width }] = useMeasure<HTMLDivElement>();
  const isScreenSmall = useMedia('(max-width: 1100px)');
  const isContainerSmall = width === 0 ? isScreenSmall : width < 1000;
  const isScreen1024 = useMedia('(max-width: 1024px)');
  const { owner } = useAnchor();
  const account = owner?.toBase58();

  // FilterBox
  const [selectedMarketKeys, setSelectedMarketKeys] = useState<string[]>([]);
  const [selectedTypeKeys, setSelectedTypeKeys] = useState<string[]>([]);

  const marketFilterData = useMarketFilterData();
  const { filterByMarket } = useMarketFilter(selectedMarketKeys);

  const cancellingOrdersKeys = useAppStore(
    selectOrderEditorCancellingOrdersAddresses
  );

  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const readyOrdersAccountRef = useRef<string | undefined>(undefined);
  const { orders, marketsMap, tokenPriceMap } = useAppStore(
    useShallow((state) => ({
      orders: state.orderState.orders,
      marketsMap: state.markets.marketsMap as Map<string, unknown>,
      tokenPriceMap: state.tickersState.tokenPriceMap as Map<string, unknown>,
    }))
  );

  useEffect(() => {
    if (!Object.values(orders).length) {
      readyOrdersAccountRef.current = undefined;
      setOrdersList([]);
      return;
    }

    if (!account) {
      readyOrdersAccountRef.current = undefined;
      setOrdersList([]);
      return;
    }

    if (account) {
      const entries = Object.values(orders).filter((order) => {
        return isOrdersListShowType(order?.orderType);
      });

      if (
        getGmw385Enabled() &&
        entries.some((order) =>
          isWaitingForOrderMarketName(order, marketsMap, tokenPriceMap)
        )
      ) {
        if (readyOrdersAccountRef.current !== account) {
          setOrdersList([]);
        }
        return;
      }

      const marketOrders = entries
        .filter((order) => isUserCreatedMarketOrderType(order.orderType))
        .sort((a, b) => b.time.cmp(a.time));
      const limitTriggerOrders = entries.filter(
        (order) => !isUserCreatedMarketOrderType(order.orderType)
      );

      readyOrdersAccountRef.current = account;
      setOrdersList([...marketOrders, ...limitTriggerOrders]);
    }
  }, [account, marketsMap, orders, tokenPriceMap]);

  // useMemo(() => {
  //   console.log('ordersList=========', ordersList);
  // }, [ordersList])
  const filteredOrdersList = useMemo(() => {
    if (selectedMarketKeys.length === 0 && selectedTypeKeys.length === 0) {
      return ordersList;
    }

    const filtered = ordersList.filter((order) => {
      // Market Filter
      const passMarketFilter = filterByMarket(order);

      // Type Filter
      let passTypeFilter = selectedTypeKeys.length === 0;

      if (selectedTypeKeys.length > 0) {
        if (
          selectedTypeKeys.includes('trigger-limit') &&
          isLimitOrderType(order.orderType) &&
          !isSwapOrderType(order.orderType)
        ) {
          passTypeFilter = true;
        }

        // Take Profit
        if (
          selectedTypeKeys.includes('take-profit') &&
          order.orderType === OrderType.LimitDecrease
        ) {
          passTypeFilter = true;
        }

        // Stop Loss
        if (
          selectedTypeKeys.includes('stop-loss') &&
          order.orderType === OrderType.StopLossDecrease
        ) {
          passTypeFilter = true;
        }

        // Swaps -> Limit
        if (
          selectedTypeKeys.includes('Swaps-limit') &&
          isLimitOrderType(order.orderType) &&
          isSwapOrderType(order.orderType)
        ) {
          passTypeFilter = true;
        }

        if (selectedTypeKeys.includes('trigger-orders')) {
          if (!isSwapOrderType(order.orderType)) {
            passTypeFilter = true;
          }
        }

        if (selectedTypeKeys.includes('Swaps')) {
          if (isSwapOrderType(order.orderType)) {
            passTypeFilter = true;
          }
        }
      }

      return passMarketFilter && passTypeFilter;
    });

    return filtered;
  }, [ordersList, selectedMarketKeys, selectedTypeKeys, filterByMarket]);

  const itemsPerPage = isScreen1024 ? 6 : NEW_EXCHANGE_LIST_PER_PAGE;

  const currentPageOrders = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredOrdersList.slice(startIndex, endIndex);
  }, [filteredOrdersList, page, itemsPerPage]);

  const pageCount = Math.ceil(filteredOrdersList.length / itemsPerPage);

  useEffect(() => {
    setPage(1);
  }, [isScreen1024]);

  useEffect(() => {
    setPage(1);
  }, [selectedMarketKeys, selectedTypeKeys]);

  const orderRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  const { trigger: triggerCancelOrder } = useTriggerCancelOrder();

  const onCancelOrder = useCallback(
    async (orderAddress: string, skipPreflight?: boolean) => {
      if (!orderAddress) return;
      await triggerCancelOrder({
        skipPreflight: skipPreflight || false,
        orderAddress,
      });
    },
    [triggerCancelOrder]
  );

  const handleSetRef = useCallback(
    (el: HTMLElement | null, orderKey: string) => {
      if (el === null) {
        delete orderRefs.current[orderKey];
      } else {
        orderRefs.current[orderKey] = el;
      }
    },
    []
  );

  const completeOrderTypes: TreeNode[] = [
    {
      key: 'trigger-orders',
      label: 'Trigger Orders',
      value: 'trigger-orders',
      children: [
        {
          key: 'trigger-limit',
          label: 'Limit',
          value: 'limit',
        },
        {
          key: 'take-profit',
          label: 'Take Profit',
          value: 'take-profit',
        },
        {
          key: 'stop-loss',
          label: 'Stop Loss',
          value: 'stop-loss',
        },
      ],
    },
    {
      key: 'Swaps',
      label: 'Swaps',
      value: 'Swaps',
      children: [
        {
          key: 'Swaps-limit',
          label: 'Limit',
          value: 'limit',
        },
      ],
    },
  ];
  const marketPopover = useFloating({
    middleware: [offset(10), flip(), shift()],
    strategy: 'fixed',
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
  });

  const typePopover = useFloating({
    middleware: [offset(10), flip(), shift()],
    strategy: 'fixed',
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
  });

  return (
    <div ref={ref}>
      {!isScreen1024 && (
        <div className="Exchange-list-container">
          <div className="Exchange-list-table-wrapper">
            <div className="overflow-x-auto">
              <TableScrollFadeContainer>
                <div className={getTableEmptyStateClass('tradePrimary')}>
                  <Table>
                    <thead>
                      <TableTheadTr style={{ textTransform: 'uppercase' }}>
                        <TableTh style={{ fontSize: '1.1rem', color: '#A3A3A3' }}>
                          <div className="flex items-center gap-4">
                            <span
                              style={{
                                color:
                                  selectedMarketKeys.length > 0
                                    ? '#FA7B4E'
                                    : '#A3A3A3',
                              }}
                            >
                              <Trans>Market</Trans>
                            </span>
                            {/* <Popover style={{ paddingTop: '0.4rem' }}>
                              {({ open }) => (
                                <>
                                  <Popover.Button
                                    className="cursor-pointer hover:opacity-70"
                                    ref={marketPopover.refs.setReference}
                                  >
                                    <FilterIcon
                                      width={16}
                                      height={16}
                                      fill={
                                        selectedMarketKeys.length > 0
                                          ? '#FA7B4E'
                                          : '#A3A3A3'
                                      }
                                    />
                                  </Popover.Button>
                                  {open && (
                                    <FloatingPortal>
                                      <Popover.Panel
                                        static
                                        ref={marketPopover.refs.setFloating}
                                        style={marketPopover.floatingStyles}
                                        className="z-1000 rounded-4 relative overflow-hidden border border-gray-800 bg-slate-800"
                                      >
                                        <FilterBox
                                          treeData={marketFilterData}
                                          selectedKeys={selectedMarketKeys}
                                          onChange={setSelectedMarketKeys}
                                          searchPlaceholder="Search Market"
                                          maxHeight="26rem"
                                        />
                                      </Popover.Panel>
                                    </FloatingPortal>
                                  )}
                                </>
                              )}
                            </Popover> */}
                          </div>
                        </TableTh>
                        <TableTh style={{ fontSize: '1.1rem', color: '#A3A3A3' }}>
                          <div className="flex items-center gap-4">
                            <span
                              style={{
                                color:
                                  selectedTypeKeys.length > 0
                                    ? '#FA7B4E'
                                    : '#A3A3A3',
                              }}
                            >
                              <Trans>Type</Trans>
                            </span>
                            {/* <Popover style={{ paddingTop: '0.4rem' }}>
                              {({ open }) => (
                                <>
                                  <Popover.Button
                                    className="cursor-pointer hover:opacity-70"
                                    ref={typePopover.refs.setReference}
                                  >
                                    <FilterIcon
                                      width={16}
                                      height={16}
                                      fill={
                                        selectedTypeKeys.length > 0
                                          ? '#FA7B4E'
                                          : '#A3A3A3'
                                      }
                                    />
                                  </Popover.Button>
                                  {open && (
                                    <FloatingPortal>
                                      <Popover.Panel
                                        static
                                        ref={typePopover.refs.setFloating}
                                        style={typePopover.floatingStyles}
                                        className="z-1000 rounded-8 relative overflow-hidden border border-gray-800 bg-slate-800"
                                      >
                                        <FilterBox
                                          treeData={completeOrderTypes}
                                          selectedKeys={selectedTypeKeys}
                                          onChange={setSelectedTypeKeys}
                                          searchPlaceholder="Search Type"
                                          maxHeight="26rem"
                                        />
                                      </Popover.Panel>
                                    </FloatingPortal>
                                  )}
                                </>
                              )}
                            </Popover> */}
                          </div>
                        </TableTh>
                        <TableTh style={{ fontSize: '1.1rem', color: '#A3A3A3' }}>
                          <Trans>Size</Trans>
                        </TableTh>
                        <TableTh style={{ fontSize: '1.1rem', color: '#A3A3A3' }}>
                          <Trans>Trigger Price</Trans>
                        </TableTh>
                        <TableTh style={{ fontSize: '1.1rem', color: '#A3A3A3' }}>
                          <Trans>Mark Price</Trans>
                        </TableTh>
                        {!hideActions && (
                          <>
                            <TableTh style={{ color: '#A3A3A3' }}></TableTh>
                            <TableTh style={{ color: '#A3A3A3' }}></TableTh>
                          </>
                        )}
                      </TableTheadTr>
                    </thead>
                    <tbody>
                      {currentPageOrders.length
                        ? currentPageOrders.map((order) => (
                            <OrderItem
                              key={order.orderAddress.toBase58()}
                              order={order}
                              isLarge
                              isCanceling={cancellingOrdersKeys.includes(
                                order.orderAddress.toBase58()
                              )}
                              onCancelOrder={() => {
                                void onCancelOrder(
                                  order.orderAddress.toBase58()
                                );
                              }}
                              positionsInfoData={positionsData}
                              hideActions={hideActions}
                              setRef={handleSetRef}
                            />
                          ))
                        : null}
                    </tbody>
                  </Table>
                  {filteredOrdersList.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center px-4 pointer-events-none">
                      {(isLoading && owner) || Object.values(orders).length ? (
                        <LoadingComponent />
                      ) : (
                        <div className="text-center text-[#A3A3A3] text-body-medium font-medium">
                          {selectedMarketKeys.length > 0 ||
                          selectedTypeKeys.length > 0
                            ? t`No orders matched`
                            : t`No open orders`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TableScrollFadeContainer>
            </div>
          </div>
          {filteredOrdersList?.length > 0 && (
            <div className="Exchange-list-pagination-wrapper">
              <BottomTablePagination
                page={page}
                pageCount={pageCount}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {isScreen1024 && (
        <>
          <div className="order-cards-container">
            {currentPageOrders.length === 0 ? (
              <div className="order-cards-empty">
                {(isLoading && owner) || Object.values(orders).length ? (
                  <LoadingComponent />
                ) : (
                  <div className="empty-title !text-[#A3A3A3] font-medium">
                    {selectedMarketKeys.length > 0 ||
                    selectedTypeKeys.length > 0
                      ? t`No orders matched`
                      : t`No open orders`}
                  </div>
                )}
              </div>
            ) : (
              <div className="order-cards-grid">
                {currentPageOrders.map((order) => (
                  <OrderItem
                    key={order.orderAddress.toBase58()}
                    order={order}
                    isLarge={false}
                    isCanceling={cancellingOrdersKeys.includes(
                      order.orderAddress.toBase58()
                    )}
                    onCancelOrder={() => {
                      void onCancelOrder(order.orderAddress.toBase58());
                    }}
                    positionsInfoData={positionsData}
                    hideActions={hideActions}
                    setRef={handleSetRef}
                  />
                ))}
              </div>
            )}
            {filteredOrdersList?.length > 0 && (
              <div className="Exchange-list-pagination-wrapper">
                <BottomTablePagination
                  page={page}
                  pageCount={pageCount}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        </>
      )}
      <OrderEditorContainer />
    </div>
  );
}
