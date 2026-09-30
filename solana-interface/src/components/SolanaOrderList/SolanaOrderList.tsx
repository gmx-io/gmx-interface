import { Trans } from "@lingui/macro";
import { useMemo } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import type { OrderTypeFilterValue } from "domain/synthetics/orders/ordersFilters";
import { useBreakpoints } from "lib/useBreakpoints";

import Button from "components/Button/Button";
import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { OrderTypeFilter } from "components/OrderList/filters/OrderTypeFilter";
import { Table, TableTh, TableTheadTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import { SolanaMarketFilter } from "./SolanaMarketFilter";
import { SolanaOrderCard, SolanaOrderRow } from "./SolanaOrderItem";
import {
  filterSolanaOrders,
  getSolanaPositionsWithOrders,
  SOLANA_ORDER_TYPE_FILTER_VALUES,
  type SolanaMarketFilterItem,
} from "../../hooks/orders/orderFilters";
import type { SolanaOrderViewModel } from "../../hooks/orders/types";
import type { SolanaPositionViewModel } from "../../hooks/positions/types";

export type SolanaOrderListProps = {
  /** Every displayable order of the wallet; the list derives the filtered view itself. */
  orders: readonly SolanaOrderViewModel[];
  /** Wallet positions, for the "Open positions with orders" filter group. */
  positions: readonly SolanaPositionViewModel[];
  marketsDirectionsFilter: SolanaMarketFilterItem[];
  setMarketsDirectionsFilter: (value: SolanaMarketFilterItem[]) => void;
  orderTypesFilter: OrderTypeFilterValue[];
  setOrderTypesFilter: (value: OrderTypeFilterValue[]) => void;
  isWalletConnected: boolean;
  isLoading: boolean;
  isMarketDataPending: boolean;
  error: Error | null;
  onRetry: () => void;
};

function SolanaOrdersErrorBanner({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="text-body-small flex items-center justify-between gap-12 px-20 py-8 text-typography-secondary">
      <span className="truncate">{error.message}</span>
      <Button variant="secondary" onClick={onRetry}>
        <Trans>Retry</Trans>
      </Button>
    </div>
  );
}

function SolanaOrdersError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex min-h-[164px] flex-col items-center justify-center gap-12 px-20 text-center">
      <div className="text-typography-secondary">
        <Trans>Failed to load orders.</Trans>
      </div>
      <div className="text-body-small text-typography-secondary">{error.message}</div>
      <Button variant="secondary" onClick={onRetry}>
        <Trans>Retry</Trans>
      </Button>
    </div>
  );
}

/** Read-only Solana orders (GMX `OrderList` layout): desktop table (>1024px) or mobile cards, with market / type filters. */
export function SolanaOrderList({
  orders,
  positions,
  marketsDirectionsFilter,
  setMarketsDirectionsFilter,
  orderTypesFilter,
  setOrderTypesFilter,
  isWalletConnected,
  isLoading,
  isMarketDataPending,
  error,
  onRetry,
}: SolanaOrderListProps) {
  const { isTablet } = useBreakpoints();
  const { isSetAcceptablePriceImpactEnabled } = useSettings();

  const filteredOrders = useMemo(
    () => filterSolanaOrders(orders, marketsDirectionsFilter, orderTypesFilter),
    [orders, marketsDirectionsFilter, orderTypesFilter]
  );
  const positionsWithOrders = useMemo(() => getSolanaPositionsWithOrders(positions, orders), [positions, orders]);

  const isEmpty = orders.length === 0;
  const showLoading = isLoading || isMarketDataPending;
  const showError = Boolean(error) && !isLoading && isEmpty;
  const showBanner = Boolean(error) && !isLoading && !isEmpty;
  const emptyText = isWalletConnected ? (
    <Trans>No open orders</Trans>
  ) : (
    <Trans>Connect a Solana wallet to view orders</Trans>
  );

  const marketFilter = (asButton?: boolean) => (
    <SolanaMarketFilter
      asButton={asButton}
      value={marketsDirectionsFilter}
      onChange={setMarketsDirectionsFilter}
      positionsWithOrders={positionsWithOrders}
    />
  );
  const typeFilter = (asButton?: boolean) => (
    <OrderTypeFilter
      asButton={asButton}
      value={orderTypesFilter}
      onChange={setOrderTypesFilter}
      allowedValues={SOLANA_ORDER_TYPE_FILTER_VALUES}
    />
  );

  if (isTablet) {
    return (
      <div className="flex grow flex-col">
        {showBanner && error && <SolanaOrdersErrorBanner error={error} onRetry={onRetry} />}
        {!showLoading && (
          <div className="flex flex-wrap items-center justify-between gap-8">
            <div className="flex gap-8">
              {marketFilter(true)}
              {typeFilter(true)}
            </div>
          </div>
        )}
        {showError && error ? (
          <SolanaOrdersError error={error} onRetry={onRetry} />
        ) : (
          <EmptyTableContent isLoading={showLoading} isEmpty={filteredOrders.length === 0} emptyText={emptyText} />
        )}
        {!showLoading && filteredOrders.length > 0 && (
          <div className="grid gap-8 sm:grid-cols-auto-fill-350">
            {filteredOrders.map((order) => (
              <SolanaOrderCard
                key={order.key}
                order={order}
                isSetAcceptablePriceImpactEnabled={isSetAcceptablePriceImpactEnabled}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <TableScrollFadeContainer disableScrollFade={isEmpty} hideControls className="flex grow flex-col bg-slate-900">
      {showBanner && error && <SolanaOrdersErrorBanner error={error} onRetry={onRetry} />}
      <Table className="!w-[max(100%,580px)] table-fixed">
        <thead className="text-body-medium">
          <TableTheadTr>
            <TableTh>{marketFilter()}</TableTh>
            <TableTh className="w-[10%]">{typeFilter()}</TableTh>
            <TableTh className="w-[15%]">
              <Trans>SIZE</Trans>
            </TableTh>
            <TableTh className="w-[18%]">
              <Trans>TRIGGER PRICE</Trans>
            </TableTh>
            <TableTh className="w-[18%]">
              <Trans>MARK PRICE</Trans>
            </TableTh>
          </TableTheadTr>
        </thead>
        <tbody>
          {!showLoading &&
            filteredOrders.map((order) => (
              <SolanaOrderRow
                key={order.key}
                order={order}
                isSetAcceptablePriceImpactEnabled={isSetAcceptablePriceImpactEnabled}
              />
            ))}
        </tbody>
      </Table>
      {showError && error ? (
        <SolanaOrdersError error={error} onRetry={onRetry} />
      ) : (
        <EmptyTableContent isLoading={showLoading} isEmpty={filteredOrders.length === 0} emptyText={emptyText} />
      )}
    </TableScrollFadeContainer>
  );
}
