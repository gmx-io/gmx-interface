import Skeleton from "react-loading-skeleton";

import { TableTd, TableTr } from "components/Table/Table";

export function LeaderboardTopAccountsStructure() {
  return (
    <TableTr bordered={false} hoverable={false}>
      <TableTd>
        <Skeleton width={40} inline />
      </TableTd>
      <TableTd>
        <div className="flex items-center gap-6 py-[1.5px]">
          <Skeleton circle width={20} height={20} inline className="!block" />
          <Skeleton width={120} inline className="!block" />
        </div>
      </TableTd>
      <TableTd>
        <Skeleton inline />
      </TableTd>
      <TableTd>
        <Skeleton inline />
      </TableTd>
      <TableTd>
        <Skeleton inline />
      </TableTd>
      <TableTd>
        <Skeleton width={100} inline />
      </TableTd>
      <TableTd>
        <Skeleton width={110} inline />
      </TableTd>
    </TableTr>
  );
}
