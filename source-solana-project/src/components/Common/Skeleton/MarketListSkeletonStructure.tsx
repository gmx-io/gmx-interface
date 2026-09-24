import Skeleton from 'react-loading-skeleton';

import { TableTd, TableTr } from '@/components/Common/Table/Table';

export default function MarketListSkeletonStructure() {
  return (
    <TableTr bordered={false} hoverable={false}>
      <TableTd>
        <div className="token-symbol-wrapper">
          <div className="flex items-center">
            <div className="App-card-title-info-icon max-h-20">
              <Skeleton
                className="!block"
                height={20}
                width={20}
                circle
                inline
              />
            </div>
            <div>
              <div className="App-card-info-title">
                <Skeleton width={60} height={12} />
              </div>
            </div>
          </div>
        </div>
      </TableTd>
      <TableTd>
        <Skeleton width={60} height={12} />
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
