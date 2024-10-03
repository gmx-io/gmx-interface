import Skeleton from "react-loading-skeleton";

import { TableTd, TableTr } from "components/Table/Table";

type Props = {
  withTimestamp?: boolean;
};

export default function TradesHistorySkeletonStructure(props: Props) {
  return (
    <TableTr hoverable={false} bordered={false}>
      <TableTd>
        <Skeleton width={150} count={1} />
        <Skeleton width={120} count={1} />
        {props.withTimestamp && <Skeleton width={300} className="max-w-full" count={1} />}
      </TableTd>
      <TableTd>
        <Skeleton width={110} count={1} />
      </TableTd>
      <TableTd>
        <Skeleton width={110} />
      </TableTd>
      <TableTd>
        <Skeleton width={90} />
      </TableTd>
      <TableTd>
        <Skeleton width={60} />
      </TableTd>
    </TableTr>
  );
}
