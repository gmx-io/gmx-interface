import { type MouseEvent, type ReactNode, useCallback } from "react";

import type { SortDirection } from "context/SorterContext/types";

import { Sorter } from "components/Sorter/Sorter";
import { TableTh } from "components/Table/Table";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

// Column header with an optional info-stroke tooltip and optional sorter.
export function WhaleColumnHeader({
  title,
  tooltip,
  sorter,
}: {
  title: string;
  tooltip?: ReactNode;
  sorter?: { direction: SortDirection; onChange: (direction: SortDirection) => void };
}) {
  const stopPropagation = useCallback((e: MouseEvent) => e.stopPropagation(), []);

  const label = tooltip ? (
    <TooltipWithPortal
      handle={<span className="whitespace-nowrap">{title}</span>}
      position="bottom"
      content={<div onClick={stopPropagation}>{tooltip}</div>}
      variant="iconStroke"
    />
  ) : (
    <span className="whitespace-nowrap">{title}</span>
  );

  return <TableTh>{sorter ? <Sorter {...sorter}>{label}</Sorter> : label}</TableTh>;
}
