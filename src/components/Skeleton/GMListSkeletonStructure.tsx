import Skeleton from "react-loading-skeleton";

import { TableTd, TableTr } from "components/Table/Table";

export default function GMListSkeletonStructure() {
  return (
    <TableTr hoverable={false} bordered={false}>
      <TableTd>
        <div className="flex items-center">
          <Skeleton width={32} height={32} borderRadius={4} className="-ml-8 mr-4" />

          <Skeleton className="mr-12 !block" height={40} width={40} circle inline />
          <div>
            <Skeleton width={100} height={12} />
            <Skeleton width={80} height={12} />
          </div>
        </div>
      </TableTd>
      <TableTd>
        <Skeleton width={60} count={1} />
      </TableTd>
      <TableTd>
        <Skeleton width={100} height={12} />
        <Skeleton width={80} height={12} />
      </TableTd>
      <TableTd>
        <Skeleton width={100} height={12} />
        <Skeleton width={80} height={12} />
      </TableTd>
      <TableTd>
        <Skeleton width={100} height={12} />
        <Skeleton width={80} height={12} />
      </TableTd>

      <TableTd>
        <Skeleton width={60} count={1} />
      </TableTd>
      <TableTd className="w-[350px]">
        <Skeleton containerClassName="flex justify-end gap-10" className="flex-grow" width={90} inline count={3} />
      </TableTd>
    </TableTr>
  );
}
