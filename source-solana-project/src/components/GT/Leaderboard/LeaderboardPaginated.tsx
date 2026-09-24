/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { getGmw291Enabled, getGmw465Enabled } from '@/config/featureFlagEnable';
import './Leaderboard.scss';
import batch_0_novice from '@/img/batch_0_novice.svg';
import batch_1_herald from '@/img/batch_1_herald.svg';
import batch_2_guardian from '@/img/batch_2_guardian.svg';
import batch_3_crusader from '@/img/batch_3_crusader.svg';
import batch_4_archon from '@/img/batch_4_archon.svg';
import batch_5_legend from '@/img/batch_5_legend.svg';
import batch_6_ancient from '@/img/batch_6_ancient.svg';
import batch_7_divine from '@/img/batch_7_divine.svg';
import batch_8_immortal from '@/img/batch_8_immortal.svg';
import batch_9_celestial from '@/img/batch_9_celestial.svg';
import copy from '@/img/ic_copy_16.svg';
import leftIcon from '@/img/left.svg';
import InfoSvg from '@/img/pools/Info.svg';

import { useGtRankStats } from '@/hooks/statsHooks/useGtRankStats';
import { BottomTablePagination } from '@/components/Common/Pagination/BottomTablePagination';
import { useWallet } from '@solana/wallet-adapter-react';
import { useGtGlobalDetails } from '@/hooks/fetchHooks/useGtGlobalDetails';

import { useGtRankStatForUser } from '@/hooks/statsHooks/useGtRankStatForUser';
import { generateAccountInfo } from '@/utils/index';


import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import { t, Trans } from '@lingui/macro';
import VipTiers from '@/components/GT/Wallet/VipTiers';
import { useMedia } from 'react-use';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { helperNotice } from '@/utils/lib/helperNotice';
import { formatAmount, formatUsd } from '@/utils/legacy/format';
import { useBatchReferralCodes } from '@/hooks/referralHooks/useBatchReferralCodes';
import CellSkeleton from '@/components/Common/Skeleton/CellSkeleton';
import LoadingComponent from '@/utils/LoadingComponent';
import { FiExternalLink } from 'react-icons/fi';
import { EXPLORER_URL, getAddressUrl } from '@/utils/lib/explorer';
import { TableScrollFadeContainer } from '@/components/Common/Table/TableScrollFade/TableScrollFade';
const LEADERBOARD_LIST_PER_PAGE = 20;

type BatchRank = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
const batchIcons: Record<BatchRank, string> = {
  0: batch_0_novice,
  1: batch_1_herald,
  2: batch_2_guardian,
  3: batch_3_crusader,
  4: batch_4_archon,
  5: batch_5_legend,
  6: batch_6_ancient,
  7: batch_7_divine,
  8: batch_8_immortal,
  9: batch_9_celestial,
};
const filterAddress = 'UxcS4ZQqkm2Aw9nTVQp1CXRqZ1J1qagnUhcu72yVwt9';

function LeaderboardPaginated() {
  const { gtGlobalDetails } = useGtGlobalDetails();
  const BATCH_NAMES: Record<BatchRank, string> = {
    0: t`Novice`,
    1: t`Herald`,
    2: t`Guardian`,
    3: t`Crusader`,
    4: t`Archon`,
    5: t`Legend`,
    6: t`Ancient`,
    7: t`Divine`,
    8: t`Immortal`,
    9: t`Celestial`,
  };
  const [page, setPage] = useState(1);
  const isMobile = useMedia('(max-width: 768px)');
  const { publicKey } = useWallet();
  const currentUserBase58 = useMemo(() => publicKey?.toBase58(), [publicKey]);
  const { userRankInfo, isLoading: isUserRankLoading } = useGtRankStatForUser(
    publicKey?.toBase58()
  );
  const { gtRankStats, pageCount, isLoading: gtRankStatsLoading } = useGtRankStats({
    page,
    pageSize: LEADERBOARD_LIST_PER_PAGE,
    currentUserAddress: currentUserBase58,
    currentUserRank: userRankInfo.currentRank,
    currentUserGt: userRankInfo.currentUserGt,
    isUserRankLoading,
  });
  const ranks = gtGlobalDetails?.ranks || [];
  const gtDecimals = gtGlobalDetails?.decimals;
  const mintingCostRaw = gtGlobalDetails?.mintingCost;
  const [showVipTiers, setShowVipTiers] = useState(false);
  const isLoading =
    gtRankStatsLoading || (Boolean(currentUserBase58) && isUserRankLoading);
  const isGmw291Enabled = getGmw291Enabled();
  const handleCloseVipTiers = () => {
    setShowVipTiers(false);
  };
  const getBatchRank = (gt: BN): BatchRank => {
    if (!ranks?.length) return 0;

    // Calculate VIP level based on GT amount
    for (let i = 0; i < ranks.length; i++) {
      if (gt.lt(ranks[i])) {
        return i as BatchRank;
      }
    }
    return (ranks.length > 9 ? 9 : ranks.length) as BatchRank;
  };

  const formatAddress = (address: string) => {
    return isMobile
      ? `${address.slice(0, 3)}...${address.slice(-3)}`
      : `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const currentPageItems = gtRankStats.userRanks;

  const currentPageOwners = useMemo(() => {
    return currentPageItems.map((user) => user.owner);
  }, [currentPageItems]);

  const currentUserInList = useMemo(() => {
    if (!currentUserBase58 || !userRankInfo.currentRank) {
      return undefined;
    }

    return {
      owner: { toBase58: () => currentUserBase58 },
      gt: userRankInfo.currentUserGt,
    };
  }, [currentUserBase58, userRankInfo.currentRank, userRankInfo.currentUserGt]);

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

  const getDisplayRank = (index: number, user: any) => {
    const actualIndex = (page - 1) * LEADERBOARD_LIST_PER_PAGE + index;

    if (
      actualIndex === 0 &&
      currentUserBase58 === user.owner.toBase58() &&
      userRankInfo?.currentRank &&
      currentUserInList
    ) {
      return userRankInfo.currentRank;
    }

    if (currentUserInList && userRankInfo?.currentRank) {
      const displayRank = actualIndex;
      if (displayRank >= userRankInfo.currentRank) {
        return displayRank + 1;
      }
      return displayRank;
    }

    return actualIndex + 1;
  };

  const { referralCodes } = useBatchReferralCodes(currentPageOwners);
  interface ReferralCodeCellProps {
    owner: PublicKey & { toBase58: () => string };
  }
  const ReferralCodeCell: React.FC<ReferralCodeCellProps> = ({
    owner,
  }: {
    owner: PublicKey;
  }) => {
    const referralCode = referralCodes[owner.toBase58()];

    return (
      <div className="flex items-center justify-end gap-8">
        <span className="text-[1.3rem] font-medium text-[#fff]">
          {referralCode || '-'}
        </span>
        {referralCode && (
          <button
            className="text-[#A3A3A3] hover:text-white"
            onClick={() => {
              const referralUrl = `${window.location.origin}/r/${referralCode}`;
              void navigator.clipboard.writeText(referralUrl);
              helperNotice.success(t`Referral link copied to clipboard.`);
            }}
          >
            <img src={copy} alt="copy" />
          </button>
        )}
      </div>
    );
  };
  return (
    <>
      <div className="gt-leaderboard bg-[#181818]">
        <div className="leaderboard-container">
          <div className="relative min-h-[42rem] bg-[#181818]">
            <TableScrollFadeContainer>
              <Table className="leaderboard-table">
                <thead>
                  <TableTheadTr>
                    <TableTh className="header-cell rank">
                      <Trans>Rank</Trans>
                    </TableTh>
                    <TableTh
                      className="header-cell batch"
                      style={{ display: 'flex', cursor: 'pointer' }}
                      onClick={() => setShowVipTiers(true)}
                    >
                      <Trans>Batch</Trans>
                      <img
                        src={leftIcon}
                        width={16}
                        height={16}
                        alt="vip"
                        style={{
                          rotate: '180deg',
                          filter:
                            'invert(68%) sepia(8%) saturate(1089%) hue-rotate(198deg) brightness(92%) contrast(86%)',
                          opacity: 0.7,
                        }}
                      />
                    </TableTh>
                    <TableTh className="header-cell address">
                      <Trans>Address</Trans>
                    </TableTh>
                    <TableTh className="header-cell holdings">
                      <Trans>GT HOLDINGS</Trans>
                    </TableTh>
                    <TableTh className="header-cell value">
                      <Trans>GT VALUE</Trans>
                      <TooltipWithPortal
                        className="TradeFeesRow-tooltip"
                        handle={
                          <img
                            src={InfoSvg}
                            alt=""
                            className="typeOptions-setting-info positive"
                          />
                        }
                        position="bottom-end"
                        renderContent={() => (
                          <div>
                            <p>
                              {t`Estimated based on the current minting cost.`}
                            </p>
                          </div>
                        )}
                      />
                    </TableTh>
                    <TableTh className="header-cell referral">
                      <Trans>REFERRAL CODE</Trans>
                    </TableTh>
                  </TableTheadTr>
                </thead>
                <tbody>
                  {isGmw291Enabled && isLoading &&
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableTr key={`lb-skeleton-${i}`} className="table-row">
                        <TableTd className="cell rank">
                          <CellSkeleton width={24} />
                        </TableTd>
                        <TableTd className="cell batch">
                          <div className="batch-info">
                            <div className="batch-icon">
                              <CellSkeleton width={24} height={24} radius="50%" />
                            </div>
                            <CellSkeleton width={60} />
                          </div>
                        </TableTd>
                        <TableTd className="cell address">
                          <div className="address-info">
                            <div className="address-icon">
                              <CellSkeleton width={20} height={20} radius="50%" />
                            </div>
                            <CellSkeleton width={120} />
                          </div>
                        </TableTd>
                        <TableTd className="cell holdings">
                          <CellSkeleton width={100} />
                        </TableTd>
                        <TableTd className="cell value">
                          <CellSkeleton width={90} />
                        </TableTd>
                        <TableTd className="cell referral">
                          <CellSkeleton width={50} />
                        </TableTd>
                      </TableTr>
                    ))}
                  {!isLoading &&
                    currentPageItems.length > 0 &&
                    currentPageItems.map((user, index) => {
                      const ownerAddress = user.owner.toBase58();
                      const accountInfo = generateAccountInfo(ownerAddress);
                      const batchRank = getBatchRank(user.gt);
                      const displayRank = getDisplayRank(index, user);
                      const isCurrentUser = currentUserBase58 === ownerAddress;

                      return (
                        <TableTr
                          key={ownerAddress}
                          className={`table-row ${isCurrentUser ? 'highlight-row' : ''}`}
                        >
                          <TableTd className="cell rank">{displayRank}</TableTd>
                          <TableTd className="cell batch">
                            <div className="batch-info">
                              <div className="batch-icon">
                                <img
                                  src={batchIcons[batchRank]}
                                  alt={BATCH_NAMES[batchRank]}
                                />
                              </div>
                              <span>{BATCH_NAMES[batchRank]}</span>
                            </div>
                          </TableTd>
                          <TableTd className="cell address">
                            <div className="address-info">
                              <div className="address-icon">
                                <img
                                  src={accountInfo.avator}
                                  alt={accountInfo.nickName}
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                  }}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span>{isCurrentUser ? 'You' : ''} </span>
                                <span
                                  style={{
                                    color: isCurrentUser ? '#A3A3A3' : 'white',
                                  }}
                                >
                                  {[filterAddress].includes(ownerAddress)
                                    ? 'GMX GT Vault'
                                    : formatAddress(ownerAddress)}
                                </span>
                                <a
                                  href={getGmw465Enabled() ? getAddressUrl(ownerAddress) : `${EXPLORER_URL}/address/${ownerAddress}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#A3A3A3] hover:text-white"
                                >
                                  <FiExternalLink size={16} />
                                </a>
                              </div>
                            </div>
                          </TableTd>
                          <TableTd className="cell holdings">
                            {gtDecimals
                              ? `${formatAmount(user.gt, gtDecimals, 2, true)} GT`
                              : '-'}
                          </TableTd>
                          <TableTd className="cell value">
                            {mintingCostRaw
                              ? formatUsd(user.gt.mul(mintingCostRaw))
                              : '-'}
                          </TableTd>
                          <TableTd className="cell referral">
                            <ReferralCodeCell owner={user.owner} />
                          </TableTd>
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
                <div className="text-body-medium text-center text-[#A3A3A3] font-medium">
                  <Trans>No data available</Trans>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {pageCount > 1 && (
          <div
            style={{
              backgroundColor: '#181818',
              borderTop: '1px solid #535353',
            }}
          >
            <BottomTablePagination
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
      <VipTiers isVisible={showVipTiers} onClose={handleCloseVipTiers} />
    </>
  );
}

export default LeaderboardPaginated;
