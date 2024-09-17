import Skeleton from "react-loading-skeleton";

import { TableTd, TableTr } from "components/Table/Table";

export default function ClaimsHistorySkeletonStructure() {
  return (
    <TableTr hoverable={false}>
      <TableTd>
        <Skeleton width={160} />
        <Skeleton width={120} />
      </TableTd>
      <TableTd>
        <Skeleton width={110} />
      </TableTd>
      <TableTd className="ClaimHistoryRow-size">
        <Skeleton width={110} />
      </TableTd>
    </TableTr>
  );
}
