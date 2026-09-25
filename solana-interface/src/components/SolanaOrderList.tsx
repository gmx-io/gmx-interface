import { Trans } from "@lingui/macro";

import { useBreakpoints } from "lib/useBreakpoints";

import Button from "components/Button/Button";
import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { Table, TableTh, TableTheadTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import { SolanaOrderCard, SolanaOrderRow } from "./SolanaOrderItem";
import type { SolanaOrderViewModel } from "../orders/types";

export type SolanaOrderListProps = {
  orders: SolanaOrderViewModel[];
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

/** Read-only Solana orders: desktop table (>1024px) or mobile cards. No selection, edit or cancel. */
export function SolanaOrderList({
  orders,
  isWalletConnected,
  isLoading,
  isMarketDataPending,
  error,
  onRetry,
}: SolanaOrderListProps) {
  const { isTablet } = useBreakpoints();

  const isEmpty = orders.length === 0;
  const showLoading = isLoading || isMarketDataPending;
  const showError = Boolean(error) && !isLoading && isEmpty;
  const showBanner = Boolean(error) && !isLoading && !isEmpty;
  const emptyText = isWalletConnected ? (
    <Trans>No open orders</Trans>
  ) : (
    <Trans>Connect a Solana wallet to view orders</Trans>
  );

  if (isTablet) {
    return (
      <div className="flex grow flex-col">
        {showBanner && error && <SolanaOrdersErrorBanner error={error} onRetry={onRetry} />}
        {showError && error ? (
          <SolanaOrdersError error={error} onRetry={onRetry} />
        ) : (
          <EmptyTableContent isLoading={showLoading} isEmpty={isEmpty} emptyText={emptyText} />
        )}
        {!showLoading && orders.length > 0 && (
          <div className="grid grid-cols-1 gap-8 min-[800px]:grid-cols-2">
            {orders.map((order) => (
              <SolanaOrderCard key={order.key} order={order} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <TableScrollFadeContainer disableScrollFade={isEmpty} hideControls className="flex grow flex-col bg-slate-900">
      {showBanner && error && <SolanaOrdersErrorBanner error={error} onRetry={onRetry} />}
      <Table className="!w-[max(100%,800px)] table-fixed">
        <thead className="text-body-medium">
          <TableTheadTr>
            <TableTh className="w-[28%]">
              <Trans>MARKET</Trans>
            </TableTh>
            <TableTh className="w-[16%]">
              <Trans>TYPE</Trans>
            </TableTh>
            <TableTh className="w-[20%]">
              <Trans>SIZE</Trans>
            </TableTh>
            <TableTh className="w-[18%]">
              <Trans>TRIGGER PRICE</Trans>
            </TableTh>
            <TableTh className="w-[18%] text-left">
              <Trans>MARK PRICE</Trans>
            </TableTh>
          </TableTheadTr>
        </thead>
        <tbody>{!showLoading && orders.map((order) => <SolanaOrderRow key={order.key} order={order} />)}</tbody>
      </Table>
      {showError && error ? (
        <SolanaOrdersError error={error} onRetry={onRetry} />
      ) : (
        <EmptyTableContent isLoading={showLoading} isEmpty={isEmpty} emptyText={emptyText} />
      )}
    </TableScrollFadeContainer>
  );
}
