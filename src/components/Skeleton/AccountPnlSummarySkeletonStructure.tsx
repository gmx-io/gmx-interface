import Skeleton from "react-loading-skeleton";

import { TableTd, TableTr } from "components/Table/Table";

export default function AccountPnlSummarySkeletonStructure() {
  return (
    <TableTr bordered={false} hoverable={false}>
      <TableTd>
        <Skeleton width={60} />
      </TableTd>
      <TableTd>
        <Skeleton width={70} />
      </TableTd>
      <TableTd>
        <Skeleton width={50} />
      </TableTd>
      <TableTd>
        <Skeleton width={63} />
      </TableTd>
      <TableTd>
        <Skeleton width={51} />
      </TableTd>
    </TableTr>
  );
}
