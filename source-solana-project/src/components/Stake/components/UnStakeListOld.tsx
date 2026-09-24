import './UnStakeList.scss';
import { getGmw307Enabled } from '@/config/featureFlagEnable';

import { memo, useMemo, useState } from 'react';
import { t, Trans } from '@lingui/macro';
import { STAKE_LIST_PER_PAGE } from '@/config/ui';
import { getIconUrlPath } from '@/utils/lib/icon';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import { formatAmount, formatTimestampNow } from '@/utils/legacy/format';
import { StakeHistoryItem } from '../Hooks/useStakeHistoryData';
import { BottomTablePagination } from '@/components/Common/Pagination/BottomTablePagination';
import { TableScrollFadeContainer } from '@/components/Common/Table/TableScrollFade/TableScrollFade';
import CurrentPageItemsFixedList from '@/components/CurrentPageItemsFixedList';
import { useMedia } from 'react-use';
import LoadingComponent from '@/utils/LoadingComponent';

import IconSort from '@/img/header/sort.svg?react';
import IconSortDown from '@/img/header/sort-down.svg?react';
import IconSortUp from '@/img/header/sort-up.svg?react';

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { is } from 'date-fns/locale';

dayjs.extend(utc);

type SortField = 'amount' | 'duration';
type SortOrder = 'default' | 'asc' | 'desc';

function UnStakeList({
  isStakeHistoryLoading,
  unStakePositions
}: {
  isStakeHistoryLoading: boolean;
  unStakePositions: Array<StakeHistoryItem>
}) {
  const isGmw307Enabled = getGmw307Enabled();
  const [page, setPage] = useState<number>(1);
  const [gmSortField, setGmSortField] = useState<SortField>('amount');
  const [gmSortFieldList, setGmSortFieldList] = useState<Record<SortField, SortOrder>>({
    amount: 'default',
    duration: 'default',
  });

  const sortedData = useMemo(() => {
    if (!unStakePositions || unStakePositions.length === 0) return [];

    const sortDirection = gmSortFieldList[gmSortField];
    if (sortDirection === 'default') return unStakePositions;

    return [...unStakePositions].sort((a, b) => {
      let comparison = 0;
      
      if (gmSortField === 'amount') {
        comparison = a.amount.cmp(b.amount);
      } else if (gmSortField === 'duration') {
        comparison = a.timestamp.cmp(b.timestamp);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [unStakePositions, gmSortField, gmSortFieldList]);

  const currentPageUnStakes = useMemo(() => {
    const startIndex = (page - 1) * STAKE_LIST_PER_PAGE;
    return sortedData.slice(startIndex, startIndex + STAKE_LIST_PER_PAGE);
  }, [sortedData, page]);

  const pageCount = Math.ceil(sortedData.length / STAKE_LIST_PER_PAGE);

  const handleGmSort = (field: SortField) => {
    const nextOrder = (v: SortOrder): SortOrder =>
      v === 'default' ? 'desc' : v === 'desc' ? 'asc' : 'default';

    setGmSortFieldList((prev) => ({
      amount: 'default',
      duration: 'default',
      [field]: nextOrder(prev[field]),
    }));
    setGmSortField(field);
    setPage(1);
  };

  const getSortIcon = (field: SortField) => {
    const status = gmSortFieldList[field];
    if (status === 'asc') return <IconSortUp fill="#FA7B4E" className="icon-sort-up" />;
    if (status === 'desc') return <IconSortDown fill="#FA7B4E" className="icon-sort-down" />;
    return <IconSort fill="currentColor" className="icon-sort" />;
  };

  return (
    <div className="unstake-list-view table-container">
      <TableScrollFadeContainer>
        <Table className="min-w-max">
          <thead className="text-body-medium">
            <TableTheadTr>
              <TableTh>
                <p className="text-left">
                  <Trans>ACTION</Trans>
                </p>
              </TableTh>
              <TableTh><Trans>TOKEN</Trans></TableTh>
              <TableTh>
                <div
                  className={`unstake-table-sort-wrapper sortable ${
                    gmSortField === 'amount' && gmSortFieldList['amount'] !== 'default' ? 'sort-select' : ''
                  }`}
                  onClick={() => handleGmSort('amount')}
                >
                  <Trans>AMOUNT</Trans>
                  {getSortIcon('amount')}
                </div>
              </TableTh>
              <TableTh style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div
                  className={`sortable flex justify-end ${
                    gmSortField === 'duration' && gmSortFieldList['duration'] !== 'default' ? 'sort-select' : ''
                  } text-right`}
                  // onClick={() => handleGmSort('duration')}
                >
                  <Trans>TIME</Trans>
                  {/* {getSortIcon('duration')} */}
                </div>
              </TableTh>
            </TableTheadTr>
          </thead>
          <tbody>
            {isGmw307Enabled && isStakeHistoryLoading && sortedData.length === 0 ? (
              <TableTr hoverable={false} bordered={false}>
                <TableTd colSpan={4}>
                  <div className="text-body-medium data-empty">
                    <LoadingComponent />
                  </div>
                </TableTd>
              </TableTr>
            ) : !isGmw307Enabled && isStakeHistoryLoading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <TableTr key={`glv-skeleton-${i}`}>
                  <TableTd colSpan={7}>
                    <div
                      style={{
                        width: '100%',
                        height: '24px',
                        background:
                          'linear-gradient(90deg, rgba(250, 123, 78, 0.12) 25%, rgba(250, 123, 78, 0.22) 37%, rgba(250, 123, 78, 0.12) 63%)',
                        backgroundSize: '400% 100%',
                        borderRadius: '6px',
                        animation:
                          'skeleton-shimmer 1.2s ease-in-out infinite',
                      }}
                    />
                  </TableTd>
                </TableTr>
              ))
            ) : sortedData.length === 0 ? (
              <TableTr hoverable={false} bordered={false}>
                <TableTd colSpan={4}>
                  <div className="text-body-medium data-empty">{t`No unstake positions`}</div>
                </TableTd>
              </TableTr>
            ) : (
              <>
                {
                  currentPageUnStakes.map((position, index) => (
                    <UnStakeItemWrapper
                      key={`${position?.id}-${index}`}
                      index={index}
                      position={position}
                    />
                  ))
                }
                <CurrentPageItemsFixedList
                  listTr="unStakeListTr"
                  data={currentPageUnStakes}
                  page={STAKE_LIST_PER_PAGE}
                />
              </>
            )}
          </tbody>
        </Table>
      </TableScrollFadeContainer>
      
      {pageCount > 1 && (
        <BottomTablePagination
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

const UnStakeItemWrapper = memo(({ index, position }: { index: number; position: StakeHistoryItem }) => {
  const isMobile = useMedia('(max-width: 768px)');
  
  const [longSymbol = '', shortSymbol = ''] = position?.symbolPair?.split('-') || [];

  return (
    <TableTr
      bordered={false}
      className={`unStakeListTr ${index % 2 === 0 ? 'row-dim' : 'row-dark'}`}
    >
      <TableTd className={isMobile ? 'w-[16.5rem]' : 'w-[22%]'}>
        <p className='text-p text-left'>{position?.actionType === 'Stake' ? <Trans>Stake</Trans> : <Trans>Unstake</Trans>}</p>
      </TableTd>
      <TableTd className='!w-[25rem]'>
        <div className='token'>
          <div className='token-symbol'>
            <img className='token-icon' src={getIconUrlPath(position?.symbol, 24)} width={40} height={40} />
            {position?.poolType === 'GM' && (
              <div className="ls-img">
                <img src={getIconUrlPath(longSymbol, 24)} alt="long" width={18} />
                <img src={getIconUrlPath(shortSymbol, 24)} alt="short" width={18} />
              </div>
            )}
          </div>
          <div className='info'>
            <p className={`text-p mb-[0.2rem] ${isMobile ? '!text-[1.3rem]' : ''}`}>
              {position?.poolType === 'GM' 
                // ? `${position?.poolType}:${position?.symbol}${position?.symbolName}` 
                ? `${position?.poolType}:${position?.displaySymbol}` 
                : position?.symbolAnother}
            </p>
            <span className='text-span'>[{position?.symbolPair}]</span>
          </div>
        </div>
      </TableTd>
      <TableTd className={isMobile ? 'w-[10rem]' : 'w-[25%]'}>
        <p className='text-p'>{formatAmount(position?.amount, position?.decimals, 2)}</p>
      </TableTd>
      <TableTd className={isMobile ? 'w-[20rem]' : 'w-[26rem]'}>
        <p className='text-p text-right'>
          {formatTimestampNow(position?.timestamp?.toString())}
        </p>
      </TableTd>
    </TableTr>
  );
});

UnStakeItemWrapper.displayName = 'UnStakeItemWrapper';

export default memo(UnStakeList);