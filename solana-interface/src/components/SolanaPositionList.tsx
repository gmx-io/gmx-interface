import { Trans } from "@lingui/macro";
import { useMemo } from "react";

import { useBreakpoints } from "lib/useBreakpoints";

import Button from "components/Button/Button";
import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import { Table, TableTh, TableTheadTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import { SolanaPositionCard } from "./SolanaPositionCard";
import { SolanaPositionItem } from "./SolanaPositionItem";
import { sortSolanaPositions, type SolanaPositionSortField } from "../positions/sortSolanaPositions";
import type { SolanaPositionViewModel } from "../positions/types";

export type SolanaPositionListProps = {
  positions: SolanaPositionViewModel[];
  isWalletConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
};

function SolanaPositionsErrorBanner({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="text-body-small flex items-center justify-between gap-12 px-20 py-8 text-typography-secondary">
      <span className="truncate">{error.message}</span>
      <Button variant="secondary" onClick={onRetry}>
        <Trans>Retry</Trans>
      </Button>
    </div>
  );
}

function SolanaPositionsError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex min-h-[164px] flex-col items-center justify-center gap-12 px-20 text-center">
      <div className="text-typography-secondary">
        <Trans>Failed to load positions.</Trans>
      </div>
      <div className="text-body-small text-typography-secondary">{error.message}</div>
      <Button variant="secondary" onClick={onRetry}>
        <Trans>Retry</Trans>
      </Button>
    </div>
  );
}

/** Read-only Solana positions: desktop table (>1024px) or mobile cards. */
export function SolanaPositionList({
  positions,
  isWalletConnected,
  isLoading,
  error,
  onRetry,
}: SolanaPositionListProps) {
  const { isTablet } = useBreakpoints();
  const { orderBy, direction, getSorterProps } = useSorterHandlers<SolanaPositionSortField>("solana-position-list");
  const sorted = useMemo(() => sortSolanaPositions(positions, orderBy, direction), [positions, orderBy, direction]);

  const isEmpty = positions.length === 0;
  const showError = Boolean(error) && !isLoading && isEmpty;
  const showBanner = Boolean(error) && !isLoading && !isEmpty;
  const emptyText = isWalletConnected ? (
    <Trans>No open positions</Trans>
  ) : (
    <Trans>Connect a Solana wallet to view positions</Trans>
  );

  if (isTablet) {
    return (
      <div className="flex grow flex-col">
        {showBanner && error && <SolanaPositionsErrorBanner error={error} onRetry={onRetry} />}
        {showError && error ? (
          <SolanaPositionsError error={error} onRetry={onRetry} />
        ) : (
          <EmptyTableContent isLoading={isLoading} isEmpty={isEmpty} emptyText={emptyText} />
        )}
        {!isLoading && sorted.length > 0 && (
          <div className="grid grid-cols-1 gap-8 min-[800px]:grid-cols-2">
            {sorted.map((position) => (
              <SolanaPositionCard key={position.key} position={position} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <TableScrollFadeContainer disableScrollFade={isEmpty} hideControls className="flex grow flex-col bg-slate-900">
      {showBanner && error && <SolanaPositionsErrorBanner error={error} onRetry={onRetry} />}
      <Table className="!w-[max(100%,1180px)] table-fixed">
        <thead className="text-body-medium">
          <TableTheadTr>
            <TableTh className="w-[13%]">
              <Sorter {...getSorterProps("symbol")} showOnHover>
                <Trans>POSITION</Trans>
              </Sorter>
            </TableTh>
            <TableTh className="w-[12%]">
              <Sorter {...getSorterProps("size")} showOnHover>
                <Trans>SIZE</Trans>
              </Sorter>
            </TableTh>
            <TableTh className="w-[17%]">
              <Sorter {...getSorterProps("netValue")} showOnHover>
                <Trans>NET VALUE</Trans>
              </Sorter>
            </TableTh>
            <TableTh className="w-[11%]">
              <Sorter {...getSorterProps("collateral")} showOnHover>
                <Trans>MARGIN</Trans>
              </Sorter>
            </TableTh>
            <TableTh className="w-[9%]">
              <Sorter {...getSorterProps("entryPrice")} showOnHover>
                <Trans>ENTRY PRICE</Trans>
              </Sorter>
            </TableTh>
            <TableTh className="w-[9%]">
              <Sorter {...getSorterProps("markPrice")} showOnHover>
                <Trans>MARK PRICE</Trans>
              </Sorter>
            </TableTh>
            <TableTh className="w-[9%]">
              <Sorter {...getSorterProps("liqPrice")} showOnHover>
                <Trans>LIQUIDATION PRICE</Trans>
              </Sorter>
            </TableTh>
            <TableTh className="w-[8%] text-left">
              <Trans>TP/SL</Trans>
            </TableTh>
          </TableTheadTr>
        </thead>
        <tbody>
          {!isLoading && sorted.map((position) => <SolanaPositionItem key={position.key} position={position} />)}
        </tbody>
      </Table>
      {showError && error ? (
        <SolanaPositionsError error={error} onRetry={onRetry} />
      ) : (
        <EmptyTableContent isLoading={isLoading} isEmpty={isEmpty} emptyText={emptyText} />
      )}
    </TableScrollFadeContainer>
  );
}
