import Skeleton from "react-loading-skeleton";

import { TableTd, TableTr } from "components/Table/Table";

export function LeaderboardTopPositionsStructure() {
  return (
    <TableTr className="h-47">
      <TableTd>
        <Skeleton width={40} />
      </TableTd>
      <TableTd>
        <Skeleton width={250} />
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
        <Skeleton width={50} />
      </TableTd>
      <TableTd>
        <Skeleton width={110} />
      </TableTd>
    </TableTr>
  );
}
