import './newReferral.scss';

import Modal from '@/components/Common/Modal/Modal';
import Header from '@/components/NewHeader/Header';
import ReferralsCodeModal from '@/components/Referrals/Code/CodeModal';
import { useReferrals } from '@/components/Referrals/Hooks/GetReferrals';
import {
  useActiveRefereeCount,
  useGtRewardHistoryData,
} from '@/components/Referrals/Hooks/UseReferralsReward';
import { BlockUsIpModal } from '@/components/BlockUsIpModal';
import {
  selectGtGlobalDetailsDecimals,
  selectGtGlobalDetailsReferralRewardFactors,
} from '@/selectors/gt/gtGlobalDetailsSelectors';
import { selectGtUserDetailsRank } from '@/selectors/gt/gtUserDetailsSelectors';
import {
  selectRefereeCount,
  selectReferralCode,
} from '@/selectors/referral/baseSelectors';
import { useAppStore } from '@/zustand/useAppStore';
import { formatAmount, formatTVDate, formatTimestampNow } from '@/utils/legacy';
import { helperNotice } from '@/utils/lib/helperNotice';
import { shortenAddressOrEns } from '@/utils/lib/wallet';
import {
  getGmw35Enabled,
  getGmw404Enabled,
  getGmw426Enabled,
  getGmw446Enabled,
} from '@/config/featureFlagEnable';
import { useGtGlobalDetails, useReferralDetails } from '@/hooks/fetchHooks';
import { useDecodeReferralCode } from '@/hooks/referralHooks';
import { BottomTablePagination } from '@/components/Common/Pagination/BottomTablePagination';
import LoadingComponent from '@/utils/LoadingComponent';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import ReferralSetCard from '@/components/Referrals/Referral/ReferralSetCard';
import IconLink from '@/img/referrals/link.svg';
import IconHelp from '@/img/referrals/help.svg';
import IconSwapMobile from '@/img/referrals/Swap_mobile.svg';
import IconSortDown from '@/img/referrals/Sort_down.svg';
import IconSortUp from '@/img/referrals/Sort_up.svg';
import IconSort from '@/img/referrals/Sort_up_down.svg';
import IconUsers from '@/img/referrals/users_01.svg';
import { BN } from '@coral-xyz/anchor';
import { useLingui } from '@lingui/react';
import { t, Trans } from '@lingui/macro';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useCopyToClipboard, useMedia } from 'react-use';
import { useShallow } from 'zustand/react/shallow';

type ActivityRow = {
  id: string;
  timestampMs: number;
  time: string;
  referee: string;
  rewardBN: BN;
};

type RefereeRow = {
  address: string;
  joined: string;
  joinedTs: number;
  hasEarnings: boolean;
  totalEarnedBN: BN;
  latestEarningTs: number;
  lastReward: string;
};

type RefereeWindow = 30 | 90 | 'total';
type RefereeSortKey = 'joined' | 'gtReward' | 'lastReward';
type SortDirection = 'asc' | 'desc';
type RefereeSortState = {
  key: RefereeSortKey;
  direction: SortDirection;
};

const ZERO_BN = new BN(0);
const TABLE_PAGE_SIZE = 10;
const DEFAULT_REFEREE_SORT_KEY: RefereeSortKey = 'gtReward';
const DEFAULT_REFEREE_SORT_DIRECTION: SortDirection = 'desc';

function ReferralRewardsHelpContent({
  rewardRate,
  referralRewardExample,
  hasRewardRate,
}: {
  rewardRate: string | number;
  referralRewardExample: string | number;
  hasRewardRate: boolean;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-[0.8rem]">
        <div className="referral-new-rewards-item">
          <span className="referral-new-rewards-bullet" />
          <p>{t`Your referees receive a permanent 10% trading fee discount.`}</p>
        </div>
        <div className="referral-new-rewards-line" />
        <div className="referral-new-rewards-item">
          <span className="referral-new-rewards-bullet" />
          <p>
            {getGmw446Enabled()
              ? t`You earn GT rewards when your referees generate GT from trading.`
              : t`You earn GT rewards and increase your sellable GT quota when your referees generate GT from trading.`}
          </p>
        </div>
        <div className="referral-new-rewards-line" />
        <div className="referral-new-rewards-item referral-new-rewards-item-rate">
          <span className="referral-new-rewards-bullet" />
          <p>
            <ReferralRewardRateDescription
              rewardRate={rewardRate}
              referralRewardExample={referralRewardExample}
              hasRewardRate={hasRewardRate}
            />
          </p>
        </div>
        <div className="referral-new-rewards-line" />
        <div className="referral-new-rewards-item">
          <span className="referral-new-rewards-bullet" />
          <p>
            {t`Your referral reward rate is based on your GT VIP level. Higher VIP levels receive higher referral rewards.`}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReferralRewardRateDescription({
  rewardRate,
  referralRewardExample,
  hasRewardRate,
}: {
  rewardRate: string | number;
  referralRewardExample: string | number;
  hasRewardRate: boolean;
}) {
  if (hasRewardRate) {
    if (getGmw446Enabled()) {
      return (
        <Trans>
          Your current referral reward rate is {rewardRate}%. If a referee earns
          100 GT from trading, you receive {referralRewardExample} GT rewards.
        </Trans>
      );
    }
    return (
      <Trans>
        Your current referral reward rate is {rewardRate}%. If a referee earns
        100 GT from trading, you receive {referralRewardExample} GT rewards and
        gain 100 sellable GT quota.
      </Trans>
    );
  }

  if (getGmw446Enabled()) {
    return (
      <Trans>
        Referral reward rates depend on GT VIP level. For example, at a 20% rate,
        if a referee earns 100 GT from trading, you receive 20 GT rewards.
      </Trans>
    );
  }
  return (
    <Trans>
      Referral reward rates depend on GT VIP level. For example, at a 20% rate,
      if a referee earns 100 GT from trading, you receive 20 GT rewards and gain
      100 sellable GT quota.
    </Trans>
  );
}

function ReferralMobileSortSheet({
  isVisible,
  selectedSort,
  onSelect,
  onReset,
  onApply,
  onClose,
}: {
  isVisible: boolean;
  selectedSort: RefereeSortState | null;
  onSelect: (key: RefereeSortKey) => void;
  onReset: () => void;
  onApply: () => void;
  onClose: () => void;
}) {
  if (!isVisible) return null;

  const effectiveSelectedSort = selectedSort ?? {
    key: DEFAULT_REFEREE_SORT_KEY,
    direction: DEFAULT_REFEREE_SORT_DIRECTION,
  };

  const sortOptions: { label: string; key: RefereeSortKey }[] = [
    { label: t`Total GT Reward`, key: 'gtReward' },
    { label: t`Join Time`, key: 'joined' },
    { label: t`Last Reward`, key: 'lastReward' },
  ];

  return (
    <div className="referral-new-mobile-sort-backdrop" onClick={onClose}>
      <section
        className="referral-new-mobile-sort-sheet"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="referral-new-mobile-sort-sheet-head px-[1.6rem]">
          <span>{t`Sort by`}</span>
          <button
            type="button"
            className="referral-new-mobile-sort-close"
            onClick={onClose}
            aria-label={t`Close`}
          >
            <span />
          </button>
        </div>

        <div className="referral-new-mobile-sort-options py-[1.6rem] border-b border-[#535353] px-[1.6rem]">
          {sortOptions.map((option) => {
            const isActive = effectiveSelectedSort.key === option.key;
            const sortIcon = isActive
              ? effectiveSelectedSort.direction === 'asc'
                ? IconSortUp
                : IconSortDown
              : IconSort;

            return (
              <button
                key={option.key}
                type="button"
                className={`referral-new-mobile-sort-option ${isActive ? 'active' : ''
                  }`}
                onClick={() => onSelect(option.key)}
              >
                <span>{option.label}</span>
                <img src={sortIcon} alt="" aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <div className="referral-new-mobile-sort-actions p-[1.6rem]">
          <button type="button" onClick={onReset}>
            {t`Reset`}
          </button>
          <button type="button" onClick={onApply}>
            {t`Apply`}
          </button>
        </div>
      </section>
    </div>
  );
}

export function ReferralCreateCodeInput({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        width: '30rem',
        height: '4rem',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        overflow: 'hidden',
        border: 0,
        borderRadius: '0.8rem',
        background: '#fa7b4e',
        padding: '0.8rem 0.8rem 0.8rem 1.2rem',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          color: '#fff',
          fontFamily: "'Inter Referral', Inter, sans-serif",
          fontSize: '1.4rem',
          fontWeight: 400,
          lineHeight: 1.34,
          letterSpacing: '-0.00336rem',
          textAlign: 'right',
          whiteSpace: 'nowrap',
          wordBreak: 'break-word',
        }}
      >
        {t`Create Your Referral Code`}
      </span>
    </button>
  );
}

function normalizeTimestampToMs(tsRaw: unknown): number {
  if (tsRaw == null) return 0;

  if (BN.isBN(tsRaw)) {
    const value = tsRaw.toNumber();
    return value > 1e12 ? value : value * 1000;
  }

  if (typeof tsRaw === 'number') {
    return tsRaw > 1e12 ? tsRaw : tsRaw * 1000;
  }

  if (typeof tsRaw === 'string') {
    const value = Number(tsRaw);
    if (Number.isFinite(value)) {
      return value > 1e12 ? value : value * 1000;
    }
    const dateValue = new Date(tsRaw).getTime();
    return Number.isFinite(dateValue) ? dateValue : 0;
  }

  return 0;
}

function isWithinRefereeWindow(timestampMs: number, window: RefereeWindow) {
  if (window === 'total') return Boolean(timestampMs);
  if (!timestampMs) return false;

  const now = Date.now();
  const windowMs = window * 24 * 60 * 60 * 1000;
  return timestampMs <= now && now - timestampMs <= windowMs;
}

function useReferralPageData(userKey: string | null) {
  const prevUserKeyRef = useRef<string | null>(userKey);
  const {
    setReferralDetails,
    setReferralIsLoading,
    setGtGlobalDetails,
    setGtIsLoading,
  } = useAppStore(
    useShallow((state) => ({
      setReferralDetails: state.referralState.setDetails,
      setReferralIsLoading: state.referralState.setIsLoading,
      setGtGlobalDetails: state.gtState.setGlobalDetails,
      setGtIsLoading: state.gtState.setIsLoading,
    }))
  );

  const { referralDetails, isLoading: isReferralLoading } =
    useReferralDetails(userKey);
  const { gtGlobalDetails, isLoading: isGtGlobalLoading } =
    useGtGlobalDetails();

  useEffect(() => {
    if (prevUserKeyRef.current === userKey) {
      return;
    }

    prevUserKeyRef.current = userKey;
    setReferralDetails(null);
    setReferralIsLoading(Boolean(userKey));
  }, [setReferralDetails, setReferralIsLoading, userKey]);

  useEffect(() => {
    setReferralIsLoading(isReferralLoading);
    if (!isReferralLoading) {
      setReferralDetails(userKey ? (referralDetails ?? null) : null);
    }
  }, [
    isReferralLoading,
    referralDetails,
    setReferralDetails,
    setReferralIsLoading,
    userKey,
  ]);

  useEffect(() => {
    setGtIsLoading(isGtGlobalLoading);
    if (!isGtGlobalLoading) {
      setGtGlobalDetails(gtGlobalDetails ?? null);
    }
  }, [gtGlobalDetails, isGtGlobalLoading, setGtGlobalDetails, setGtIsLoading]);
}

export default function NewReferral() {
  const { i18n } = useLingui();
  const isMobile = useMedia('(max-width: 870px)');
  const [searchParams] = useSearchParams();
  const legacyReferralCode = (searchParams.get('ref') ?? '').trim();
  const { publicKey } = useWallet();
  const userKey = publicKey?.toBase58() ?? null;
  const [, copyToClipboard] = useCopyToClipboard();
  const decodeReferralCode = useDecodeReferralCode();

  useReferralPageData(userKey);

  const referralCode = useAppStore(selectReferralCode);
  const refereeCount = useAppStore(selectRefereeCount);
  const userRank = useAppStore(selectGtUserDetailsRank);
  const gtDecimals = useAppStore(selectGtGlobalDetailsDecimals);
  const referralRewardFactors = useAppStore(
    selectGtGlobalDetailsReferralRewardFactors
  );

  const { referrals, loading: isReferralsLoading } = useReferrals();

  const [decodedReferralCode, setDecodedReferralCode] = useState('');
  const [activeTab, setActiveTab] = useState<'activity' | 'referees'>(
    'activity'
  );
  const primaryTabsRef = useRef<HTMLDivElement>(null);
  const [tabIndicator, setTabIndicator] = useState({
    activityWidth: 0,
    refereesWidth: 0,
    offset: 0,
  });
  const [activityWindow, setActivityWindow] = useState<7 | 30 | 90>(7);
  const [activityPage, setActivityPage] = useState(1);
  const [refereeWindow, setRefereeWindow] = useState<RefereeWindow>(30);
  const [refereeFetchWindow, setRefereeFetchWindow] =
    useState<RefereeWindow>(30);
  const [refereeSort, setRefereeSort] = useState<RefereeSortState | null>(
    null
  );
  const [refereePage, setRefereePage] = useState(1);
  const [mobileRefereeSortDraft, setMobileRefereeSortDraft] =
    useState<RefereeSortState | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showRewardsHelpModal, setShowRewardsHelpModal] = useState(false);
  const [showMobileRefereeSortSheet, setShowMobileRefereeSortSheet] =
    useState(false);
  const refereeRequestWindow: RefereeWindow =
    refereeWindow === 'total' || refereeFetchWindow === 'total'
      ? 'total'
      : Math.max(refereeWindow, refereeFetchWindow) as 30 | 90;
  const rewardHistoryWindowDays =
    activeTab === 'activity'
      ? activityWindow
      : refereeRequestWindow === 'total'
        ? undefined
        : refereeRequestWindow;
  const {
    gtHistory,
    totalCount: activityTotalCount,
    isLoading: isRewardHistoryLoading,
  } =
    useGtRewardHistoryData({ days: rewardHistoryWindowDays });

  useEffect(() => {
    setDecodedReferralCode('');
  }, [userKey]);

  useEffect(() => {
    setRefereeFetchWindow(30);
  }, [userKey]);

  useEffect(() => {
    if (refereeWindow === 'total') {
      setRefereeFetchWindow('total');
    } else if (
      refereeFetchWindow !== 'total' &&
      refereeWindow > refereeFetchWindow
    ) {
      setRefereeFetchWindow(refereeWindow);
    }
  }, [refereeFetchWindow, refereeWindow]);

  useEffect(() => {
    if (!isMobile || activeTab !== 'referees') {
      setShowMobileRefereeSortSheet(false);
    }
  }, [activeTab, isMobile]);

  useEffect(() => {
    const tabs = primaryTabsRef.current;
    if (!tabs) return;

    const buttons = tabs.querySelectorAll('button');
    const activityButton = buttons[0];
    const refereesButton = buttons[1];
    if (!activityButton || !refereesButton) return;

    setTabIndicator({
      activityWidth: activityButton.getBoundingClientRect().width,
      refereesWidth: refereesButton.getBoundingClientRect().width,
      offset:
        refereesButton.getBoundingClientRect().left -
        activityButton.getBoundingClientRect().left,
    });
  }, [activeTab, isMobile]);

  useEffect(() => {
    if (!userKey || !referralCode) {
      setDecodedReferralCode('');
      return;
    }

    const currentUserKey = userKey;
    void decodeReferralCode(referralCode).then((decoded) => {
      if ((publicKey?.toBase58() ?? null) === currentUserKey) {
        setDecodedReferralCode(decoded);
        setShowCodeModal(false);
      }
    });
  }, [decodeReferralCode, publicKey, referralCode, userKey]);

  const referralLink = decodedReferralCode
    ? `${location.origin}/r/${decodedReferralCode}`
    : 'https://gmtrade.xyz/r/{referralcode}';

  const currentReferralReward = useMemo(() => {
    if (!userKey) {
      return null;
    }

    const referralRewardFactor = referralRewardFactors[userRank];
    if (!referralRewardFactor) {
      return null;
    }

    const referralRewardExampleBN = referralRewardFactor.muln(100);
    const referralRewardExample = formatAmount(
      referralRewardExampleBN,
      20,
      0,
      true
    );

    return {
      rate: formatAmount(referralRewardExampleBN, 20, 0, true),
      referralRewardExample,
    };
  }, [referralRewardFactors, userKey, userRank]);

  const hasReferralRewardRate = currentReferralReward !== null;
  const displayReferralRewardRate = currentReferralReward?.rate ?? 0;
  const displayReferralRewardExample =
    currentReferralReward?.referralRewardExample ?? 20;

  const rewardHistory = useMemo(() => {
    return (gtHistory ?? []).filter((item) => item.source);
  }, [gtHistory]);

  // An independent, fixed 7-day query. It cannot be derived from 
  // the tabular data, as the table is affected by the current tab, 
  // time window, and pagination offset; consequently, the derived 
  // "active" count would fluctuate based on the UI state.
  const { activeRefereeCount: activeRefereeCountData } = useActiveRefereeCount();
  const hasActiveRefereeCount = activeRefereeCountData !== undefined;
  const activeRefereeCount = activeRefereeCountData ?? 0;
  const inactiveRefereeCount = hasActiveRefereeCount
    ? Math.max(refereeCount - activeRefereeCount, 0)
    : 0;
  // use '-' while loading to avoid a momentary flash of "0 Active / 0 Inactive".
  const displayActiveRefereeCount = hasActiveRefereeCount
    ? activeRefereeCount
    : '-';
  const displayInactiveRefereeCount = hasActiveRefereeCount
    ? inactiveRefereeCount
    : '-';

  const activityBatchRows = useMemo<ActivityRow[]>(() => {
    const now = Date.now();
    const windowMs = activityWindow * 24 * 60 * 60 * 1000;

    return rewardHistory
      .map((item) => {
        const timestampMs = normalizeTimestampToMs(item.timestamp);
        return {
          id: item.id,
          timestampMs,
          time: formatTimestampNow(timestampMs) || '-',
          referee: item.source ?? '',
          rewardBN: item.amountBN ?? ZERO_BN,
        };
      })
      .filter((row) => !row.timestampMs || now - row.timestampMs <= windowMs)
      .sort((a, b) => b.timestampMs - a.timestampMs);
  }, [activityWindow, rewardHistory]);

  const activityRows = useMemo<ActivityRow[]>(() => {
    const start = (activityPage - 1) * TABLE_PAGE_SIZE;
    return activityBatchRows.slice(
      start,
      start + TABLE_PAGE_SIZE
    );
  }, [activityBatchRows, activityPage]);

  const activityPageCount = Math.max(
    Math.ceil(activityTotalCount / TABLE_PAGE_SIZE),
    isRewardHistoryLoading ? activityPage : 0,
    1
  );
  const effectiveActivityPage = Math.min(
    activityPage,
    Math.max(activityPageCount, 1)
  );
  const handleActivityPageChange = (page: number) => {
    setActivityPage(
      Math.min(Math.max(page, 1), Math.max(activityPageCount, 1))
    );
  };

  useEffect(() => {
    setActivityPage(1);
  }, [activityWindow, userKey]);

  useEffect(() => {
    setActivityPage((currentPage) =>
      Math.min(currentPage, Math.max(activityPageCount, 1))
    );
  }, [activityPageCount]);

  let activityEmptyMessage = t`No activity in the last 7 days.`;
  if (activityWindow === 30) {
    activityEmptyMessage = t`No activity in the last 30 days.`;
  } else if (activityWindow === 90) {
    activityEmptyMessage = t`No activity in the last 90 days.`;
  }

  const earningsByReferee = useMemo(() => {
    const map = new Map<
      string,
      {
        totalEarnedBN: BN;
        latestEarningTs: number;
      }
    >();

    (userKey ? rewardHistory : []).forEach((item) => {
      if (item.kind !== 'Reward') return;

      const source = String(item.source ?? '').toLowerCase();
      if (!source) return;

      const amountBN = item.amountBN ?? ZERO_BN;
      const timestampMs = normalizeTimestampToMs(item.timestamp);
      if (!isWithinRefereeWindow(timestampMs, refereeWindow)) return;

      let earnings = map.get(source);
      if (!earnings) {
        earnings = {
          totalEarnedBN: ZERO_BN,
          latestEarningTs: 0,
        };
        map.set(source, earnings);
      }

      earnings.totalEarnedBN = earnings.totalEarnedBN.add(amountBN);

      if (timestampMs > earnings.latestEarningTs) {
        earnings.latestEarningTs = timestampMs;
      }
    });

    return map;
  }, [refereeWindow, rewardHistory, userKey]);

  const refereeRows = useMemo<RefereeRow[]>(() => {
    return (referrals ?? []).map((item) => {
      const address = item.address ?? '';
      const key = address.toLowerCase();
      const timestampMs = normalizeTimestampToMs(item.joinTime);
      const earnings = earningsByReferee.get(key);
      const rowEarnings = earnings ?? {
        totalEarnedBN: ZERO_BN,
        latestEarningTs: 0,
      };

      return {
        address,
        joined: formatTimestampNow(timestampMs) || '-',
        joinedTs: timestampMs,
        hasEarnings: Boolean(earnings),
        totalEarnedBN: rowEarnings.totalEarnedBN,
        latestEarningTs: rowEarnings.latestEarningTs,
        lastReward: rowEarnings.latestEarningTs
          ? formatTimestampNow(rowEarnings.latestEarningTs)
          : t`None`,
      };
    });
  }, [earningsByReferee, referrals]);

  const effectiveRefereeSortKey =
    refereeSort?.key ?? DEFAULT_REFEREE_SORT_KEY;
  const effectiveRefereeSortDirection =
    refereeSort?.direction ?? DEFAULT_REFEREE_SORT_DIRECTION;

  const sortedRefereeRows = useMemo(() => {
    return [...refereeRows].sort((a, b) => {
      let comparison = 0;

      if (effectiveRefereeSortKey === 'joined') {
        comparison = a.joinedTs - b.joinedTs;
      } else if (effectiveRefereeSortKey === 'gtReward') {
        comparison = a.totalEarnedBN.cmp(b.totalEarnedBN);
      } else {
        comparison = a.latestEarningTs - b.latestEarningTs;
      }

      if (comparison === 0) {
        comparison = a.address.localeCompare(b.address);
      }

      return effectiveRefereeSortDirection === 'asc' ? comparison : -comparison;
    });
  }, [effectiveRefereeSortDirection, effectiveRefereeSortKey, refereeRows]);

  const refereePageCount = Math.ceil(sortedRefereeRows.length / TABLE_PAGE_SIZE);
  const effectiveRefereePage = Math.min(
    refereePage,
    Math.max(refereePageCount, 1)
  );
  const visibleRefereeRows = useMemo(() => {
    const start = (effectiveRefereePage - 1) * TABLE_PAGE_SIZE;
    return sortedRefereeRows.slice(start, start + TABLE_PAGE_SIZE);
  }, [effectiveRefereePage, sortedRefereeRows]);
  const isRefereeLoading =
    Boolean(userKey) && (isReferralsLoading || isRewardHistoryLoading);

  useEffect(() => {
    setRefereePage(1);
  }, [refereeWindow, userKey]);

  useEffect(() => {
    setRefereePage((currentPage) =>
      Math.min(currentPage, Math.max(refereePageCount, 1))
    );
  }, [refereePageCount]);

  const handleRefereeSort = (key: RefereeSortKey) => {
    if (!refereeSort) {
      setRefereeSort(
        key === DEFAULT_REFEREE_SORT_KEY
          ? { key, direction: 'asc' }
          : { key, direction: 'desc' }
      );
      return;
    }

    if (refereeSort.key !== key) {
      setRefereeSort({ key, direction: 'desc' });
      return;
    }

    if (refereeSort.direction === 'desc') {
      setRefereeSort({ key, direction: 'asc' });
      return;
    }

    setRefereeSort(null);
  };

  const openMobileRefereeSortSheet = () => {
    setMobileRefereeSortDraft(refereeSort);
    setShowMobileRefereeSortSheet(true);
  };

  const handleMobileRefereeSortSelect = (key: RefereeSortKey) => {
    setMobileRefereeSortDraft((currentSort) => {
      if (!currentSort) {
        return key === DEFAULT_REFEREE_SORT_KEY
          ? { key, direction: 'asc' }
          : { key, direction: 'desc' };
      }

      if (currentSort.key !== key) {
        return { key, direction: 'desc' };
      }

      if (currentSort.direction === 'desc') {
        return { key, direction: 'asc' };
      }

      return null;
    });
  };

  const resetMobileRefereeSort = () => {
    setRefereeSort(null);
    setMobileRefereeSortDraft(null);
    setShowMobileRefereeSortSheet(false);
  };

  const applyMobileRefereeSort = () => {
    setRefereeSort(mobileRefereeSortDraft);
    setShowMobileRefereeSortSheet(false);
  };

  const renderRefereeSortHeader = (
    label: string,
    key: RefereeSortKey
  ) => {
    const isActive = effectiveRefereeSortKey === key;
    const sortIcon =
      isActive && effectiveRefereeSortDirection === 'asc'
        ? IconSortUp
        : isActive && effectiveRefereeSortDirection === 'desc'
          ? IconSortDown
          : IconSort;

    return (
      <button
        type="button"
        className="inline-flex h-[1.6rem] cursor-pointer items-center gap-[0.2rem] border-0 bg-transparent p-0 font-[inherit] tracking-[inherit] text-[inherit] [text-transform:inherit]"
        onClick={() => handleRefereeSort(key)}
        aria-sort={
          isActive
            ? effectiveRefereeSortDirection === 'asc'
              ? 'ascending'
              : 'descending'
            : 'none'
        }
      >
        {label}
        <img
          className="block h-[1.6rem] w-[1.2rem] flex-[0_0_1.2rem]"
          src={sortIcon}
          alt=""
          aria-hidden="true"
        />
      </button>
    );
  };

  const renderActivityPagination = () => {
    if (activityPageCount <= 1) return null;

    return (
      <div className="box-border border-t border-[#323232]">
        <BottomTablePagination
          page={effectiveActivityPage}
          pageCount={activityPageCount}
          onPageChange={handleActivityPageChange}
          showBoundaryButtons={false}
        />
      </div>
    );
  };

  const renderRefereePagination = () => {
    if (refereePageCount <= 1) return null;

    return (
      <div className="box-border border-t border-[#323232]">
        <BottomTablePagination
          page={effectiveRefereePage}
          pageCount={refereePageCount}
          onPageChange={setRefereePage}
        />
      </div>
    );
  };

  const handleCopyReferralLink = () => {
    if (!decodedReferralCode) {
      setShowCodeModal(true);
      return;
    }

    copyToClipboard(referralLink);
    helperNotice.success(t`Referral link copied to clipboard.`);
  };

  const renderPrimaryTabs = () => (
    <div ref={primaryTabsRef} className="referral-new-tabs">
      <span
        className="referral-new-tab-indicator"
        aria-hidden="true"
        style={{
          width: `${activeTab === 'referees'
            ? tabIndicator.refereesWidth
            : tabIndicator.activityWidth
            }px`,
          transform: `translateX(${activeTab === 'referees' ? tabIndicator.offset : 0}px)`,
        }}
      />
      <button
        className={activeTab === 'activity' ? 'active' : ''}
        style={{ padding: `${isMobile ? '0 2.6rem' : '0 3rem'}` }}
        type="button"
        onClick={() => setActiveTab('activity')}
      >
        {t`Recent Activity`}
      </button>
      <button
        className={activeTab === 'referees' ? 'active' : ''}
        type="button"
        onClick={() => setActiveTab('referees')}
      >
        {t`Referees`}
      </button>
    </div>
  );

  const renderWindowTabs = () =>
    activeTab === 'activity' ? (
      <div className={isMobile ? "referral-new-window-tabs !mx-[0.8rem]" : "referral-new-window-tabs"}>
        {[7, 30, 90].map((days) => (
          <button
            key={days}
            className={activityWindow === days ? 'active' : ''}
            type="button"
            onClick={() => setActivityWindow(days as 7 | 30 | 90)}
          >
            {days}d
          </button>
        ))}
      </div>
    ) : (
      <div className="referral-new-window-tabs">
        {[
          { label: '30d', value: 30 },
          { label: '90d', value: 90 },
          { label: t`Total`, value: 'total' },
        ].map((item) => (
          <button
            key={item.value}
            className={refereeWindow === item.value ? 'active' : ''}
            type="button"
            onClick={() => setRefereeWindow(item.value as RefereeWindow)}
          >
            {item.label}
          </button>
        ))}
      </div>
    );

  if (legacyReferralCode && getGmw35Enabled()) {
    return (
      <Navigate to="/trade" replace state={{ code: legacyReferralCode }} />
    );
  }

  return (
    <div
      className={`referral-new${getGmw426Enabled() ? ' gmw-426-enabled' : ''}${getGmw446Enabled() ? ' gmw-446-enabled' : ''
        }`}
      key={`${i18n.locale}-${userKey}`}
    >
      <Header isReferral={true} />
      <BlockUsIpModal />

      <main className={`referral-new-page ${isMobile ? '!pb-0 !px-0' : ''}`}>
        <section className={isMobile ? "referral-new-title !mx-[0.8rem]" : "referral-new-title"}>
          <h1>{t`Referrals`}</h1>
          {isMobile && (
            <button
              type="button"
              className="referral-new-title-help"
              onClick={() => setShowRewardsHelpModal(true)}
              aria-label={t`How Referral Rewards Work`}
            >
              <img src={IconHelp} alt="" aria-hidden="true" />
            </button>
          )}
        </section>

        <section className="referral-new-layout">
          <div className="flex min-w-0 flex-col gap-[0.8rem]">
            <section className={isMobile ? "referral-new-panel referral-new-invite-panel mx-[0.8rem]" : "referral-new-panel referral-new-invite-panel"}>
              <div className="flex min-w-0 flex-[1_0_0] flex-col items-start gap-[0.8rem]">
                <div className="referral-new-panel-title">
                  <span className="referral-new-title-icon referral-new-title-icon-link">
                    <img src={IconLink} alt="" aria-hidden="true" />
                  </span>
                  <span>{t`Invite and Earn Rewards`}</span>
                </div>
                <p className="referral-new-muted">
                  {getGmw446Enabled()
                    ? t`Earn GT rewards as your referrals trade.`
                    : t`Earn GT rewards and increase sellable GT quota as your referrals trade.`}
                </p>
              </div>

              {decodedReferralCode ? (
                <button
                  className="referral-new-link-field"
                  type="button"
                  onClick={handleCopyReferralLink}
                >
                  <span>{referralLink}</span>
                  <span className="referral-new-copy-icon" />
                </button>
              ) : (
                <ReferralCreateCodeInput
                  onClick={() => setShowCodeModal(true)}
                />
              )}
            </section>

            <section className="referral-new-stats">
              {isMobile ? (
                <>
                  <div className="referral-new-panel referral-new-stat-card referral-new-stat-card-rate mx-[0.8rem]">
                    <div className="referral-new-stat-rate">
                      <span>{t`Referral Reward Rate`}</span>
                      <strong>{displayReferralRewardRate}%</strong>
                    </div>
                  </div>

                  <div className="referral-new-panel referral-new-stat-card mx-[0.8rem]">
                    <div className="referral-new-stat-head">
                      <div className="referral-new-panel-title">
                        <span className="referral-new-title-icon referral-new-title-icon-users">
                          <img src={IconUsers} alt="" aria-hidden="true" />
                        </span>
                        <span>{t`Total Referrals`}</span>
                      </div>
                      <strong>{refereeCount}</strong>
                    </div>
                    <div className="referral-new-status-row">
                      <span className="referral-new-status referral-new-status-active">
                        <i />
                        {displayActiveRefereeCount} <Trans>Active User</Trans>
                      </span>
                      <span className="referral-new-status">
                        <i />
                        {displayInactiveRefereeCount} <Trans>Inactive User</Trans>
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="referral-new-panel referral-new-stat-card">
                    <div className="referral-new-stat-head">
                      <div className="referral-new-panel-title">
                        <span className="referral-new-title-icon referral-new-title-icon-users">
                          <img src={IconUsers} alt="" aria-hidden="true" />
                        </span>
                        <span>{t`Total Referrals`}</span>
                      </div>
                      <strong>{refereeCount}</strong>
                    </div>
                    <div className="referral-new-status-row">
                      <span className="referral-new-status referral-new-status-active">
                        <i />
                        {displayActiveRefereeCount} <Trans>Active User</Trans>
                      </span>
                      <span className="referral-new-status">
                        <i />
                        {displayInactiveRefereeCount} <Trans>Inactive User</Trans>
                      </span>
                    </div>
                  </div>

                  <div className="referral-new-panel referral-new-stat-card referral-new-stat-card-rate">
                    <div className="referral-new-stat-rate">
                      <span>{t`Referral Reward Rate`}</span>
                      <strong>{displayReferralRewardRate}%</strong>
                    </div>
                  </div>
                </>
              )}
            </section>

            <section className="referral-new-panel referral-new-table-panel">
              {isMobile ? (
                <>
                  <div className={isMobile ? "referral-new-mobile-tab-head !mx-[0.8rem]" : "referral-new-mobile-tab-head"}>
                    {renderPrimaryTabs()}
                  </div>
                  {activeTab === 'referees' ? (
                    <div className="referral-new-mobile-window-head referral-new-mobile-window-head-sort">
                      {renderWindowTabs()}
                      <button
                        type="button"
                        className="referral-new-mobile-window-sort-button"
                        onClick={openMobileRefereeSortSheet}
                        aria-label={t`Sort`}
                      >
                        <img src={IconSwapMobile} alt="" aria-hidden="true" />
                        <span>{t`Sort`}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="referral-new-mobile-window-head">
                      {renderWindowTabs()}
                    </div>
                  )}
                </>
              ) : (
                <div className="referral-new-table-head">
                  {renderPrimaryTabs()}
                  {renderWindowTabs()}
                </div>
              )}

              {activeTab === 'activity' ? (
                isMobile ? (
                  <div className="referral-new-mobile-activity-list">
                    {isRewardHistoryLoading ? (
                      <div className="referral-new-empty"><LoadingComponent /></div>
                    ) : activityRows.length ? (
                      <>
                        <div className={isMobile ? "referral-new-mobile-activity-page !px-[0.8rem]" : "referral-new-mobile-activity-page"}>
                          {activityRows.map((row) => {
                            const rewardText = `+${formatAmount(
                              row.rewardBN,
                              gtDecimals ?? 7,
                              4,
                              true,
                              true
                            )} GT`;

                            return (
                              <div className="referral-new-mobile-activity-card" key={row.id}>
                                <div className="referral-new-mobile-activity-card-head">
                                  <span>{row.time}</span>
                                  <span>{shortenAddressOrEns(row.referee, 15, 0) || '-'}</span>
                                </div>
                                <div className="referral-new-mobile-activity-card-body">
                                  <div className="referral-new-mobile-activity-card-item">
                                    <span>{t`GT Reward`}</span>
                                    <strong>{rewardText}</strong>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {renderActivityPagination()}
                      </>
                    ) : (
                      <div className="referral-new-empty">
                        {isRewardHistoryLoading
                          ? t`Loading...`
                          : activityEmptyMessage}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="referral-new-table referral-new-activity-table">
                    {isRewardHistoryLoading ? (
                      <div className="referral-new-empty"><LoadingComponent /></div>
                    ) : activityRows.length ? (
                      <>
                        <Table className="referral-new-common-table">
                          <thead>
                            <TableTheadTr className="referral-new-table-labels">
                              <TableTh className="pt-[1.2rem] pb-[0.8rem] !pl-[2rem] text-[1.1rem] font-medium">{t`TIME`}</TableTh>
                              <TableTh className="pt-[1.2rem] pb-[0.8rem] text-[1.1rem] !pl-0">{t`REFEREE`}</TableTh>
                              <TableTh className="pt-[1.2rem] pb-[0.8rem] !pr-[2rem]  text-[1.1rem]">{t`GT REWARD`}</TableTh>
                            </TableTheadTr>
                          </thead>
                          <tbody>
                            {activityRows.map((row) => (
                              <TableTr
                                hoverable={false}
                                key={row.id}
                                className="referral-new-common-table-row h-60 !border-none"
                              >
                                <TableTd className="!pl-[2rem]">{row.time}</TableTd>
                                <TableTd padding="none">{shortenAddressOrEns(row.referee, 15, 0) || '-'}</TableTd>
                                <TableTd padding="none" className="pr-[2rem] text-white">
                                  +{formatAmount(row.rewardBN, gtDecimals ?? 7, 4, true, true)} GT
                                </TableTd>
                              </TableTr>
                            ))}
                          </tbody>
                        </Table>
                        {renderActivityPagination()}
                      </>
                    ) : (
                      <div className="referral-new-empty">
                        {isRewardHistoryLoading
                          ? t`Loading...`
                          : activityEmptyMessage}
                      </div>
                    )}
                  </div>
                )
              ) : isMobile ? (
                <div className="referral-new-mobile-referee-list">
                  {isRefereeLoading ? (
                    <div className="referral-new-empty"><LoadingComponent /></div>
                  ) : sortedRefereeRows.length ? (
                    <>
                      {visibleRefereeRows.map((row) => {
                        const rewardText =
                          row.hasEarnings && !row.totalEarnedBN.isZero()
                            ? `+${formatAmount(
                              row.totalEarnedBN,
                              gtDecimals ?? 7,
                              4,
                              true,
                              true
                            )} GT`
                            : t`None`;
                        return (
                          <div
                            className="referral-new-mobile-referee-card"
                            key={row.address}
                          >
                            <div className="referral-new-mobile-referee-card-head">
                              <span>
                                {shortenAddressOrEns(row.address, 15, 0) || '-'}
                              </span>
                              <span>
                                <Trans>
                                  Joined:{' '}
                                  {row.joinedTs
                                    ? formatTVDate(new Date(row.joinedTs))
                                    : '-'}
                                </Trans>
                              </span>
                            </div>
                            <div className="referral-new-mobile-referee-card-body">
                              <div className="referral-new-mobile-referee-card-item">
                                <span>{t`GT Reward`}</span>
                                <strong>{rewardText}</strong>
                              </div>
                              <div className="referral-new-mobile-referee-card-item">
                                <span>{t`Last Reward`}</span>
                                <strong>{row.lastReward}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {renderRefereePagination()}
                    </>
                  ) : (
                    <div className="referral-new-empty">
                      {t`No referees yet. Share your referral link to invite friends.`}
                    </div>
                  )}
                </div>
              ) : (
                <div className="referral-new-table referral-new-referee-table">
                  {isRefereeLoading ? (
                    <div className="referral-new-empty"><LoadingComponent /></div>
                  ) : sortedRefereeRows.length ? (
                    <>
                      <Table className="referral-new-common-table">
                        <thead>
                          <TableTheadTr className="referral-new-common-table-head">
                            <TableTh className='!pl-[2rem] pt-[1.2rem] pb-[0.8rem] text-[1.1rem]'>{t`REFEREE`}</TableTh>
                            <TableTh className='pt-[1.2rem] pb-[0.8rem] pl-[0.5rem] !text-left text-[1.1rem]'>
                              {renderRefereeSortHeader(t`JOINED`, 'joined')}
                            </TableTh>
                            <TableTh className='pt-[1.2rem] pb-[0.8rem] pl-[0.5rem] !text-left text-[1.1rem]'>
                              {renderRefereeSortHeader(t`GT REWARD`, 'gtReward')}
                            </TableTh>
                            <TableTh className='!pr-[2rem] pt-[1.2rem] pb-[0.8rem] text-[1.1rem]'>
                              {renderRefereeSortHeader(t`LAST REWARD`, 'lastReward')}
                            </TableTh>
                          </TableTheadTr>
                        </thead>
                        <tbody>
                          {visibleRefereeRows.map((row) => (
                            <TableTr
                              hoverable={false}
                              className="referral-new-common-table-row !border-none"
                              key={row.address}
                            >
                              <TableTd padding="none">
                                {shortenAddressOrEns(row.address, 15, 0) || '-'}
                              </TableTd>
                              <TableTd className='!pl-[0.5rem] !text-left'>{row.joined}</TableTd>
                              <TableTd className="!pl-[0.5rem] !text-left text-white">
                                {row.hasEarnings && !row.totalEarnedBN.isZero()
                                  ? `+${formatAmount(
                                    row.totalEarnedBN,
                                    gtDecimals ?? 7,
                                    4,
                                    true,
                                    true
                                  )} GT`
                                  : t`None`}
                              </TableTd>
                              <TableTd padding="none">{row.lastReward}</TableTd>
                            </TableTr>
                          ))}
                        </tbody>
                      </Table>
                      {renderRefereePagination()}
                    </>
                  ) : (
                    <div className="referral-new-empty">
                      {t`No referees yet. Share your referral link to invite friends.`}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          {!isMobile && (
            <aside className="referral-new-panel referral-new-directions">
              <h2>{t`How Referral Rewards Work`}</h2>
              <div className="referral-new-directions-list">
                <div className="referral-new-directions-item">
                  <span className="referral-new-directions-info" />
                  <p>{t`Your referees receive a permanent 10% trading fee discount.`}</p>
                </div>
                <div className="referral-new-directions-line" />
                <div className="referral-new-directions-item">
                  <span className="referral-new-directions-info" />
                  <p>
                    {getGmw446Enabled()
                      ? t`You earn GT rewards when your referees generate GT from trading.`
                      : t`You earn GT rewards and increase your sellable GT quota when your referees generate GT from trading.`}
                  </p>
                </div>
                <div className="referral-new-directions-line" />
                <div className="referral-new-directions-item referral-new-directions-item-rate">
                  <span className="referral-new-directions-info" />
                  <p>
                    <ReferralRewardRateDescription
                      rewardRate={displayReferralRewardRate}
                      referralRewardExample={displayReferralRewardExample}
                      hasRewardRate={hasReferralRewardRate}
                    />
                  </p>
                </div>
                <div className="referral-new-directions-line" />
                <div className="referral-new-directions-item">
                  <span className="referral-new-directions-info" />
                  <p>{t`Your referral reward rate is based on your GT VIP level. Higher VIP levels receive higher referral rewards.`}</p>
                </div>
              </div>
            </aside>
          )}
        </section>
      </main>

      <ReferralMobileSortSheet
        isVisible={showMobileRefereeSortSheet && isMobile}
        selectedSort={mobileRefereeSortDraft}
        onSelect={handleMobileRefereeSortSelect}
        onReset={resetMobileRefereeSort}
        onApply={applyMobileRefereeSort}
        onClose={() => setShowMobileRefereeSortSheet(false)}
      />

      <Modal
        isVisible={showRewardsHelpModal && isMobile}
        setIsVisible={setShowRewardsHelpModal}
        className="referral-rewards-modal"
        qa="referral-rewards-modal"
        label={t`How Referral Rewards Work`}
        noDivider
        contentPadding={false}
      >
        <ReferralRewardsHelpContent
          rewardRate={displayReferralRewardRate}
          referralRewardExample={displayReferralRewardExample}
          hasRewardRate={hasReferralRewardRate}
        />
      </Modal>

      <ReferralsCodeModal
        showModal={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        onCreated={(code) => setDecodedReferralCode(code)}
      />

      {getGmw404Enabled() && <ReferralSetCard />}
    </div>
  );
}
