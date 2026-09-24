import { useEffect, useMemo, useState } from 'react';
import { Trans, t } from '@lingui/macro';
import { Popover } from '@headlessui/react';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react';
import { useMedia } from 'react-use';

import { getGmw291Enabled } from '@/config/featureFlagEnable';
import { LEADERBOARD_LIST_PER_PAGE } from '@/config/ui';
import { BottomTablePagination } from '@/components/Common/Pagination/BottomTablePagination';
import Modal from '@/components/Common/Modal/Modal';
import FilterBox, { TreeNode } from '@/components/Common/FilterBox/FilterBox';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import { TableScrollFadeContainer } from '@/components/Common/Table/TableScrollFade/TableScrollFade';
import { useGtHistoryData } from '@/components/newGT/hooks/useGtHistoryData';
import { useGtEarnedTotals } from '@/components/newGT/hooks/useGtEarnedTotals';
import { useGtBurnSoldTotal } from '@/components/newGT/hooks/useGtBurnSoldTotal';
import { useAppStore } from '@/zustand/useAppStore';
import { selectGtGlobalDetailsDecimals } from '@/selectors/gt/gtGlobalDetailsSelectors';
import { formatAmount, formatTimestampNow } from '@/utils/legacy';
import LoadingComponent from '@/utils/LoadingComponent';
import FilterIcon from '@/img/Filter.svg?react';
import DocsIcon from '@/img/gt/docs.svg?react';

function formatSignedGt(amount: string | undefined, sign: '+' | '-'): string {
  return `${sign}${amount || '0'} GT`;
}

function GtHistorySection() {
  const isGmw291Enabled = getGmw291Enabled();
  const isMobile = useMedia('(max-width: 768px)');
  const gtDecimals = useAppStore(selectGtGlobalDetailsDecimals) || 7;

  const [page, setPage] = useState(1);
  const [selectedActionKeys, setSelectedActionKeys] = useState<string[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  // Desktop-only Action filter (AC: mobile does not support filtering)
  const activeActionKeys = useMemo(
    () => (isMobile ? [] : selectedActionKeys),
    [isMobile, selectedActionKeys]
  );
  const activeActionKey = activeActionKeys.slice().sort().join('|');

  const { gtHistory, hasMore, isLoading: isGtHistoryLoading } = useGtHistoryData(
    page,
    LEADERBOARD_LIST_PER_PAGE,
    activeActionKeys
  );
  const { earnedTotals, isLoading: isEarnedTotalsLoading } = useGtEarnedTotals(showSummary);
  const { soldBN, isLoading: isBurnSoldLoading } = useGtBurnSoldTotal(showSummary);
  const isSummaryLoading = isEarnedTotalsLoading || isBurnSoldLoading;

  const tradeAccount = formatAmount(earnedTotals.tradingBN, gtDecimals, 4, true, true);
  const stakeAccount = formatAmount(earnedTotals.stakeBN, gtDecimals, 4, true, true);
  const referralAccount = formatAmount(earnedTotals.referralBN, gtDecimals, 4, true, true);
  const sellAccount = formatAmount(soldBN, gtDecimals, 4, true, true);
  const hasSoldGt = !soldBN.isZero();

  const summaryRows = useMemo(() => {
    const rows = [
      {
        key: 'trading',
        label: t`Trading Reward`,
        value: formatSignedGt(tradeAccount, '+'),
      },
      {
        key: 'referral',
        label: t`Referral Reward`,
        value: formatSignedGt(referralAccount, '+'),
      },
      {
        key: 'staking',
        label: t`Staking Reward`,
        value: formatSignedGt(stakeAccount, '+'),
      },
    ];

    if (hasSoldGt) {
      rows.push({
        key: 'sell',
        label: t`Sell GT to Treasury`,
        value: formatSignedGt(sellAccount, '-'),
      });
    }

    return rows;
  }, [tradeAccount, referralAccount, stakeAccount, sellAccount, hasSoldGt]);

  const actionFilterPopover = useFloating({
    middleware: [offset(10), flip(), shift()],
    strategy: 'fixed',
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
  });

  const actionTypes: TreeNode[] = [
    {
      key: 'mint',
      label: t`Trading Reward`,
      value: 'mint',
    },
    {
      key: 'sell',
      label: t`Sell GT to Treasury`,
      value: 'sell',
    },
    {
      key: 'referral_rewards',
      label: t`Referral Reward`,
      value: 'referral_rewards',
    },
    {
      key: 'stake',
      label: t`Staking Reward`,
      value: 'stake',
    },
  ];

  useEffect(() => {
    setPage(1);
  }, [activeActionKey]);

  useEffect(() => {
    if (isMobile && selectedActionKeys.length > 0) {
      setSelectedActionKeys([]);
    }
  }, [isMobile, selectedActionKeys.length]);

  const pageCount = hasMore ? page + 1 : page;

  const currentPageItems = useMemo(() => {
    return (gtHistory || []).map((item) => ({
      ...item,
      timestamp: formatTimestampNow(item?.timestamp),
    }));
  }, [gtHistory]);

  const actionLabel = (action: string) => {
    if (action === 'referral_rewards') return t`Referral Reward`;
    if (action === 'stake') return t`Staking Reward`;
    if (action === 'mint') return t`Trading Reward`;
    if (action === 'sell') return t`Sell GT to Treasury`;
    return action;
  };

  return (
    <div className="gt-my-history">
      <div className="gt-my-history-header">
        <h3 className="gt-my-history-title">
          <Trans>GT History</Trans>
        </h3>
        <button
          type="button"
          className={`gt-my-history-summary-btn${showSummary ? ' is-active' : ''}`}
          onClick={() => setShowSummary(true)}
        >
          <DocsIcon width={16} height={16} aria-hidden="true" />
          <Trans>Summary</Trans>
        </button>
      </div>

      <div className="gt-my-history-divider" />

      <div className="gt-my-summary-modal-wrap">
        <Modal
          className="gt-my-summary-modal"
          isVisible={showSummary}
          setIsVisible={setShowSummary}
          label={t`GT Summary`}
        >
          {isSummaryLoading ? (
            <div className="gt-my-summary-loading">
              <LoadingComponent />
            </div>
          ) : (
            <div className="gt-my-summary-list">
              {summaryRows.map((row) => (
                <div key={row.key} className="gt-my-summary-row">
                  <span className="gt-my-summary-label">{row.label}</span>
                  <span className="gt-my-summary-value">{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      </div>

      <div className="gt-my-history-table-wrap">
        {isMobile ? (
          <div className="gt-my-history-list">
            {currentPageItems?.map((item, idx) => (
              <div
                key={item.id}
                className={`gt-my-history-list-row ${idx % 2 === 0 ? 'row-dim' : 'row-dark'}`}
              >
                <div className="gt-my-history-list-left">
                  <span className="gt-my-history-list-action">{actionLabel(item?.action)}</span>
                  <span className="gt-my-history-list-time">{item?.timestamp}</span>
                </div>
                <div className="gt-my-history-list-amount">
                  {item?.action === 'sell' ? '-' : '+'}
                  {item?.amount || '0'} GT
                </div>
              </div>
            ))}
          </div>
        ) : (
          <TableScrollFadeContainer>
            <Table className="gt-my-history-table">
              <thead>
                <TableTheadTr>
                  <TableTh padding="none" className="header-cell action">
                    <div className="header-content">
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
                                className={
                                  selectedActionKeys.length > 0 ? 'icon-active' : 'icon-inactive'
                                }
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
                  <TableTh padding="none" className="header-cell amount">
                    <Trans>AMOUNT</Trans>
                  </TableTh>
                  <TableTh padding="none" className="header-cell time">
                    <Trans>TIME</Trans>
                  </TableTh>
                </TableTheadTr>
              </thead>

              <tbody>
                {currentPageItems?.map((item, idx) => (
                  <TableTr
                    key={item.id}
                    bordered={false}
                    hoverable={false}
                    className={idx % 2 === 0 ? 'row-dim' : 'row-dark'}
                  >
                    <TableTd padding="none" className="cell action">
                      <span>{actionLabel(item?.action)}</span>
                    </TableTd>
                    <TableTd padding="none" className="cell amount">
                      <span>
                        {item?.action === 'sell' ? '-' : '+'}
                        {item?.amount || '0'} GT
                      </span>
                    </TableTd>
                    <TableTd padding="none" className="cell time text-right">
                      {item?.timestamp}
                    </TableTd>
                  </TableTr>
                ))}
              </tbody>
            </Table>
          </TableScrollFadeContainer>
        )}

        {isGmw291Enabled && isGtHistoryLoading ? (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <LoadingComponent />
          </div>
        ) : !currentPageItems || currentPageItems.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center px-4 pointer-events-none">
            <div className="text-body-medium text-center text-[#A3A3A3] font-medium pointer-events-auto">
              {t`No GT history yet`}
            </div>
          </div>
        ) : null}
      </div>

      <div className="gt-my-history-pagination">
        <BottomTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
      </div>
    </div>
  );
}

export default GtHistorySection;
