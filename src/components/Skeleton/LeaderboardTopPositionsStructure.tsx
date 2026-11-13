import Skeleton from "react-loading-skeleton";

import { TableTd, TableTr } from "components/Table/Table";

export function LeaderboardTopPositionsStructure() {
  return (
    <TableTr className="h-47">
      <TableTd>
        <Skeleton width={40} />
      </TableTd>
      <TableTd>
        <div className="flex items-center gap-6">
          <Skeleton circle width={20} height={20} inline className="!block" />
          <Skeleton width={120} inline className="!block" />
        </div>
      </TableTd>
      <TableTd>
        <Skeleton />
      </TableTd>
      <TableTd>
        <Skeleton />
      </TableTd>
      <TableTd>
        <Skeleton />
      </TableTd>
      <TableTd>
        <Skeleton width={100} />
      </TableTd>
      <TableTd>
        <Skeleton width={40} />
      </TableTd>
      <TableTd>
        <Skeleton width={110} />
      </TableTd>
    </TableTr>
  );
}
