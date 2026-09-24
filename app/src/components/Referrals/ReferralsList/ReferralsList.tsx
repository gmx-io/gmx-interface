import Modal from '@/components/Common/Modal/Modal';
import Button from '@/components/Common/Button/Button';
import { t } from '@lingui/macro';
import './referralsList.scss';
import IconSortAll from '@/img/referrals/sort.svg';
import IconSort from '@/img/header/sort.svg?react';
import IconSortDown from '@/img/header/sort-down.svg?react';
import IconSortUp from '@/img/header/sort-up.svg?react';
import { useEffect, useMemo, useState } from 'react';
import { useReferrals } from '../Hooks/GetReferrals';
import { useGtRewardHistoryData } from '../Hooks/UseReferralsReward';
import { BN } from '@coral-xyz/anchor';
import { formatToKMBWithoutUsd } from '@/utils/legacy/format';
import { useLingui } from "@lingui/react";
import { useWallet } from '@solana/wallet-adapter-react';

type SortField = 'joinTime' | 'totalEarned' | 'latestEarning';

type ReferralRow = {
  address: string;
  joinTime: string;
  joinTimeTs: number;
  totalEarnedBN: BN;
  latestEarningBN: BN;
  latestEarningTs: number;
  history?: Array<{ time: string; amountBN: BN; tsMs: number }>;
};

function normalizeTimestampToMs(tsRaw: any): number {
  if (tsRaw == null) return 0;

  // BN (anchor)
  if (BN.isBN(tsRaw)) {
    const n = tsRaw.toNumber();
    return n > 1e12 ? n : n * 1000;
  }

  if (typeof tsRaw === 'bigint') {
    const n = Number(tsRaw);
    if (!Number.isFinite(n)) return 0;
    return n > 1e12 ? n : n * 1000;
  }

  if (typeof tsRaw === 'number') {
    if (!Number.isFinite(tsRaw)) return 0;
    return tsRaw > 1e12 ? tsRaw : tsRaw * 1000;
  }

  if (typeof tsRaw === 'string') {
    const n = Number(tsRaw);
    if (!Number.isFinite(n)) {
      const d = new Date(tsRaw);
      const ms = d.getTime();
      return Number.isFinite(ms) ? ms : 0;
    }
    return n > 1e12 ? n : n * 1000;
  }

  if (tsRaw instanceof Date) {
    const ms = tsRaw.getTime();
    return Number.isFinite(ms) ? ms : 0;
  }

  if (typeof tsRaw === 'object') {
    if (typeof (tsRaw as any).toNumber === 'function') {
      const n = Number((tsRaw as any).toNumber());
      if (!Number.isFinite(n)) return 0;
      return n > 1e12 ? n : n * 1000;
    }
    if (typeof (tsRaw as any).toString === 'function') {
      const n = Number((tsRaw as any).toString());
      if (!Number.isFinite(n)) return 0;
      return n > 1e12 ? n : n * 1000;
    }
  }

  const d = new Date(tsRaw);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function formatJoinTime(tsRaw: any) {
  const joinTimeTs = normalizeTimestampToMs(tsRaw);
  const date = joinTimeTs ? new Date(joinTimeTs) : new Date(tsRaw);

  const formatted = isNaN(date.getTime())
    ? ''
    : date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

  return {
    joinTime: tsRaw ? formatted : '',
    joinTimeTs: tsRaw ? (isNaN(date.getTime()) ? joinTimeTs : date.getTime()) : 0,
  };
}

function formatRewardTime(tsRaw: any) {
  const tsMs = normalizeTimestampToMs(tsRaw);
  const date = tsMs ? new Date(tsMs) : new Date(tsRaw);

  const time = isNaN(date.getTime())
    ? ''
    : date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

  return { time, tsMs: isNaN(date.getTime()) ? tsMs : date.getTime() };
}

export default function ReferralsList({
  showModal,
  onClose,
}: ReferralsCodeModalProps) {
  const { i18n } = useLingui();

  const sortFieldLabel = {
    joinTime: t`joinTime`,
    totalEarned: t`totalEarned`,
    latestEarning: t`latestEarning`,
  };
  const { publicKey } = useWallet();
  const userKey = publicKey?.toBase58() ?? null;
  const { referrals } = useReferrals();
  const { gtHistory, isLoading } = useGtRewardHistoryData();
  const formatGtKmb = useMemo(() => {
    const ZERO = new BN(0);
    const TEN = new BN(10);

    return (bn?: BN, decimals = 7, displayDecimals = 2) => {
      if (isLoading) return '...';

      const v = bn ?? ZERO;
      if (v.isZero()) {
        return `0.${'0'.repeat(displayDecimals)}`;
      }
      const exp = Math.max(decimals - displayDecimals, 0);
      const threshold = TEN.pow(new BN(exp)); 
      if (v.gt(ZERO) && v.lt(threshold)) {
        return `<0.${'0'.repeat(Math.max(displayDecimals - 1, 0))}1`;
      }

      return formatToKMBWithoutUsd(v, decimals, { displayDecimals });
    };
  }, [isLoading]);

  const [showSortModal, setShowSortModal] = useState(false);
  const [sortKey, setSortKey] = useState<SortField>('joinTime');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [previewSortKey, setPreviewSortKey] = useState<SortField>('joinTime');
  const [previewSortAsc, setPreviewSortAsc] = useState<boolean>(true);

  const earningsMap = useMemo(() => {
    if (isLoading)
      return {} as Record<
        string,
        { totalEarnedBN: BN; latestEarningBN: BN; latestEarningTs: number }
      >;

    const map: Record<
      string,
      { totalEarnedBN: BN; latestEarningBN: BN; latestEarningTs: number }
    > = {};

    (gtHistory && userKey ? gtHistory : []).forEach((item: any) => {
      if (item.kind !== 'Reward') return;

      const source = (item.source ?? '').toLowerCase();
      if (!source) return;

      const amountBN: BN = item.amountBN ?? new BN(0);

      const tsMs = normalizeTimestampToMs(item.timestamp);

      if (!map[source]) {
        map[source] = {
          totalEarnedBN: new BN(0),
          latestEarningBN: new BN(0),
          latestEarningTs: 0,
        };
      }

      map[source].totalEarnedBN = map[source].totalEarnedBN.add(amountBN);

      if (tsMs > map[source].latestEarningTs) {
        map[source].latestEarningBN = amountBN;
        map[source].latestEarningTs = tsMs;
      }
    });

    return map;
  }, [gtHistory, isLoading, userKey]);

  const historiesMap = useMemo(() => {
    if (isLoading)
      return {} as Record<string, Array<{ time: string; amountBN: BN; tsMs: number }>>;

    const map: Record<string, Array<{ time: string; amountBN: BN; tsMs: number }>> = {};

    (gtHistory && userKey ? gtHistory : []).forEach((item: any) => {
      if (item.kind !== 'Reward') return;

      const source = (item.source ?? '').toLowerCase();
      if (!source) return;

      const { time, tsMs } = formatRewardTime(item.timestamp);

      if (!map[source]) map[source] = [];
      map[source].push({
        time: time || '-',
        amountBN: item.amountBN ?? new BN(0),
        tsMs,
      });
    });

    return map;
  }, [gtHistory, isLoading, userKey]);

  const mergedList = useMemo<ReferralRow[]>(() => {
    const list = referrals ?? [];
    if (!list.length || !userKey) return [];

    return list.map((item: any) => {
      const { joinTime, joinTimeTs } = formatJoinTime(item?.joinTime);
      const normalizedAddress = String(item?.address ?? '').toLowerCase();
      const key = normalizedAddress;

      const earnings = earningsMap[key] ?? {
        totalEarnedBN: new BN(0),
        latestEarningBN: new BN(0),
        latestEarningTs: 0,
      };

      const history = historiesMap[key] ?? [];

      return {
        address: normalizedAddress,
        defaultAddress: item?.address ?? '',
        joinTime,
        joinTimeTs,
        totalEarnedBN: earnings.totalEarnedBN,
        latestEarningBN: earnings.latestEarningBN,
        latestEarningTs: earnings.latestEarningTs,
        history,
      };
    });
  }, [referrals, earningsMap, historiesMap, userKey]);

  const sortedPoolList = useMemo(() => {
    const key = sortKey;
    const MAX_HISTORY = 3;

    const rowsWithSortedHistory = mergedList.map((row) => {
      const history = [...(row.history ?? [])];

      history.sort((a, b) => (b.tsMs ?? 0) - (a.tsMs ?? 0));

      return { ...row, history };
    });

    const sortedUsers = [...rowsWithSortedHistory].sort((a, b) => {
      if (key === 'joinTime') {
        const av = a.joinTimeTs ?? 0;
        const bv = b.joinTimeTs ?? 0;
        return sortAsc ? av - bv : bv - av;
      }

      if (key === 'totalEarned') {
        const av = a.totalEarnedBN ?? new BN(0);
        const bv = b.totalEarnedBN ?? new BN(0);
        const cmp = av.cmp(bv);
        return sortAsc ? cmp : -cmp;
      }

      const aLatestTs = (a.history?.[0]?.tsMs ?? 0);
      const bLatestTs = (b.history?.[0]?.tsMs ?? 0);

      return sortAsc ? aLatestTs - bLatestTs : bLatestTs - aLatestTs;
    });

    return sortedUsers.map((row) => ({
      ...row,
      history: (row.history ?? []).slice(0, MAX_HISTORY),
    }));
  }, [mergedList, sortKey, sortAsc]);

  const handleClose = () => onClose();
  const openSortModal = () => setShowSortModal(true);
  const closeSortModal = () => setShowSortModal(false);

  const toggleOrder = (key: SortField) => {
    if (previewSortKey === key) setPreviewSortAsc((prev) => !prev);
    else {
      setPreviewSortKey(key);
      setPreviewSortAsc(true);
    }
  };

  const applySort = () => {
    setSortKey(previewSortKey);
    setSortAsc(previewSortAsc);
    closeSortModal();
  };

  const resetSort = () => {
    setPreviewSortKey('joinTime');
    setPreviewSortAsc(true);
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    // const publicKey = new PublicKey(address);
    // const formattedAddress = '0x' + publicKey.toBuffer().toString('hex');
    return `${address.slice(0, 6)}…${address.slice(-6)}`;
  }

  const getSortIcon = (field: SortField) => {
    if (previewSortKey === field) {
      return previewSortAsc ? (
        <IconSortUp fill="#FA7B4E" className="icon-sort-up" />
      ) : (
        <IconSortDown fill="#FA7B4E" className="icon-sort-down" />
      );
    }
    return <IconSort fill="currentColor" className="icon-sort" />;
  };

  const totalEarnedAllBN = useMemo(() => {
    if (!mergedList.length || !userKey) return new BN(0);
    return mergedList.reduce(
      (sum, row) => sum.add(row.totalEarnedBN ?? new BN(0)),
      new BN(0)
    );
  }, [mergedList,userKey]);

  const totalEarnedAllText = useMemo(
    () => !userKey ? '' :  formatGtKmb(totalEarnedAllBN, 7, 2),
    [formatGtKmb, totalEarnedAllBN,userKey]
  );


  useEffect(() => {
    if (!userKey) {
      setSortKey('joinTime');
      setSortAsc(true);
      setPreviewSortKey('joinTime');
      setPreviewSortAsc(true);
    }
  }, [userKey]);

  return (
    <div key={i18n.locale} className="referrals-wrap">
      <Modal
        isVisible={showModal}
        setIsVisible={handleClose}
        className={`referral-code-modal ${(referrals?.length === 0  || !userKey)? 'referral-list-modal':'referral-gt-list-modal'}`}
        qa="referral-code-modal"
        label={t`Your Referrals`}
      >
        {referrals?.length === 0  || !userKey ? (
          <div className="py-[5.7rem] text-center text-[1.4rem] font-[400] leading-[1.8rem]">
            <p>{t`No referral activity yet.`}</p>
            <p>{t`Invite friends to start earning GT.`}</p>
          </div>
        ) : (
          <div className="referral-list">
            <div className="referral-list-head">
              <div className="referral-summary">
                <p className="summary-line ">
                  <span className="!text-[#fff]">{t`You’ve invited`}</span>
                  <span className="summary-number">
                    {referrals?.length || 0}
                  </span>
                  <span className="!text-[#fff]">{t`friends.`}</span>
                </p>
                <p className="summary-line ">
                  <span className="!text-[#fff]">{t`You’ve earned`}</span>
                  <span className="summary-number">{totalEarnedAllText}</span>
                  <span>{` `}</span>
                  <span className="!text-[#fff]">{t`GT.`}</span>
                </p>
              </div>

              <div className="sort-trigger" onClick={openSortModal}>
                <img src={IconSortAll} height={16} width={16} />
                <span className="sort-trigger-text">{t`Sort`}</span>
              </div>
            </div>

            <div className="referral-list-content">
              {sortedPoolList?.map((item: any, index) => (
                <div className="referral-card" key={item.address ?? index}>
                  <div className="flex items-center justify-between border-b-[0.1rem] border-[#2C2F42] pb-[1.2rem]">
                    <div className="card-left">
                      <p className="address">
                        {formatAddress(item.defaultAddress)}
                      </p>
                      <p className="joined">
                        {t`Activated:`}{' '}
                        <span className="joined-time">{item.joinTime || "-"}</span>
                      </p>
                    </div>
                    <div className="card-right">
                      <p className="total-earned">
                        {formatGtKmb(item?.totalEarnedBN, 7, 2)} GT
                      </p>
                      <p className="mt-[0.8rem] text-[1.2rem] text-[#A3A3A3]">{t`Total Earned`}</p>
                    </div>
                  </div>

                  <div className="mt-[1.2rem]">
                    <p className="text-[1rem] leading-[1.3rem] text-[#A3A3A3]">{item?.history?.length ? t`Recent Earnings` : t`Recent GT rewards will appear here once trading begins`}</p>
                    <div className="mt-[0.4rem]">
                      {item.history?.map((historyItem: any, hIndex) => (
                        <div
                          key={hIndex}
                          className=" t-time mt-[0.8rem] flex items-center justify-between leading-[1.5rem]"
                        >
                          <span className="t-time text-[1.2rem] text-[#A3A3A3]">
                            {historyItem?.time}
                          </span>
                          <span className="text-[1.2rem] text-[#31C366]">
                            {formatGtKmb(historyItem?.amountBN, 7, 2)} GT
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {mergedList?.length === 0 && (
                <div className="empty-hint">{t`No referrals yet.`}</div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isVisible={showSortModal}
        setIsVisible={closeSortModal}
        className="referral-sort-modal"
        qa="referral-sort-modal"
        label={t`Sort by`}
      >
        <div className="sort-panel">
          {(['joinTime', 'totalEarned', 'latestEarning'] as SortField[]).map(
            (field) => (
              <div
                key={field}
                className="sort-row"
                onClick={() => toggleOrder(field)}
              >
                <span
                  className={`sort-row-label ${previewSortKey === field ? ' !text-[#fff]' : ''}`}
                >
                  {sortFieldLabel[field]}
                </span>
                <span
                  className={`w-[2rem] ${previewSortKey === field ? 'hight-svg' : ''}`}
                >
                  {getSortIcon(field)}
                </span>
              </div>
            )
          )}

          <div className="flex items-center justify-between gap-[0.8rem]">
            <Button
              variant="ghost"
              className="default-btn-style flex-1 !p-0"
              onClick={resetSort}
            >
              {t`Reset`}
            </Button>
            <Button
              variant="ghost"
              className="primary-btn-style flex-1 !p-0"
              onClick={applySort}
            >
              {t`Apply`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
