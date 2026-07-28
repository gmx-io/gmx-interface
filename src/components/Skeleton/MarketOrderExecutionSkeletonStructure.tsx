import Skeleton from "react-loading-skeleton";

import { TableTd, TableTr } from "components/Table/Table";

export default function MarketOrderExecutionSkeletonStructure() {
  return (
    <TableTr>
      <TableTd padding="compact">
        <Skeleton width={120} />
        <Skeleton width={80} />
      </TableTd>
      <TableTd padding="compact">
        <Skeleton width={110} />
      </TableTd>
      <TableTd padding="compact">
        <div className="flex justify-end">
          <Skeleton width={80} />
        </div>
      </TableTd>
      <TableTd padding="compact">
        <Skeleton width={100} />
        <Skeleton width={140} className="max-w-full" />
      </TableTd>
      <TableTd padding="compact">
        <Skeleton width={100} />
        <Skeleton width={140} className="max-w-full" />
      </TableTd>
      <TableTd padding="compact">
        <div className="flex justify-end">
          <Skeleton width={50} />
        </div>
      </TableTd>
      <TableTd padding="compact">
        <div className="flex justify-end">
          <Skeleton width={70} />
        </div>
      </TableTd>
    </TableTr>
  );
}
