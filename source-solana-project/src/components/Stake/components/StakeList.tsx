import {
  getGmw212Enabled,
  getGmw307Enabled,
  getGmw411Enabled,
} from '@/config/featureFlagEnable';
import './StakeList.scss'

import { forwardRef, useImperativeHandle, memo, useCallback, useEffect, useMemo, useState } from 'react';
import { t, Trans } from '@lingui/macro';
import { useAnchor } from '@/contexts/anchor';
import { BN } from '@coral-xyz/anchor';
import { STAKE_LIST_PER_PAGE, EXCHANGE_LIST_PER_PAGE } from '@/config/ui';
import { getIconUrlPath } from '@/utils/lib/icon';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import Button from '@/components/Common/Button/Button';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import { GMX_SOLANA_TOKENS_RAW, GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { formatAmount, formatUsd, formatLiquidationPrice } from '@/utils/legacy/format';
import { getDaysPassedUTC, getWeeksPassedUTC } from '../utils/time';
import { getComputeTimeWeightedApyBN } from '../utils/getComputeTimeWeightedApyBN';

import { StakePosition } from '../Hooks/useStakePositions';
import { StakeGlobalState } from '../Hooks/useStakeGlobalState';
import { useStakeQueryController, StakeQueryController } from '@/components/Stake/Hooks/useStakeQueryController';
import { useStoreAccount } from '@/hooks/fetchHooks/useStoreAccount';
import { BottomTablePagination } from '@/components/Common/Pagination/BottomTablePagination';
import { TableScrollFadeContainer } from '@/components/Common/Table/TableScrollFade/TableScrollFade';
import CurrentPageItemsFixedList from '@/components/CurrentPageItemsFixedList';
import LoadingComponent from '@/utils/LoadingComponent';
import { useMedia } from 'react-use';

import IconSelect from '@/img/stake/select.svg';
import IconSelectedAll from '@/img/stake/selectedall.svg';
import IconSelectEd from '@/img/stake/selected.svg';
import IconSort from '@/img/header/sort.svg?react';
import IconSortDown from '@/img/header/sort-down.svg?react';
import IconSortUp from '@/img/header/sort-up.svg?react';
// import InfoSvg from '@/img/pools/Info.svg?react';

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

type SortField = 'amount' | 'duration';
type SortOrder = 'default' | 'asc' | 'desc';

function StakeList({
  isPositionsLoading,
  stakePositions,
  stakeGloablState,
  setSelectedPositions,
  onClaimGtClick,
  onUnstakeClick,
}: {
  isPositionsLoading: boolean;
  stakePositions: Array<StakePosition>;
  stakeGloablState: StakeGlobalState;
  setSelectedPositions: (key: string) => void;
  onClaimGtClick: (positionKey: string, orderKey: string | undefined) => void;
  onUnstakeClick: (positionKey: string, orderKey: string | undefined) => void;
}, ref) {

  const isGmw307Enabled = getGmw307Enabled();
  const { owner } = useAnchor();
  const [page, setPage] = useState<number>(1);
  const [stakeListData, setStakeListData] = useState<any[]>([]);
  const { stakeQueryController } = useStakeQueryController();
  const { store: userStore } = useStoreAccount(GMX_SOLANA_STORE_ADDRESS);

  const [gmSortField, setGmSortField] = useState<SortField>('amount');
  const [gmSortFieldList, setGmSortFieldList] = useState<
    Record<SortField, SortOrder>
  >({
    amount: 'default',
    duration: 'default',
  });

  useEffect(() => {
    // console.log('stakePositions 69....', stakePositions)
    if (stakePositions && stakePositions.length && !isPositionsLoading) {
      const stakeList = stakePositions.map((item) => {
        const existingToken = stakeListData.find(t => t?.positionId?.toString() === item?.positionId?.toString());
        return {
          ...item,
          select: existingToken?.select || false,
        };
      });
      setStakeListData(stakeList);
    } else {
      setStakeListData([]);
    }
  }, [stakePositions, isPositionsLoading])

  const currentPageStakes = useMemo(() => {
    const startIndex = (page - 1) * STAKE_LIST_PER_PAGE;
    const endIndex = startIndex + STAKE_LIST_PER_PAGE;
    return stakeListData.slice(startIndex, endIndex);
  }, [stakeListData, page]);

  const pageCount = Math.ceil(stakeListData.length / STAKE_LIST_PER_PAGE);

  const handleSelectPositionClick = useCallback(
    (id: number | string) => {
      setStakeListData(stakeListData.map(item => {
        if (item.positionId.toString() === id) {
          item.select = !item.select;
        }
        return item;
      }))

      const selectedIds = stakeListData.filter(item => item.select);

      // console.log('selectedIds', selectedIds);
      setSelectedPositions(selectedIds);
    }, [stakeListData, setSelectedPositions]
  );

  const handleSelectAllPositionClick = useCallback(
    (type?: 'all' | 'none') => {
      // console.log('type', type)
      const updatedList = stakeListData;

      const totalCount = updatedList.length;
      const selectedCount = updatedList.filter(item => item.select).length;

      let finalSelectedList;
      let finalUpdatedList;

      if (selectedCount === totalCount || type === 'all') {
        finalUpdatedList = updatedList.map(item => ({ ...item, select: false }));
        finalSelectedList = [];
      } else {
        finalUpdatedList = updatedList.map(item => ({ ...item, select: true }));
        finalSelectedList = finalUpdatedList;
      }

      setStakeListData(finalUpdatedList);
      setSelectedPositions(finalSelectedList);
    },
    [stakeListData, setSelectedPositions]
  );

  const getSortIcon = (field: SortField) => {
    return gmSortFieldList[field] === 'asc' ? (
      <IconSortUp fill="#FA7B4E" className="icon-sort-up" />
    ) : gmSortFieldList[field] === 'desc' ? (
      <IconSortDown fill="#FA7B4E" className="icon-sort-down" />
    ) : (
      <IconSort fill="currentColor" className="icon-sort" />
    );
  };

  const nextOrder = (v: SortOrder): SortOrder =>
    v === 'default' ? 'desc' : v === 'desc' ? 'asc' : 'default';

  const handleGmSort = (field: SortField) => {
    setGmSortFieldList((prev) => {
      const nextValue = nextOrder(prev[field] ?? 'default');
      const reset: Record<SortField, SortOrder> = {
        amount: 'default',
        duration: 'default'
      };
      return { ...reset, [field]: nextValue };
    });
    setGmSortField(field);
  };

  useImperativeHandle(ref, () => ({
    handleSelectAllPositionClick,
  }));

  useEffect(() => {
    if (!stakeListData || stakeListData.length === 0) {
      return;
    }

    const sortDirection = gmSortFieldList[gmSortField];

    if (sortDirection === 'default') {
      return;
    }

    const sortedList = [...stakeListData].sort((a, b) => {
      let aValue;
      let bValue;

      if (gmSortField === 'amount') {
        aValue = a.stakedValueUsd;
        bValue = b.stakedValueUsd;
      } else if (gmSortField === 'duration') {
        aValue = a.stakeStartTime.toNumber();
        bValue = b.stakeStartTime.toNumber();
      } else {
        return 0;
      }

      let comparison = 0;

      if (gmSortField === 'amount') {
        comparison = aValue.cmp(bValue);
      } else {
        if (aValue > bValue) {
          comparison = 1;
        } else if (aValue < bValue) {
          comparison = -1;
        }
      }

      return sortDirection === 'asc' ? comparison : comparison * -1;
    });

    setStakeListData(sortedList);

  }, [
    gmSortFieldList,
    gmSortField,
    setStakeListData,
    stakeListData
  ]);

  const isMobile = useMedia('(max-width: 890px)');

  return (
    <div className="stake-list-view table-container">
      {!isMobile && (
        <TableScrollFadeContainer>
          <Table className="min-w-max">
            <thead className="text-body-medium">
              <TableTheadTr>
                <TableTh>
                  <div className='select'>
                    <img
                      className="icon cursor-pointer"
                      onClick={() => handleSelectAllPositionClick()}
                      src={stakeListData?.some(item => item?.select) ? IconSelectedAll : IconSelect}
                    />
                    <Trans>TOKEN</Trans>
                  </div>
                </TableTh>
                <TableTh>
                  <div
                    className={`stake-table-sort-wrapper sortable ${gmSortField === 'amount' && gmSortFieldList[gmSortField] !== 'default' ? 'sort-select' : ''}`}
                    onClick={() => handleGmSort('amount')}
                  >
                    {/* <Trans>AMOUNT</Trans> */}
                    {getGmw212Enabled() ? (
                      <Trans>INITIAL VALUE</Trans>
                    ) : (
                      <Trans>Value</Trans>
                    )}
                    {getSortIcon('amount')}
                  </div>
                </TableTh>
                <TableTh>
                  <div
                    className={`justify-end stake-table-sort-wrapper sortable ${gmSortField === 'duration' && gmSortFieldList[gmSortField] !== 'default' ? 'sort-select' : ''}`}
                    onClick={() => handleGmSort('duration')}
                  >
                    <Trans>DURATION</Trans>
                    {getSortIcon('duration')}
                  </div>
                </TableTh>
                <TableTh style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Trans>CURRENT APR</Trans>
                </TableTh>
                <TableTh style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Trans>AVG APR</Trans>
                </TableTh>
                <TableTh style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Trans>UNCLAIMED GT</Trans>
                </TableTh>
                <TableTh>
                </TableTh>
              </TableTheadTr>
            </thead>
            <tbody>
              {
                isPositionsLoading && (isGmw307Enabled
                  ? (stakeListData.length > 0 || currentPageStakes?.length > 0)
                  : true) && Array.from({ length: 12 }).map((_, i) => (
                    <TableTr key={`glv-skeleton-${i}`}>
                      <TableTd colSpan={7}>
                        <div
                          style={{
                            width: '100%',
                            height: '24px',
                            background:
                              'linear-gradient(90deg, rgba(50, 50, 50, 0.12) 25%, rgba(83, 83, 83, 0.12) 93%)',
                            backgroundSize: '400% 100%',
                            borderRadius: '6px',
                            animation:
                              'skeleton-shimmer 1.2s ease-in-out infinite',
                          }}
                        />
                      </TableTd>
                    </TableTr>
                  ))
              }
              {isGmw307Enabled && isPositionsLoading && !stakeListData.length && !currentPageStakes?.length && (
                <TableTr hoverable={false} bordered={false}>
                  <TableTd colSpan={7}>
                    <div className="text-body-medium data-empty">
                      <LoadingComponent />
                    </div>
                  </TableTd>
                </TableTr>
              )}
              {!isPositionsLoading && !stakeListData.length && !currentPageStakes?.length && (
                <TableTr hoverable={false} bordered={false}>
                  <TableTd colSpan={7}>
                    <div className="text-body-medium data-empty">
                      {t`No stake positions`}
                    </div>
                  </TableTd>
                </TableTr>
              )}
              {!isPositionsLoading && currentPageStakes?.length > 0 &&
                currentPageStakes.map((position, index) => (
                  <StakeItemWrapper
                    key={index}
                    index={index}
                    position={position}
                    stakeGloablState={stakeGloablState}
                    stakeQueryController={stakeQueryController}
                    userStore={userStore}
                    onSelectPositionClick={handleSelectPositionClick}
                    onClaimGtClick={onClaimGtClick}
                    onUnstakeClick={onUnstakeClick}
                  />
                ))}

              {
                page > 1 && <>
                  <CurrentPageItemsFixedList
                    listTr="stakeListTr"
                    data={currentPageStakes}
                    page={STAKE_LIST_PER_PAGE}
                  />
                </>
              }
            </tbody>
          </Table>
        </TableScrollFadeContainer>
      )}

      {isMobile && (
        <div className="stake-mobile-card-list">
          {isPositionsLoading && (isGmw307Enabled
            ? (stakeListData.length > 0 || currentPageStakes?.length > 0)
            : true) && Array.from({ length: 3 }).map((_, i) => (
              <div key={`mobile-skeleton-${i}`} className="stake-mobile-card">
                <div
                  style={{
                    width: '100%',
                    height: '200px',
                    background:
                      'linear-gradient(90deg, rgba(50, 50, 50, 0.12) 25%, rgba(83, 83, 83, 0.12) 93%)',
                    backgroundSize: '400% 100%',
                    borderRadius: '0.8rem',
                    animation: 'skeleton-shimmer 1.2s ease-in-out infinite',
                  }}
                />
              </div>
            ))}
          {isGmw307Enabled && isPositionsLoading && !stakeListData.length && !currentPageStakes?.length && (
            <div className="stake-mobile-empty">
              <LoadingComponent />
            </div>
          )}
          {!isPositionsLoading && !stakeListData.length && !currentPageStakes?.length && (
            <div className="stake-mobile-empty">
              <div className="text-body-medium">
                {t`No stake positions`}
              </div>
            </div>
          )}
          {!isPositionsLoading && currentPageStakes?.length > 0 &&
            currentPageStakes.map((position, index) => (
              <StakeMobileCard
                key={index}
                index={index}
                position={position}
                stakeGloablState={stakeGloablState}
                stakeQueryController={stakeQueryController}
                userStore={userStore}
                onSelectPositionClick={handleSelectPositionClick}
                onClaimGtClick={onClaimGtClick}
                onUnstakeClick={onUnstakeClick}
              />
            ))}
        </div>
      )}

      <BottomTablePagination
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
      />
    </div>
  );
}

export default memo(forwardRef(StakeList))

const StakeItemWrapper = memo(
  ({
    index,
    position,
    stakeGloablState,
    stakeQueryController,
    userStore,
    onSelectPositionClick,
    onClaimGtClick,
    onUnstakeClick
  }: {
    index: number,
    position: StakePosition;
    stakeGloablState: StakeGlobalState;
    stakeQueryController: StakeQueryController;
    userStore: any;
    onSelectPositionClick: (positionKey: string, orderKey: string | undefined) => void;
    onClaimGtClick: (positionKey: string, orderKey: string | undefined) => void;
    onUnstakeClick: (positionKey: string, orderKey: string | undefined) => void;
  }) => {
    const { decimals } = userStore?.gt;
    const isMobile = useMedia('(max-width: 890px)');
    const isSmallScreen = useMedia('(max-width: 1480px)');
    let effectiveEndTime: number = 0;

    stakeQueryController?.forEach((item) => {
      if (item?.controllerAddress?.toString() === position?.controller?.toString()) {
        if (item.isEnabled) {
          effectiveEndTime = Math.floor(Date.now() / 1000);
        } else {
          effectiveEndTime = item.disabledAt;
        }
      }
    })

    const avgApr = getComputeTimeWeightedApyBN(position?.stakeStartTime, effectiveEndTime, stakeGloablState?.apyGradient);

    // avg apr
    const getAvgApr = useMemo(() => {
      const avgAprValue = avgApr.gt(new BN('0')) ? formatLiquidationPrice(avgApr.muln(100), {
        displayDecimals: 2,
        showDollarSign: false,
        useCommas: false
      }) : 0;
      return `${Number(avgAprValue).toFixed(2)}%`;
    }, [avgApr]);

    // submit unstake
    const handleSubmitUnstake = useCallback(() => {
      onUnstakeClick([position]);
    }, [onUnstakeClick, position])

    // submit claim gt
    const handleSubmitClaimGt = useCallback(() => {
      onClaimGtClick([position]);
    }, [onClaimGtClick, position])

    const longTokensymbol = useCallback(() => {
      return position?.symbolPair?.split('-')[0];
    }, [position])

    const shortTokensymbol = useCallback(() => {
      return position?.symbolPair?.split('-')[1];
    }, [position])

    const durationParams = useMemo(() => {
      const startTime = Number(position?.stakeStartTime);
      const endTime = Number(position?.endTime);

      if (position?.isEnabled) {
        const now = dayjs().utc().unix();
        const durationSec = endTime - startTime;
        return now - durationSec;
      }

      return startTime;
    }, [position?.stakeStartTime, position?.endTime, position?.isEnabled]);

    const days = useMemo(() => getDaysPassedUTC(durationParams), [durationParams]);
    const weeks = useMemo(() => getWeeksPassedUTC(durationParams), [durationParams]);

    const weeksDisplay = weeks < 1 ? '<1w' : `${weeks}w`;

    let endTimeText = '';
    if (position?.isEnabled) {
      const ts = position?.endTime;
      let date: Date;
      const num = Number(ts);
      if (!isNaN(num)) {
        date = new Date(num > 1e12 ? num : num * 1000);
      } else {
        date = new Date(ts);
      }
      endTimeText = date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }

    const renderTooltipContent = useCallback(() => {
      return (
        <div className='stake-tooltip-content'>
          <div className='tooltip-item'>
            <p><Trans>Unclaimed GT</Trans></p>
            <span>{formatAmount(position?.gtAmount, decimals, 2)}</span>
          </div>
          <div className='tooltip-item'>
            <p><Trans>Claimed GT</Trans></p>
            <span>TODO</span>
          </div>
        </div>
      );
    }, [position]);

    return (
      <TableTr bordered={false} className={`stakeListTr ${index % 2 === 0 ? 'row-dim' : 'row-dark'}`}>
        <TableTd className={`select-td !w-[${isSmallScreen ? 20 : 30}rem]`}>
          <div className='select'>
            <img
              className='icon cursor'
              src={position?.select ? IconSelectEd : IconSelect}
              onClick={() => {
                onSelectPositionClick(position?.positionId?.toString())
              }}
            />
            <div className='token'>
              <div className='token-symbol'>
                <img
                  className='token-icon'
                  src={getIconUrlPath(position?.symbol, 24)}
                  width={40}
                  height={40}
                />
                {
                  position?.poolType === 'GM' && (
                    <div className="ls-img">
                      <img
                        src={getIconUrlPath(longTokensymbol(), 24)}
                        alt="long-token-symbol"
                        width={18}
                      />
                      <img
                        src={getIconUrlPath(shortTokensymbol(), 24)}
                        alt="short-token-symbol"
                        width={18}
                      />
                    </div>
                  )
                }
              </div>
              <div className='info'>
                <p className={`text-p mb-[0.2rem] ${isMobile ? '!text-[1.3rem]' : ''}`}>
                  {
                    position?.poolType === 'GM'
                      // ? `${position?.poolType}:${position?.symbol}${position?.symbolName}`
                      ? `${position?.poolType}:${position?.displaySymbol}`
                      : position?.symbolAnother
                  }
                </p>
                {/* <span className='text-span'>[{GMX_SOLANA_TOKENS_RAW[position?.longToken]?.symbol}-{GMX_SOLANA_TOKENS_RAW[position?.shortToken]?.symbol}]</span> */}
                <span className='text-span'>[{position?.symbolPair}]</span>
              </div>
            </div>
          </div>
        </TableTd>
        <TableTd className={`select-td !w-[${isSmallScreen ? 11 : 12.89}rem]`}>
          <div className='info'>
            <span className='text-p tabular-nums'>
              {
                formatUsd(position?.stakedValueUsd)
              }
            </span>
            <p className='text-span tabular-nums mb-[0.4rem]'>
              ({
                formatAmount(position?.stakedAmount, position?.decimals)
              }
              &nbsp;{position?.poolType})
            </p>
          </div>
        </TableTd>
        <TableTd className={`select-td !w-[${isSmallScreen ? 10 : 12.89}rem]`}>
          <div className={`flex justify-end ${position?.isEnabled && 'effective-end'}`}>
            {
              position?.isEnabled ? <TooltipWithPortal
                handle={
                  <div className='flex'>
                    <p className='text-p mr-[0.5rem]'>{days}d</p>
                    <span className='text-span !text-[1.4rem] !font-medium'>
                      ({weeksDisplay})
                    </span>
                  </div>
                }
                renderContent={() => (
                  <p>
                    {t`The current stake ended on ${endTimeText}. Please stake again.`}
                  </p>
                )}
              /> : <>
                <p className='text-p mr-[0.5rem]'>{days}d</p>
                <span className='text-span !text-[1.4rem] !font-medium'>
                  ({weeksDisplay})
                </span>
              </>
            }
          </div>
        </TableTd>
        <TableTd className={`select-td !w-[${isSmallScreen ? 8 : 12.89}rem] text-right`}>
          <p className='text-p'>{position?.currentApr}</p>
        </TableTd>
        <TableTd className={`select-td !w-[${isSmallScreen ? 9 : 12.89}rem] text-right`}>
          <p className='text-p'>{getAvgApr}</p>
        </TableTd>
        <TableTd className={`select-td !w-[${isSmallScreen ? 9 : 12.89}rem]`}>
          <div className='reward justify-end'>
            <p className='text-p'>{formatAmount(position?.gtAmount, decimals, 2)}</p>
            {/* <TooltipWithPortal
              maxAllowedWidth={280}
              handle={
                <p className='text-p'>{formatAmount(position?.gtAmount, decimals, 2)}</p>
              }
              position="bottom-end"
              renderContent={renderTooltipContent}
            /> */}
          </div>
        </TableTd>
        <TableTd className='w-[20rem]'>
          <div className='reward justify-end'>
            <div className='btn-group'>
              <Button
                variant="ghost"
                disabled={position?.gtAmount?.lte(new BN(0)) || !stakeGloablState?.claimEnabled}
                className={`btn ${(position?.gtAmount?.lte(new BN(0)) || !stakeGloablState?.claimEnabled) ? 'disabled-button' : getGmw411Enabled() ? '!bg-primary-tones-600' : '!bg-stakebtnbg'}`}
                onClick={handleSubmitClaimGt}>
                <Trans>Claim GT</Trans>
              </Button>
              <Button
                variant="ghost"
                className={getGmw411Enabled() ? '!bg-primary-tones-600' : '!bg-stakebtnbg'}
                onClick={handleSubmitUnstake}>
                <Trans>Unstake</Trans>
              </Button>
            </div>
          </div>
        </TableTd>
      </TableTr>
    );
  }
);

StakeItemWrapper.displayName = 'StakeItemWrapper';

const StakeMobileCard = memo(
  ({
    index,
    position,
    stakeGloablState,
    stakeQueryController,
    userStore,
    onSelectPositionClick,
    onClaimGtClick,
    onUnstakeClick
  }: {
    index: number,
    position: StakePosition;
    stakeGloablState: StakeGlobalState;
    stakeQueryController: StakeQueryController;
    userStore: any;
    onSelectPositionClick: (positionKey: string, orderKey: string | undefined) => void;
    onClaimGtClick: (positionKey: string, orderKey: string | undefined) => void;
    onUnstakeClick: (positionKey: string, orderKey: string | undefined) => void;
  }) => {
    const { decimals } = userStore?.gt;

    let effectiveEndTime: number = 0;

    stakeQueryController?.forEach((item) => {
      if (item?.controllerAddress?.toString() === position?.controller?.toString()) {
        if (item.isEnabled) {
          effectiveEndTime = Math.floor(Date.now() / 1000);
        } else {
          effectiveEndTime = item.disabledAt;
        }
      }
    })

    const avgApr = getComputeTimeWeightedApyBN(position?.stakeStartTime, effectiveEndTime, stakeGloablState?.apyGradient);

    const getAvgApr = useMemo(() => {
      const avgAprValue = avgApr.gt(new BN('0')) ? formatLiquidationPrice(avgApr.muln(100), {
        displayDecimals: 2,
        showDollarSign: false,
        useCommas: false
      }) : 0;
      return `${Number(avgAprValue).toFixed(2)}%`;
    }, [avgApr]);

    const handleSubmitUnstake = useCallback(() => {
      onUnstakeClick([position]);
    }, [onUnstakeClick, position])

    const handleSubmitClaimGt = useCallback(() => {
      onClaimGtClick([position]);
    }, [onClaimGtClick, position])

    const longTokensymbol = useCallback(() => {
      return position?.symbolPair?.split('-')[0];
    }, [position])

    const shortTokensymbol = useCallback(() => {
      return position?.symbolPair?.split('-')[1];
    }, [position])

    const durationParams = useMemo(() => {
      const startTime = Number(position?.stakeStartTime);
      const endTime = Number(position?.endTime);

      if (position?.isEnabled) {
        const now = dayjs().utc().unix();
        const durationSec = endTime - startTime;
        return now - durationSec;
      }

      return startTime;
    }, [position?.stakeStartTime, position?.endTime, position?.isEnabled]);

    const days = useMemo(() => getDaysPassedUTC(durationParams), [durationParams]);
    const weeks = useMemo(() => getWeeksPassedUTC(durationParams), [durationParams]);

    const weeksDisplay = weeks < 1 ? '<1w' : `${weeks}w`;

    let endTimeText = '';
    if (position?.isEnabled) {
      const ts = position?.endTime;
      let date: Date;
      const num = Number(ts);
      if (!isNaN(num)) {
        date = new Date(num > 1e12 ? num : num * 1000);
      } else {
        date = new Date(ts);
      }
      endTimeText = date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }

    return (
      <div className="stake-mobile-card">
        <div className="stake-mobile-card-header">
          <div>
            <img
              className="stake-mobile-card-checkbox cursor-pointer"
              src={position?.select ? IconSelectEd : IconSelect}
              onClick={() => {
                onSelectPositionClick(position?.positionId?.toString())
              }}
            />
          </div>

          <div className="stake-mobile-card-token">
            <div className="stake-mobile-card-token-icon">
              <img
                className="token-icon"
                src={getIconUrlPath(position?.symbol, 24)}
                width={40}
                height={40}
              />
              {
                position?.poolType === 'GM' && (
                  <div className="ls-img">
                    <img
                      src={getIconUrlPath(longTokensymbol(), 24)}
                      alt="long-token-symbol"
                      width={18}
                    />
                    <img
                      src={getIconUrlPath(shortTokensymbol(), 24)}
                      alt="short-token-symbol"
                      width={18}
                    />
                  </div>
                )
              }
            </div>
            <div className="stake-mobile-card-token-info">
              <p className="stake-mobile-card-token-name">
                {
                  position?.poolType === 'GM'
                    // ? `${position?.poolType}:${position?.symbol}${position?.symbolName}`
                    ? `${position?.poolType}:${position?.displaySymbol}`
                    : position?.symbolAnother
                }
              </p>
              <span className="stake-mobile-card-token-pair">[{position?.symbolPair}]</span>
            </div>
          </div>
        </div>

        <div className="stake-mobile-card-content">
          <div className="stake-mobile-card-row">
            <span className="stake-mobile-card-label">
              {getGmw212Enabled() ? (
                <Trans>Initial Value</Trans>
              ) : (
                <Trans>Value</Trans>
              )}
            </span>
            <div className="stake-mobile-card-value">
              <span className="text-p">{formatUsd(position?.stakedValueUsd)}</span>
              <span className="text-span">
                &nbsp;({formatAmount(position?.stakedAmount, position?.decimals)} {position?.poolType})
              </span>
            </div>
          </div>

          <div className={`stake-mobile-card-row`}>
            <span className="stake-mobile-card-label"><Trans>Duration</Trans></span>
            <div className={`stake-mobile-card-value`}>
              {
                position?.isEnabled ? <TooltipWithPortal
                  handle={
                    <div className='flex'>
                      <p className={`text-p ${position?.isEnabled && 'effective-end'}`}>{days}d<span className='text-[#A3A3A3]'> ({weeksDisplay})</span></p>
                    </div>
                  }
                  renderContent={() => (
                    <p>
                      {t`The current stake ended on ${endTimeText}. Please stake again.`}
                    </p>
                  )}
                /> : <>
                  <p className={`text-p ${position?.isEnabled && 'effective-end'}`}>{days}d<span className='text-[#A3A3A3]'> ({weeksDisplay})</span></p>
                </>
              }
            </div>
          </div>

          <div className="stake-mobile-card-row">
            <span className="stake-mobile-card-label"><Trans>Current APR</Trans></span>
            <span className="stake-mobile-card-value text-p">{position?.currentApr}</span>
          </div>

          <div className="stake-mobile-card-row">
            <span className="stake-mobile-card-label"><Trans>AVG APR</Trans></span>
            <span className="stake-mobile-card-value text-p">{getAvgApr}</span>
          </div>

          <div className="stake-mobile-card-row">
            <span className="stake-mobile-card-label"><Trans>Unclaimed GT</Trans></span>
            <span className="stake-mobile-card-value text-p">{formatAmount(position?.gtAmount, decimals, 2)}</span>
          </div>
        </div>

        <div className="stake-mobile-card-actions">
          <Button
            variant="ghost"
            disabled={position?.gtAmount?.lte(new BN(0)) || !stakeGloablState?.claimEnabled}
            className={`stake-mobile-card-btn ${(position?.gtAmount?.lte(new BN(0)) || !stakeGloablState?.claimEnabled) ? 'disabled-button' : 'active-button'} !rounded-[0.8rem] !bg-[#1F1F1F] !px-[1.2rem] !py-[0.8rem] !text-[1.3rem] !font-[500] disabled:!bg-[#1F1F1F]`}
            onClick={handleSubmitClaimGt}
          >
            <Trans>Claim GT</Trans>
          </Button>
          <Button
            variant="ghost"
            className="stake-mobile-card-btn !rounded-[0.8rem] !bg-[#1F1F1F] !px-[1.2rem] !py-[0.8rem] !text-[1.3rem] !font-[500]"
            onClick={handleSubmitUnstake}
          >
            <Trans>Unstake</Trans>
          </Button>
        </div>
      </div>
    );
  }
);

StakeMobileCard.displayName = 'StakeMobileCard';
