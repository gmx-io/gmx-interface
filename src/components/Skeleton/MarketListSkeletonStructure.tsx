import Skeleton from "react-loading-skeleton";

import { TableTd, TableTr } from "components/Table/Table";

export default function MarketListSkeletonStructure() {
  return (
    <TableTr bordered={false} hoverable={false}>
      <TableTd>
        <div className="flex items-center">
          <Skeleton className="mr-10 !block" height={40} width={40} circle inline />
          <Skeleton width={60} height={12} />
        </div>
      </TableTd>
      <TableTd>
        <Skeleton width={60} count={1} />
      </TableTd>
      <TableTd>
        <Skeleton width={150} height={12} />
      </TableTd>
      <TableTd>
        <Skeleton width={150} height={12} />
      </TableTd>
      <TableTd>
        <Skeleton width={150} height={12} />
      </TableTd>
      <TableTd>
        <Skeleton width={60} height={12} />
      </TableTd>
    </TableTr>
  );
}
