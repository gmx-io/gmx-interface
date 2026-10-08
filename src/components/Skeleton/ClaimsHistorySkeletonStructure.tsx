import { useMemo } from "react";
import Skeleton from "react-loading-skeleton";

import { TableTd, TableTr } from "components/Table/Table";

export default function ClaimsHistorySkeletonStructure({ rowHeight }: { rowHeight?: number }) {
  const style = useMemo(() => ({ height: rowHeight }), [rowHeight]);
  return (
    <TableTr style={style}>
      <TableTd>
        <Skeleton width={160} className="max-w-full" />
        <Skeleton width={120} className="max-w-full" />
      </TableTd>
      <TableTd>
        <Skeleton width={110} className="max-w-full" />
      </TableTd>
      <TableTd className="ClaimHistoryRow-size">
        <Skeleton width={110} className="max-w-full" />
      </TableTd>
    </TableTr>
  );
}
