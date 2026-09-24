import { getGmw291Enabled, getGmw307Enabled } from '@/config/featureFlagEnable';
import { useState, useMemo, useEffect } from 'react';

import './GTWallet.scss';
import GtRightSvg from '@/img/gt/gt-right.svg';
import { BN_ZERO, BN_10000 } from '@/config/constants';
import FilterIcon from '@/img/Filter.svg?react';
import IconSort from '@/img/header/sort.svg?react';
import IconSortDown from '@/img/header/sort-down.svg?react';
import IconSortUp from '@/img/header/sort-up.svg?react';
import { useNavigate } from 'react-router-dom';
import { BottomTablePagination } from '@/components/Common/Pagination/BottomTablePagination';
import Button from '@/components/Common/Button/Button';
import InfoSvg from '@/components/TradeBoxNew/assets/Info.svg';
import { t } from '@lingui/macro';
import { useGtHistoryData } from '../Hooks/useGtHistoryData';
import { useGtEarnedTotals } from '../Hooks/useGtEarnedTotals';
import LoadingComponent from '@/utils/LoadingComponent';
import { toBN } from 'gmsol';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import {
  selectGtGlobalDetailsMintingCostRaw,
  selectGtGlobalDetailsRanks,
} from '@/selectors/gt/gtGlobalDetailsSelectors';
import {
  selectGtUserDetailsAmount,
  selectGtUserDetailsRank,
  selectGtUserDetailsTotalMinted,
  selectPaidFeeValue,
} from '@/selectors/gt/gtUserDetailsSelectors';
import { useAppStore } from '@/zustand/useAppStore'
import VipTiers from './VipTiers';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import { formatAmount, formatUsd } from '@/utils/legacy';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useStoreAccount } from '@/hooks/fetchHooks/useStoreAccount';
import { LEADERBOARD_LIST_PER_PAGE } from '@/config/ui';
import FilterBox, { TreeNode } from '@/components/Common/FilterBox/FilterBox';
import { Popover } from '@headlessui/react';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react';
import { Trans } from '@lingui/macro';
import { useMedia } from 'react-use';
import ArrowRight from "@/img/ArrowRight.svg";
import { TableScrollFadeContainer } from '@/components/Common/Table/TableScrollFade/TableScrollFade';
function GTWalletPaginated({ linkBuyBack }: { linkBuyBack: () => void }) {
  const { store } = useStoreAccount(GMX_SOLANA_STORE_ADDRESS);
  const [page, setPage] = useState(1);
  const [selectedActionKeys, setSelectedActionKeys] = useState<string[]>([]);
  const { gtHistory, hasMore, isLoading: isGtHistoryLoading } = useGtHistoryData(
    page,
    LEADERBOARD_LIST_PER_PAGE,
    selectedActionKeys
  );
  const isGmw291Enabled = getGmw291Enabled();
  const isGmw307Enabled = getGmw307Enabled();
  const { earnedTotals } = useGtEarnedTotals();
  const BATCH_NAMES: { [key: number]: string } = {
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
  const navigate = useNavigate();
  const userAmount = useAppStore(selectGtUserDetailsAmount);
  const mintingCost = useMemo(() => store?.gt?.mintingCost, [store?.gt?.mintingCost]);
  const gtDecimals = useMemo(() => store?.gt?.decimals, [store?.gt?.decimals]);
  const _growSteps = useMemo(() => store?.gt?.growSteps, [store?.gt?.growSteps]);
  const userRank = useAppStore(selectGtUserDetailsRank);
  const userTotalMinted = useAppStore(selectGtUserDetailsTotalMinted);
  const mintingCostRaw = useAppStore(selectGtGlobalDetailsMintingCostRaw);
  const paidFeeValue = useAppStore(selectPaidFeeValue);
  const userTotalReturn = userTotalMinted && mintingCost ? userTotalMinted.mul(mintingCost).sub(paidFeeValue) : BN_ZERO;
  const batchName = BATCH_NAMES[userRank] ?? BATCH_NAMES[0];
  // const growthSinceGenesis = toBN(Math.pow(1.021, _growSteps?.toNumber()) * 10000 - 10000);
  const growthSinceGenesisForUser = userTotalReturn && paidFeeValue && paidFeeValue.gt(BN_ZERO) ? userTotalReturn.mul(BN_10000).div(paidFeeValue) : BN_ZERO
  const [showVipTiers, setShowVipTiers] = useState(false);
  const tradeAccount = formatAmount(earnedTotals.tradingBN, gtDecimals, 4, true, true);
  const stakeAccount = formatAmount(earnedTotals.stakeBN, gtDecimals, 4, true, true);
  const referralAccount = formatAmount(earnedTotals.referralBN, gtDecimals, 4, true, true);
  const [sortField, setSortField] = useState('amount');
  const [sortFieldList, setSortFieldList] = useState<Record<string, string>>({
    amount: 'default',
  });
  const isMobile = useMedia('(max-width: 768px)');
  const actionFilterPopover = useFloating({
    middleware: [offset(10), flip(), shift()],
    strategy: 'fixed',
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
  });

  const actionTypes: TreeNode[] = [
    {
      key: 'mint',
      label: t`Mint GT by Trading`,
      value: 'mint',
    },
    {
      key: 'sell',
      label: t`Sell GT to Treasury`,
      value: 'sell',
    },
    {
      key: 'referral_rewards',
      label: t`Referral Rewards`,
      value: 'referral_rewards',
    },
    {
      key: 'stake',
      label: t`Mint GT by Staking`,
      value: 'stake',
    },
  ];

  useEffect(() => {
    setPage(1);
  }, [selectedActionKeys]);

  const sortedHistory = useMemo(() => {
    const mode = sortFieldList[sortField];
    if (!gtHistory || !mode || mode === 'default') return gtHistory || [];
    const arr = [...gtHistory];
    if (sortField === 'amount') {
      arr.sort((a: any, b: any) => {
        const aBN = a?.amountBN || BN_ZERO;
        const bBN = b?.amountBN || BN_ZERO;
        const aSigned = a?.action === 'sell' ? (aBN.isNeg() ? aBN : BN_ZERO.sub(aBN)) : aBN;
        const bSigned = b?.action === 'sell' ? (bBN.isNeg() ? bBN : BN_ZERO.sub(bBN)) : bBN;
        const cmp = aSigned.cmp(bSigned);
        return mode === 'asc' ? cmp : -cmp;
      });
    }
    return arr;
  }, [gtHistory, sortField, sortFieldList]);
  const pageCount = hasMore ? page + 1 : page;
  const currentPageItems = useMemo(() => {
    return (sortedHistory || []).map((item) => {
      const ts = item?.timestamp;
      let date: Date;
      const num = Number(ts);
      if (!isNaN(num)) {
        date = new Date(num > 1e12 ? num : num * 1000);
      } else {
        date = new Date(ts);
      }
      const formatted = date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return { ...item, timestamp: formatted };
    });
  }, [sortedHistory]);

  const getSortIcon = (field) => {
    return sortFieldList[field] === 'asc'
      ? <IconSortUp fill="#FA7B4E" className="icon-sort-up" />
      : sortFieldList[field] === 'desc'
        ? <IconSortDown fill="#FA7B4E" className="icon-sort-down" />
        : <IconSort fill="currentColor" className="icon-sort" />;
  };

  const handleSort = (field) => {
    setSortField(field);
    setSortFieldList((prev) => {
      const current = prev[field] || 'default';
      const next = current === 'default' ? 'desc' : current === 'desc' ? 'asc' : 'default';
      return { ...prev, [field]: next };
    });
    setPage(1);
  };
  const handleCloseVipTiers = () => {
    setShowVipTiers(false);
  };

  return (
    <div className="gt-wallet">
      <div className="wallet-container">
        {/* GT Wallet Header */}
        <div className="wallet-header-section">
          <div className="wallet-header">
            <h2><Trans>GT Wallet</Trans></h2>
          </div>
          <div className="wallet-info" style={{ gridTemplateRows: 'none', paddingBottom: '2rem' }}>
            <div className="info-item">
              <div className="info-label" style={{ marginBottom: isMobile ? '1rem' : '0rem' }}><Trans>GT Balance</Trans></div>
              <div className="info-value" style={{ fontWeight: isMobile ? 400 : 500 }} >{formatAmount(userAmount, gtDecimals, 2, true)} GT</div>
            </div>
            {!isMobile && <div className="info-item">
              <div className="info-label"><Trans>Total GT Earned</Trans></div>
              <div className="info-value">{formatAmount(userTotalMinted, gtDecimals, 2, true)} GT</div>
            </div>}
            <div className="info-item">
              <div className="info-label"><Trans>GT VIP Level</Trans></div>
              <div className="batch-container" onClick={() => setShowVipTiers(true)}>
                <div className={`batch-logo batch-${userRank}`} />
                <div style={{ fontWeight: 500 }}>VIP {userRank} {batchName}</div>
                <img src={GtRightSvg}
                  alt="gt-right"
                  style={{ width: '1.6rem', height: '1.6rem', cursor: 'pointer', position: 'relative' }}
                // onClick={() => setShowVipTiers(true)}
                />
              </div>
            </div>
            {!isMobile && <div className="info-item">
              <div
                className="info-label"
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <Trans>Total Return</Trans>
                <TooltipWithPortal
                  handle={<img src={InfoSvg} alt="info" />}
                  position="bottom"
                  renderContent={() =>
                    <>
                      <div>
                        <Trans>Total Return = Minted Value - Trading Fee</Trans>
                      </div>
                      <p className='totalReturn-info-item'>
                        <span><Trans>Minted Value</Trans></span>
                        <span>{formatUsd(userTotalMinted.mul(mintingCostRaw))}</span>
                      </p>
                      <p className='totalReturn-info-item'>
                        <span><Trans>Trading Fee</Trans></span>
                        <span>{formatUsd(paidFeeValue, { displayDecimals: 2 })}</span>
                      </p>
                    </>
                  }
                />
              </div>
              <div className="info-value ">
                {!userAmount.isZero() ? (
                  <div className="text-green-500">
                    {formatUsd(userTotalReturn, { signed: true })} (+
                    {formatAmount(growthSinceGenesisForUser, 2, 2)}%)
                  </div>
                ) : (
                  <div className="text-white">
                    {formatUsd(BN_ZERO)} (
                    {formatAmount(growthSinceGenesisForUser, 2, 2)}%)
                  </div>
                )}
              </div>
            </div>}
            {/* <div className="info-item"></div> */}
            {/* {!isMobile && <div className="info-item">
              <div
                className="info-label"
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <Trans>Genesis Growth</Trans>
                <TooltipWithPortal
                  handle={<img src={InfoSvg} alt="info" />}
                  position="bottom"
                  renderContent={() => <div><Trans>Growth = Current Minting Cost / Genesis Minting Cost -
                    1</Trans></div>}
                />
              </div>
              <div className="info-value ">
                {!userAmount.isZero() ? (
                  <div className="text-green-500">
                    +{formatAmount(growthSinceGenesis, 2, 2, true)}%
                  </div>
                ) : (
                  <div className="text-white">
                    {formatAmount(BN_ZERO, 2, 2, true)}%
                  </div>
                )}
              </div>
            </div>} */}
            {/* <div className="sell-gt-btn-container">
              <button className="sell-gt-btn" disabled onClick={linkBuyBack}>
                <Trans>Sell GT to Treasury</Trans>
              </button>
            </div> */}

          </div>

        </div>

        {/* Total GT Earned Section */}
        <div className="total-earned-section">
          {!isMobile && (
            <>
              <div className="history-header">
                <h3><Trans>Total GT Earned</Trans></h3>
              </div>
              <div className="earned-cards">
                <div className="earned-card">
                  <div className="card-content">
                    <div className="card-label"><Trans>Via Trading</Trans></div>
                    <div className="card-value !border-[0]">{tradeAccount ? `${tradeAccount} GT` : '0 GT'}</div>
                  </div>

                  <Button
                    variant="ghost"
                    className="card-action !h-[3.2rem] !w-full !rounded-[0.5rem] !bg-[#1F1F1F] !px-[1rem] !py-[0.5rem] !text-[1.2rem] !font-[500] !text-white hover:!bg-[#2C2C2C]"
                    onClick={() => navigate('/trade')}
                  >
                    <Trans>Trade →</Trans>
                  </Button>
                </div>
                <div className="earned-card">
                  <div className="card-content">
                    <div className="card-label"><Trans>Via Staking</Trans></div>
                    <div className="card-value !border-[0]">{stakeAccount ? `${stakeAccount} GT` : '0 GT'}</div>
                  </div>

                  <Button
                    variant="ghost"
                    className="card-action !h-[3.2rem] !w-full !rounded-[0.5rem] !bg-[#1F1F1F] !px-[1rem] !py-[0.5rem] !text-[1.2rem] !font-[500] !text-white hover:!bg-[#2C2C2C]"
                    onClick={() => navigate('/stake')}
                  >
                    <Trans>Stake →</Trans>
                  </Button>
                </div>
                <div className="earned-card">
                  <div className="card-content">
                    <div className="card-label"><Trans>Via Referral</Trans></div>
                    <div className="card-value !border-[0]">{referralAccount ? `${referralAccount} GT` : '0 GT'}</div>
                  </div>
                  <Button
                    variant="ghost"
                    className="card-action !h-[3.2rem] !w-full !rounded-[0.5rem] !bg-[#1F1F1F] !px-[1rem] !py-[0.5rem] !text-[1.2rem] !font-[500] !text-white hover:!bg-[#2C2C2C]"
                    onClick={() => navigate('/referrals')}
                  >
                    <Trans>Referral →</Trans>
                  </Button>
                </div>
              </div>
            </>
          )}

          {isMobile && (
            <div className="earned-mobile-card">
              <div className="earned-mobile-header">
                <div className="title"><Trans>Total GT Earned</Trans></div>
                <div className="value">{formatAmount(userTotalMinted, gtDecimals, 2, true)} GT</div>
              </div>
              <div className="earned-mobile-body">
                <div className="row">
                  <span><Trans>Via Trading</Trans></span>
                  <span>{tradeAccount ? `${tradeAccount} GT` : '0 GT'}</span>
                </div>
                <div className="row">
                  <span><Trans>Via Staking</Trans></span>
                  <span>{stakeAccount ? `${stakeAccount} GT` : '0 GT'}</span>
                </div>
                <div className="row">
                  <span><Trans>Via Referral</Trans></span>
                  <span>{referralAccount ? `${referralAccount} GT` : '0 GT'}</span>
                </div>
              </div>
              <div className="earned-mobile-actions">
                <Button
                  variant="ghost"
                  className="!rounded-[0.8rem] !bg-[#1f1f1f] !p-[1.2rem] !text-[1.3rem] !font-[500] !text-white hover:!bg-[#2a314d]"
                  onClick={() => navigate('/trade')}
                >
                  <Trans>Trade</Trans>
                  <img src={ArrowRight} width={16} height={16} />
                </Button>
                <Button
                  variant="ghost"
                  className="!rounded-[0.8rem] !bg-[#1f1f1f] !p-[1.2rem] !text-[1.3rem] !font-[500] !text-white hover:!bg-[#2a314d]"
                  onClick={() => navigate('/stake')}
                >
                  <Trans>Stake</Trans>
                  <img src={ArrowRight} width={16} height={16} />
                </Button>
                <Button
                  variant="ghost"
                  className="!rounded-[0.8rem] !bg-[#1f1f1f] !p-[1.2rem] !text-[1.3rem] !font-[500] !text-white hover:!bg-[#2a314d]"
                  onClick={() => navigate('/referrals')}
                >
                  <Trans>Referral</Trans>
                  <img src={ArrowRight} width={16} height={16} />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* GT History Section */}
        <div className={`history-section${isGmw307Enabled ? ' feature-gmw-307' : ''}`}>
          <div className="history-header">
            <h3><Trans>GT History</Trans></h3>
          </div>

          <div className={isGmw307Enabled ? 'relative min-h-[23.6rem]' : 'relative min-h-[42rem]'}>
            <TableScrollFadeContainer>
              <Table className="history-table">
                <TableTheadTr>
                  <TableTh className="header-cell action">
                    <div className="header-content" style={{ position: 'relative', fontSize: '1.1rem' }}>
                      <Popover style={{ paddingTop: '0.4rem' }}>
                        {({ open }) => (
                          <>
                            <Popover.Button
                              className="cursor-pointer hover:opacity-70 flex items-center gap-3"
                              ref={actionFilterPopover.refs.setReference}
                              style={{
                                color: selectedActionKeys.length > 0 ? '#FA7B4E' : '#A3A3A3',
                              }}
                            >
                              <Trans>ACTION</Trans>{' '}
                              <FilterIcon
                                width={14}
                                height={14}
                                className={selectedActionKeys.length > 0 ? 'icon-active' : 'icon-inactive'}
                              />
                            </Popover.Button>
                            {open && (
                              <FloatingPortal>
                                <Popover.Panel
                                  static
                                  ref={actionFilterPopover.refs.setFloating}
                                  style={actionFilterPopover.floatingStyles}
                                  className="z-1000 rounded-8 relative overflow-hidden border border-gray-800 bg-slate-800"
                                >
                                  <FilterBox
                                    treeData={actionTypes}
                                    selectedKeys={selectedActionKeys}
                                    onChange={(keys) => {
                                      setSelectedActionKeys(keys);
                                      setPage(1);
                                    }}
                                    searchPlaceholder={t`Search Action`}
                                    maxHeight="26rem"
                                  />
                                </Popover.Panel>
                              </FloatingPortal>
                            )}
                          </>
                        )}
                      </Popover>
                    </div>
                  </TableTh>
                  <TableTh className="header-cell amount">
                    <div className="header-content" style={{ fontSize: '1.1rem' }}>
                      <button
                        className={`sortable ${sortField === 'amount' && sortFieldList[sortField] !== 'default' ? 'select' : ''}`}
                        onClick={() => handleSort('amount')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Trans>AMOUNT</Trans> {getSortIcon('amount')}
                      </button>
                    </div>
                  </TableTh>
                  <TableTh className="header-cell time" style={{ fontSize: '1.1rem' }}><Trans>TIME</Trans></TableTh>
                </TableTheadTr>

                {
                  currentPageItems?.map((item, idx) => (
                    <TableTr key={item.id} className={idx % 2 === 0 ? 'row-dim' : 'row-dark'}>
                      <TableTd className="cell action">
                        <span>
                          {item?.action === "referral_rewards" && t`Referral Rewards`}
                          {item?.action === "stake" && t`Mint GT by Staking`}
                          {item?.action === "mint" && t`Mint GT by Trading`}
                          {item?.action === "sell" && t`Sell GT to Treasury`}
                        </span>
                      </TableTd>
                      <TableTd>
                        <span className={item?.action === "sell" ? 'text-red-500' : 'text-green-500'}>
                          {item?.action === "sell" ? '-' : '+'}{item?.amount || '0'} GT
                        </span>

                      </TableTd>
                      <TableTd className="text-right">
                        {item?.timestamp}
                      </TableTd>
                    </TableTr>
                  ))
                }
              </Table>
            </TableScrollFadeContainer>
            {isGmw291Enabled && isGtHistoryLoading ? (
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <LoadingComponent />
              </div>
            ) : (!currentPageItems || currentPageItems.length === 0) ? (
              <div className="absolute inset-0 flex items-center justify-center px-4 pointer-events-none">
                <div className="text-body-medium text-center text-[#A3A3A3] font-medium pointer-events-auto">
                  {t`No GT history yet`}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="pagination" style={{ backgroundColor: '#181818', borderTop: '1px solid #535353' }}>
          <BottomTablePagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* VIP Tiers Modal */}
      <VipTiers isVisible={showVipTiers} onClose={handleCloseVipTiers} />
    </div >
  );
}

export default GTWalletPaginated;
