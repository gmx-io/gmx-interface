import Skeleton from "react-loading-skeleton";

import { TableTd, TableTr } from "components/Table/Table";

export default function GMListSkeletonStructure({ withFavorite = true }: { withFavorite?: boolean }) {
  return (
    <TableTr>
      <TableTd>
        <div className="flex items-center">
          {withFavorite && <Skeleton width={32} height={32} borderRadius={4} className="-ml-8 mr-4" />}
          <Skeleton className="mr-12 !block" height={40} width={40} circle inline />
          <div>
            <Skeleton width={100} height={12} />
            <Skeleton width={180} height={12} />
          </div>
        </div>
      </TableTd>
      <TableTd>
        <Skeleton width={130} height={12} />
        <Skeleton width={100} height={12} />
      </TableTd>
      <TableTd>
        <Skeleton width={100} height={12} />
        <Skeleton width={80} height={12} />
      </TableTd>
      <TableTd>
        <Skeleton width={72} height={12} />
      </TableTd>
      <TableTd>
        <Skeleton width={140} count={1} />
      </TableTd>
      <TableTd>
        <Skeleton width={210} count={1} />
      </TableTd>
      <TableTd className="w-[130px]">
        <Skeleton containerClassName="flex justify-end gap-10" className="flex-grow" width={90} inline count={1} />
      </TableTd>
    </TableTr>
  );
}
