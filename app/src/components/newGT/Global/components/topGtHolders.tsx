/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { getGmw291Enabled, getGmw465Enabled } from '@/config/featureFlagEnable';
import copy from '@/img/ic_copy_16.svg';
import mobileCopy from '@/img/ic_copy_12.svg'
import External from '@/img/externalGmw411.svg'
import { useGtRankStats } from '@/hooks/statsHooks/useGtRankStats';
import { BottomTablePagination } from '@/components/Common/Pagination/BottomTablePagination';
import { useWallet } from '@solana/wallet-adapter-react';
import { useGtGlobalDetails } from '@/hooks/fetchHooks/useGtGlobalDetails';
import { generateAccountInfo } from '@/utils/index';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import { t, Trans } from '@lingui/macro';
import { useMedia } from 'react-use';
import { PublicKey } from '@solana/web3.js';
import { helperNotice } from '@/utils/lib/helperNotice';
import { formatAmount } from '@/utils/legacy/format';
import { useBatchReferralCodes } from '@/hooks/referralHooks/useBatchReferralCodes';
import CellSkeleton from '@/components/Common/Skeleton/CellSkeleton';
import LoadingComponent from '@/utils/LoadingComponent';
import { FiExternalLink } from 'react-icons/fi';
import { EXPLORER_URL, getAddressUrl } from '@/utils/lib/explorer';
import { TableScrollFadeContainer } from '@/components/Common/Table/TableScrollFade/TableScrollFade';
const LEADERBOARD_LIST_PER_PAGE = 20;

const filterAddress = 'UxcS4ZQqkm2Aw9nTVQp1CXRqZ1J1qagnUhcu72yVwt9';  // GT Vault

function getExplorerAccountUrl(address: string) {
  if (getGmw465Enabled()) {
    return getAddressUrl(address);
  }
  return `${EXPLORER_URL}/address/${address}`;
}

const TH_CLASS =
  'px-20 py-10 whitespace-nowrap text-[1.1rem] !font-medium !text-secondary uppercase tracking-[0.05em]';

const TD_CLASS =
  'h-60 px-20 align-middle whitespace-nowrap text-[1.3rem] !text-white';

function TopGtHolder() {
  const { gtGlobalDetails } = useGtGlobalDetails();
  const [page, setPage] = useState(1);
  const isMobile = useMedia('(max-width: 768px)');
  const { publicKey } = useWallet();
  const currentUserBase58 = useMemo(() => publicKey?.toBase58(), [publicKey]);
  const { gtRankStats, pageCount, isLoading } = useGtRankStats({
    page,
    pageSize: LEADERBOARD_LIST_PER_PAGE,
  });
  const gtDecimals = gtGlobalDetails?.decimals;
  const isGmw291Enabled = getGmw291Enabled();

  const formatAddress = (address: string) => {
    return isMobile
      ? `${address.slice(0, 3)}...${address.slice(-3)}`
      : `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const currentPageItems = gtRankStats.userRanks;

  const currentPageOwners = useMemo(() => {
    return currentPageItems.map((user) => user.owner);
  }, [currentPageItems]);

  useEffect(() => {
    if (!currentPageItems.length) {
      return undefined;
    }

    const prefetchOwners = () => {
      currentPageItems.forEach((user) => {
        generateAccountInfo(user.owner.toBase58());
      });
    };

    if (window.requestIdleCallback) {
      const idleCallbackId = window.requestIdleCallback(prefetchOwners);
      return () => window.cancelIdleCallback(idleCallbackId);
    }

    const timeoutId = window.setTimeout(prefetchOwners, 0);
    return () => window.clearTimeout(timeoutId);
  }, [currentPageItems]);

  const getDisplayRank = (index: number) => {
    return (page - 1) * LEADERBOARD_LIST_PER_PAGE + index + 1;
  };

  const { referralCodes } = useBatchReferralCodes(currentPageOwners);
  interface ReferralCodeCellProps {
    owner: PublicKey & { toBase58: () => string };
    align?: 'start' | 'end';
  }
  const ReferralCodeCell: React.FC<ReferralCodeCellProps> = ({
    owner,
    align = 'end',
  }: ReferralCodeCellProps) => {
    const referralCode = referralCodes[owner.toBase58()];

    return (
      // ps: use min-w-[12rem] with '-'
      <div
        className={`flex items-center gap-8 ${align === 'end' ? 'justify-end min-w-[12rem]' : 'justify-start'}`}
      >
        <span
          className={`text-[${isMobile ? '1.2rem' : '1.3rem'}] font-medium ${align === 'end' ? 'text-white' : 'text-secondary'}`}
        >
          {referralCode || '-'}
        </span>
        {referralCode && (
          <button
            className="text-secondary hover:text-white"
            onClick={() => {
              const referralUrl = `${window.location.origin}/r/${referralCode}`;
              void navigator.clipboard.writeText(referralUrl);
              helperNotice.success(t`Referral link copied to clipboard.`);
            }}
          >
            <img className={isMobile ? 'w-[1.2rem] h-[1.2rem]' : ''} src={isMobile ? mobileCopy : copy} alt="copy" />
          </button>
        )}
      </div>
    );
  };
  return (
    <>
      <div className="w-full min-w-0 bg-fill-surface-base text-white rounded-[0.8rem] mb-[0.8rem]">
        <p className='font-medium text-[1.6rem] py-[2.2rem] pl-[2rem]'><Trans>Top GT Holders</Trans></p>
        <div className="mx-auto">
          <div className="relative min-h-[42rem]">
            <TableScrollFadeContainer>
              <Table
                className={`w-full rounded-5 bg-fill-surface-base ${isMobile ? 'table-fixed' : ''}`}
              >
                {isMobile ? null : (
                  <thead>
                    <TableTheadTr className="border-b border-fill-surface-accent">
                      <TableTh padding="none" className={TH_CLASS}>
                        <Trans>Rank</Trans>
                      </TableTh>
                      <TableTh padding="none" className={TH_CLASS}>
                        <Trans>Address</Trans>
                      </TableTh>
                      <TableTh padding="none" className={TH_CLASS}>
                        <Trans>GT HOLDINGS</Trans>
                      </TableTh>
                      <TableTh padding="none" className={TH_CLASS}>
                        <Trans>REFERRAL CODE</Trans>
                      </TableTh>
                    </TableTheadTr>
                  </thead>
                )}
                <tbody>
                  {isGmw291Enabled && isLoading &&
                    Array.from({ length: 10 }).map((_, i) => (
                      isMobile ? (
                        <TableTr
                          key={`lb-skeleton-${i}`}
                          bordered={false}
                          className="h-60 flex justify-between px-16 items-center tabular-nums odd:bg-fill-surface-elevated"
                        >
                          <td className='flex items-center'>
                            <div className='pr-[1.4rem] w-[3.6rem]'>
                              <CellSkeleton width={24} />
                            </div>
                            <div className="shrink-0">
                              <CellSkeleton width={24} height={24} radius="50%" />
                            </div>
                            <div className='ml-[0.8rem] flex flex-col gap-4'>
                              <CellSkeleton width={80} />
                              <CellSkeleton width={60} />
                            </div>
                          </td>
                          <td className='self-start pt-[1.2rem]'>
                            <CellSkeleton width={100} />
                          </td>
                        </TableTr>
                      ) : (
                        <TableTr
                          key={`lb-skeleton-${i}`}
                          bordered={false}
                          className="h-60 tabular-nums odd:bg-fill-surface-elevated"
                        >
                          <TableTd padding="none" className={`${TD_CLASS} font-medium`}>
                            <CellSkeleton width={24} />
                          </TableTd>
                          <TableTd padding="none" className={TD_CLASS}>
                            <div className="flex items-center gap-8 whitespace-nowrap">
                              <div className="shrink-0">
                                <CellSkeleton width={20} height={20} radius="50%" />
                              </div>
                              <CellSkeleton width={120} />
                            </div>
                          </TableTd>
                          <TableTd padding="none" className={`${TD_CLASS} font-medium`}>
                            <CellSkeleton width={100} />
                          </TableTd>
                          <TableTd padding="none" className={`${TD_CLASS} text-right font-medium`}>
                            <div className="flex items-center justify-end">
                              <CellSkeleton width={50} />
                            </div>
                          </TableTd>
                        </TableTr>
                      )
                    ))}
                  {!isLoading &&
                    currentPageItems.length > 0 &&
                    currentPageItems.map((user, index) => {
                      const ownerAddress = user.owner.toBase58();
                      const accountInfo = generateAccountInfo(ownerAddress);
                      const displayRank = getDisplayRank(index);
                      const isCurrentUser = currentUserBase58 === ownerAddress;

                      return isMobile ? (
                        <TableTr className={`h-60 border-none flex justify-between px-16 items-center tabular-nums odd:bg-fill-surface-elevated ${isCurrentUser
                          ? 'border-l-2 border-l-primary-500 bg-fill-surface-elevated'
                          : ''
                          }`} key={ownerAddress}>
                          <td className='flex items-center'>
                            <div className='pr-[1.4rem] w-[3.6rem]'>{displayRank}</div>
                            <img
                              src={accountInfo.avator}
                              alt={accountInfo.nickName}
                              className="h-[2.4rem] w-[2.4rem] rounded-full"
                            />
                            <div className='ml-[0.8rem]'>
                              <div className='flex items-center'>
                                <span>{isCurrentUser ? 'You' : ''} </span>
                                <span
                                  className={isCurrentUser ? 'text-secondary' : 'text-white'}
                                >
                                  {[filterAddress].includes(ownerAddress)
                                    ? 'GMX GT Vault'
                                    : formatAddress(ownerAddress)}
                                </span>
                                <a
                                  href={getExplorerAccountUrl(ownerAddress)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-secondary hover:text-white ml-[0.4rem]"
                                >
                                  <img src={External} className='w-[1.2rem] h-[1.2rem]' />
                                </a>
                              </div>
                              <ReferralCodeCell owner={user.owner} align="start" />
                            </div>
                          </td>
                          <td className='self-start pt-[1.2rem]'>
                            {gtDecimals
                              ? `${formatAmount(user.gt, gtDecimals, 2, true)} GT`
                              : '-'}
                          </td>
                        </TableTr>
                      ) : (
                        <TableTr
                          key={ownerAddress}
                          bordered={false}
                          className={`h-60 tabular-nums odd:bg-[#1C1C1C] ${isCurrentUser
                            ? 'border-l-2 border-l-primary-500 bg-fill-surface-elevated'
                            : ''
                            }`}
                        >
                          <TableTd padding="none" className={`${TD_CLASS} font-medium`}>
                            {displayRank}
                          </TableTd>
                          <TableTd padding="none" className={TD_CLASS}>
                            <div className="flex items-center gap-8 whitespace-nowrap">
                              <div className="shrink-0">
                                <img
                                  src={accountInfo.avator}
                                  alt={accountInfo.nickName}
                                  className="h-20 w-20 max-h-none max-w-none rounded-full"
                                />
                              </div>
                              <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2 font-medium">
                                  <span>{isCurrentUser ? 'You' : ''} </span>
                                  <span
                                    className={isCurrentUser ? 'text-secondary' : 'text-white'}
                                  >
                                    {[filterAddress].includes(ownerAddress)
                                      ? 'GMX GT Vault'
                                      : formatAddress(ownerAddress)}
                                  </span>
                                  <a
                                    href={getExplorerAccountUrl(ownerAddress)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-secondary hover:text-white"
                                  >
                                    <img src={External} className='w-[1.2rem] h-[1.2rem]' />
                                  </a>
                                </div>
                                {isMobile && (
                                  <ReferralCodeCell owner={user.owner} align="start" />
                                )}
                              </div>
                            </div>
                          </TableTd>
                          <TableTd padding="none" className={`${TD_CLASS} font-medium`}>
                            {gtDecimals
                              ? `${formatAmount(user.gt, gtDecimals, 2, true)} GT`
                              : '-'}
                          </TableTd>
                          {!isMobile && (
                            <TableTd padding="none" className={`${TD_CLASS} text-right font-medium`}>
                              <ReferralCodeCell owner={user.owner} />
                            </TableTd>
                          )}
                        </TableTr>
                      );
                    })}
                </tbody>
              </Table>
            </TableScrollFadeContainer>
            {isLoading && !isGmw291Enabled ? (
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <LoadingComponent />
              </div>
            ) : !isLoading && currentPageItems.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <div className="text-body-medium text-center text-secondary font-medium">
                  <Trans>No data available</Trans>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {pageCount > 1 && (
          <div className="border-t border-fill-surface-accent bg-fill-surface-base rounded-b-[0.8rem]">
            <BottomTablePagination
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </>
  );
}

export default TopGtHolder;
