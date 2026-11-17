import { useState } from "react";

import type { SortDirection } from "context/SorterContext/types";

// Minimal local table sorting: drives the shared `Sorter` header component from
// component-local state (no SorterContext key needed for these dev-only tables).
export function useWhaleSort<F extends string>(defaultBy: F, defaultDir: SortDirection = "desc") {
  const [orderBy, setOrderBy] = useState<F>(defaultBy);
  const [direction, setDirection] = useState<SortDirection>(defaultDir);

  const sorterProps = (field: F) => ({
    direction: (orderBy === field ? direction : "unspecified") as SortDirection,
    onChange: (next: SortDirection) => {
      setOrderBy(field);
      setDirection(next);
    },
  });

  return { orderBy, direction, sorterProps };
}

// Sort by a bigint value; "unspecified" leaves the input order untouched. Never mutates input.
export function sortByBigint<T>(rows: T[], direction: SortDirection, getValue: (row: T) => bigint): T[] {
  if (direction === "unspecified") return rows;
  const sign = direction === "asc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = getValue(a);
    const bv = getValue(b);
    return (av < bv ? 1 : av > bv ? -1 : 0) * sign;
  });
}
