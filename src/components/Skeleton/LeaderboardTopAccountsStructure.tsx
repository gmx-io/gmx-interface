import Skeleton from "react-loading-skeleton";

import { TableTd, TableTr } from "components/Table/Table";

export function LeaderboardTopAccountsStructure() {
  return (
    <TableTr bordered={false} hoverable={false}>
      <TableTd>
        <Skeleton className="my-5" width={40} />
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
        <Skeleton width={110} />
      </TableTd>
    </TableTr>
  );
}
