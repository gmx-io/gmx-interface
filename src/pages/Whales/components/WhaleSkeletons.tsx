import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

import { isLongWhaleWindow, type WhaleWindow } from "domain/synthetics/whales/period";

import { TableTd, TableTr } from "components/Table/Table";

import "react-loading-skeleton/dist/skeleton.css";

const BASE_COLOR = "#B4BBFF1A";

// Shown while a large window (90d+, incl. all-time) loads — those scans take a while.
export function WhaleLongWindowHint({ window }: { window: WhaleWindow }) {
  if (!isLongWhaleWindow(window)) return null;
  return (
    <div className="text-body-small mb-8 text-typography-secondary">
      You selected a large time range, so this may take a while to load.
    </div>
  );
}

// Skeleton rows for a whale table while its data loads.
export function WhaleTableSkeleton({ columns, rows = 8 }: { columns: number; rows?: number }) {
  return (
    <SkeletonTheme baseColor={BASE_COLOR} highlightColor={BASE_COLOR}>
      {Array.from({ length: rows }).map((_, r) => (
        <TableTr key={r}>
          {Array.from({ length: columns }).map((_, c) => (
            <TableTd key={c}>
              <Skeleton inline />
            </TableTd>
          ))}
        </TableTr>
      ))}
    </SkeletonTheme>
  );
}

// Inline skeleton for a single cell (e.g. an overview concentration column that
// loads after the market totals).
export function WhaleCellSkeleton({ width = 44 }: { width?: number }) {
  return (
    <SkeletonTheme baseColor={BASE_COLOR} highlightColor={BASE_COLOR}>
      <Skeleton inline width={width} />
    </SkeletonTheme>
  );
}

export function WhalePieSkeleton() {
  return (
    <SkeletonTheme baseColor={BASE_COLOR} highlightColor={BASE_COLOR}>
      <Skeleton circle width={160} height={160} />
    </SkeletonTheme>
  );
}
