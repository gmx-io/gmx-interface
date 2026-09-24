/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { getGmw330Enabled, getGmw113Enabled, getPoolNewEnabled, getGmw331Enabled, getGmw291Enabled } from '@/config/featureFlagEnable';
import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { Trans, t } from '@lingui/macro';
import PopupMenu from '@/components/Pools/components/PopupMenu';
import LineChartComponent from '@/components/Pools/components/LineChartComponent';
import BuySvg from '@/img/pools/Buy.svg';
import SellSvg from '@/img/pools/Sell.svg';
import RightSvg from '@/img/pools/Right.svg';
import TokenSvgOld from '@/img/pools/Token.svg';
import TokenSvg from '@/img/pools/Token-new.svg';
import InfoSvg from '@/img/pools/Info.svg';
import MoreSvg from '@/img/pools/More.svg';
import IconStar from '@/img/header/star.svg?react';
import { getIconUrlPath } from '@/utils/lib/icon';
import SearchIconComponent from '@/img/search.svg?react';
import closeIcons from '@/img/header/close.svg';
import { useNavigate } from 'react-router-dom';
import { getAnnData } from '../utils/getAnnData';
import { getApyData } from '../utils/getApyData';
import { useFeeAprData } from '../Hooks/useFeeAprData';
import {
  GMX_SOLANA_GLV_TOKENS,
  GMX_SOLANA_TOKENS_RAW,
} from '@/config/program';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import { useAppStore } from '@/zustand/useAppStore';
import { useGlvMarkets } from '../Hooks/useGlvMarkets';
import { useTokenPriceMap } from '../Hooks/useTokenPriceMap';
import { useMarkets } from '../Hooks/useMarkets';
import './index.scss';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import { BN_ZERO } from '@solana/spl-governance';
import { useUserEarnings } from '../Hooks/useUserEarnings';
import { useMarketDailyStats } from '../Hooks/useAccruedData';
import { BN } from '@coral-xyz/anchor';
import IconSort from '@/img/header/sort.svg?react';
import IconSortDown from '@/img/header/sort-down.svg?react';
import IconSortUp from '@/img/header/sort-up.svg?react';
import { useGmMarketsApyAndAnnBy180 } from '@/components/Pools/Hooks/useGmMarketsApyAndAnnBy180';
import { BottomTablePagination } from '@/components/Common/Pagination/BottomTablePagination';
import { LEADERBOARD_LIST_PER_PAGE } from '@/config/ui';
import { getBalanceMap } from '@/components/Pools/utils/getBalanceMap';
import { useStoreTokensValueForStats } from '@/components/Stats/Hooks/useStoreTokensValueForStats';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import useSocketStore from '@/zustand/socketStore';
import {
  formatPercentageReg,
  formatToKMBWithoutUsd,
  formatUsd,
} from '@/utils/legacy/format';
import { TableScrollFadeContainer } from '@/components/Common/Table/TableScrollFade/TableScrollFade';
import { useMedia } from 'react-use';
import CurrentPageItemsFixedList from '@/components/CurrentPageItemsFixedList';
import { wgmxTogmx } from '@/components/Pools/utils/wgmxTogmx';
import { SortField, SortOrder, TabType } from '@/components/Pools/utils/type';
import { FAVORITES_KEY } from '@/components/Pools/utils/dic';

import { getGlvDisplayNameByTokenAddress } from '@/utils/glv/getGlvDisplayName';
import { getPoolDetailPath, PoolDetailRoutePoolType } from '@/components/Pools/utils/poolDetailRoute';
import { POOLS_GLV_SQUID_ADDRESSES } from '@/components/Pools/utils/poolsSquidAddresses';
import { getTimes } from '@/components/Pools/utils/getTimes';
import { buildGmListData } from '@/components/Pools/utils/buildGmListData';
import CellSkeleton from '@/components/Common/Skeleton/CellSkeleton';

const toSafeBn = (value: unknown) => {
  if (value instanceof BN) {
    return value;
  }

  if (value === null || value === undefined || value === '') {
    return BN_ZERO;
  }

  const raw =
    typeof value === 'number'
      ? Number.isFinite(value)
        ? Math.trunc(value).toString()
        : ''
      : typeof value === 'string'
        ? value
        : typeof (value as { toString?: () => string }).toString === 'function'
          ? (value as { toString: () => string }).toString()
          : '';
  const normalized = raw.trim();

  return /^-?\d+$/.test(normalized) ? new BN(normalized) : BN_ZERO;
};

const toSafeDecimals = (value: unknown) => {
  const decimals = Number(value ?? 0);

  return Number.isFinite(decimals) && decimals > 0 ? Math.trunc(decimals) : 0;
};

const toGmw330Bn = (value: unknown, fallback = 0) =>
  getGmw330Enabled() ? toSafeBn(value) : new BN((value as any) || fallback);

const toGmw330Decimals = (value: unknown) =>
  getGmw330Enabled() ? toSafeDecimals(value) : (value as number);

const PoolsOverview: React.FC = () => {
  const isPoolNewEnabled = getPoolNewEnabled();
  const isGmw331Enabled = getGmw331Enabled();
  const isGmw291Enabled = getGmw291Enabled();
  const isGmw330Enabled = getGmw330Enabled();
  const statsData = {
    periods: [
      {
        key: '30d',
        period: <Trans> Last 30d </Trans>,
      },
      {
        key: '90d',
        period: <Trans> Last 90d </Trans>,
      },
      {
        key: '180d',
        period: <Trans> Last 180d </Trans>,
      },
      {
        key: 'Total',
        period: <Trans> Total </Trans>,
      },
    ],
  };
  const isMobile = useMedia('(max-width: 768px)');
  const isScreen1024 = useMedia('(max-width: 1024px)');
  const { glvs } = useGlvMarkets(GMX_SOLANA_GLV_TOKENS);
  const navigate = useNavigate();
  const { setGmListData, setLinkInfo, glvListData: glvList } = useAppStore((state) => state.pools);
  const { balanceMap, connected } = getBalanceMap();
  const [isWalletStatusSettling, setIsWalletStatusSettling] = useState(isGmw291Enabled);
  const { marketInfosMap, allMarketInfos, isLoading: isMarketsLoading } = useMarkets();
  const socketIndexTokensReady = useSocketStore((s) => s.socketIndexTokensReady);
  const marketAddresses = useMemo(
    () => Array.from(marketInfosMap?.keys() || []),
    [marketInfosMap]
  );
  const legacyGlvAddresses = useMemo(
    () => GMX_SOLANA_GLV_TOKENS.map((item) => item.toString()),
    []
  );
  const times = useMemo(() => getTimes(), []);
  const glvAddresses = isGmw331Enabled
    ? POOLS_GLV_SQUID_ADDRESSES
    : legacyGlvAddresses;

  /**
   * 
   * 2026-7-2:
   * For the first 500ms after the page loads, the wallet status remains unstable, 
   * so the UI displays a loading state by default. The connected status will then 
   * be checked one second later for subsequent logic judgments.
   * 
   */
  useEffect(() => {
    if (!isGmw291Enabled) return;

    setIsWalletStatusSettling(true);
    const timer = window.setTimeout(() => {
      setIsWalletStatusSettling(false);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [isGmw291Enabled]);

  const getStartTimestampByTab = useCallback((tab: string) => {
    const now = new Date();
    let dateToSet: Date | null = null;

    switch (tab) {
      case '30d':
        dateToSet = new Date(now.setDate(now.getDate() - 30));
        break;
      case '90d':
        dateToSet = new Date(now.setDate(now.getDate() - 90));
        break;
      case '180d':
        dateToSet = new Date(now.setDate(now.getDate() - 180));
        break;
      case 'Total':
      default:
        return 'total';
    }

    return dateToSet.toISOString().replace(/(\.\d{3})Z$/, '$1000Z');
  }, []);
  const [startTimestamp, setStartTimestamp] = useState<string>(() =>
    getStartTimestampByTab(isPoolNewEnabled ? '90d' : '180d')
  );
  const isOverviewSquidReady =
    isGmw331Enabled &&
    !isMarketsLoading &&
    socketIndexTokensReady &&
    marketAddresses.length > 0;
  const overviewSquidOptions = useMemo(
    () => ({
      squidSource: 'overview' as const,
      marketAddresses,
      glvAddresses: POOLS_GLV_SQUID_ADDRESSES,
      enabled: isOverviewSquidReady,
    }),
    [isOverviewSquidReady, marketAddresses]
  );
  const userEarnings = useUserEarnings(
    marketAddresses,
    glvAddresses,
    isGmw331Enabled ? overviewSquidOptions : undefined
  );
  const {
    marketChartDataMap: marketDailyStats,
    glvDailyFeesMap,
    isAccruedLoading,
  } =
    useMarketDailyStats(
      startTimestamp,
      isGmw331Enabled ? overviewSquidOptions : undefined
    );
  const { aprMap: feeAprMapNew, aprLastMap, isLoading: isFeeAprLoading } =
    useFeeAprData(isGmw331Enabled ? overviewSquidOptions : undefined);
  const { gmMarketsApyAndAnnBy180 } = useGmMarketsApyAndAnnBy180(
    isGmw331Enabled
      ? overviewSquidOptions
      : {
        legacyLimitSize: allMarketInfos?.length || 0,
        legacyMarketTokens:
          allMarketInfos?.map((item) => item?.marketToken) ?? [],
        legacyTimes: times,
        legacyGlvTokens: legacyGlvAddresses,
      }
  );
  const { storeTokensValue, isStoreLoading } = useStoreTokensValueForStats();
  const { tokenPriceMap } = useTokenPriceMap();
  const [gmList, setGmList] = useState(() => {
    try {
      const cached = localStorage.getItem('gmListData');
      if (cached) {
        const parsedData = JSON.parse(cached);
        const isSorted = parsedData.every((item: any, idx: number, arr: any[]) => {
          if (idx === 0) return true;
          const current = toGmw330Bn(item?.tvlUsdBn);
          const prev = toGmw330Bn(arr[idx - 1]?.tvlUsdBn);
          return prev.gte(current);
        });
        return parsedData;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [seletedTab, setSeletedTab] = useState(isPoolNewEnabled ? '90d' : '180d');
  const [page, setPage] = useState(1);
  const [activeVaultId, setActiveVaultId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [gmSortField, setGmSortField] = useState<SortField>('tvl');
  const [gmSortFieldList, setGmSortFieldList] = useState<
    Record<SortField, SortOrder>
  >({
    tvl: 'default',
    wallet: 'default',
    feeApr24h: 'default',
    feeApy: 'default',
    annPerformance: 'default',
  });
  const [annMap, setAnnMap] = useState<Map<string, any>>(new Map());
  const [apyMap, setApyMap] = useState<Map<string, any>>(new Map());
  const feeAprMap = isPoolNewEnabled ? feeAprMapNew : apyMap;

  const hasFeeAprData = feeAprMap.size > 0 || aprLastMap.size > 0;

  const isFeeAprDataPending = isGmw331Enabled
    ? !isOverviewSquidReady || isFeeAprLoading
    : isFeeAprLoading;

  const isFeeAprColLoading =
    isGmw291Enabled &&
    (isPoolNewEnabled
      ? !hasFeeAprData && isFeeAprDataPending
      : apyMap.size === 0);
  // const isFeeAprColLoading = isGmw291Enabled && (isPoolNewEnabled ? (isFeeAprLoading || isMarketsLoading) : apyMap.size === 0);
  /** GraphQL / fee APR: decimal value like "0.08" means 8%; pass value * 10000 to formatPercentageReg per existing convention. */
  const formatNewAprValue = (value?: number | null) => {
    if (value === null || value === undefined) return '-';
    if (value === 0) return '0.00%';
    return formatPercentageReg(value * 10000);
  };

  const [walletTotalUsd, setWalletTotalUsd] = useState<BN>(BN_ZERO);
  const [walletTotalAmount, setWalletTotalAmount] = useState<BN>(BN_ZERO);
  const gmListVersionRef = useRef('');
  const walletTotalsVersionRef = useRef('');
  const [glvWalletTotalUsd, setGlvWalletTotalUsd] = useState<BN>(BN_ZERO);
  const [glvWalletTotalAmount, setGlvWalletTotalAmount] = useState<BN>(BN_ZERO);
  const isTvlLoading = isStoreLoading || storeTokensValue.isZero();
  const tvlValue = isTvlLoading ? '' : formatUsd(storeTokensValue);

  const [isGmListSorted, setIsGmListSorted] = useState(() => {
    try {
      const cached = localStorage.getItem('gmListData');
      if (cached) {
        const parsedData = JSON.parse(cached);
        if (parsedData.length === 0) return false;
        return parsedData.every((item: any, idx: number, arr: any[]) => {
          if (idx === 0) return true;
          const current = toGmw330Bn(item?.tvlUsdBn || item?.supply);
          const prev = toGmw330Bn(arr[idx - 1]?.tvlUsdBn || arr[idx - 1]?.supply);
          return prev.gte(current);
        });
      }
    } catch {
      // ignore
    }
    return false;
  });
  const nextOrder = (v: SortOrder): SortOrder =>
    v === 'default' ? 'desc' : v === 'desc' ? 'asc' : 'default';
  const handleGmSort = (field: SortField) => {
    setGmSortFieldList((prev) => {
      const nextValue = nextOrder(prev[field] ?? 'default');
      const reset: Record<SortField, SortOrder> = {
        tvl: 'default',
        wallet: 'default',
        feeApr24h: 'default',
        feeApy: 'default',
        annPerformance: 'default',
      };
      return { ...reset, [field]: nextValue };
    });
    setGmSortField(field);
  };
  const getSortIcon = (field: SortField) => {
    return gmSortFieldList[field] === 'asc' ? (
      <IconSortUp fill="#FA7B4E" className="icon-sort-up" />
    ) : gmSortFieldList[field] === 'desc' ? (
      <IconSortDown fill="#FA7B4E" className="icon-sort-down" />
    ) : (
      <IconSort fill="currentColor" className="icon-sort" />
    );
  };
  // get ann apy data
  useEffect(() => {
    let days = '180';
    if (seletedTab === '180d') {
      days = '180';
    } else if (seletedTab === '30d') {
      days = '30';
    } else if (seletedTab === '90d') {
      days = '90';
    } else {
      days = 'all';
    }
    void getAnnData(days).then((data) => {
      setAnnMap(new Map(data.map((item) => [item.tokenAddress, item])));
    });
    if (!isPoolNewEnabled) {
      void getApyData(days).then((data) => {
        setApyMap(new Map(data.map((item) => [item.tokenAddress, item])));
      });
    }
  }, [seletedTab, isPoolNewEnabled]);

  useEffect(() => {
    console.log('isFeeAprLoading:', isFeeAprLoading);
  }, [isFeeAprLoading])

  useEffect(() => {
    setStartTimestamp(getStartTimestampByTab(seletedTab));
  }, [seletedTab, getStartTimestampByTab]);
  useEffect(() => {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (saved) {
      try {
        setFavorites(new Set(JSON.parse(saved)));
      } catch {
        // ignore
      }
    }
  }, []);

  const saveFavorites = (next: Set<string>) => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(next)));
  };

  const toggleFavorite = (id: string) => {
    const next = new Set(favorites);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFavorites(next);
    saveFavorites(next);
  };

  const navigateToPoolDetail = useCallback(
    (
      poolType: PoolDetailRoutePoolType,
      pool: any,
      operationType: 'buy' | 'sell' = 'buy',
      seletedTab?: string
    ) => {
      const poolAddress = pool?.marketToken;

      if (!poolAddress) {
        return;
      }

      const poolInfo = {
        ...pool,
        operationType,
        ...(seletedTab ? { seletedTab } : {}),
      };
      const storagePoolInfo =
        poolType === 'GLV'
          ? {
            ...poolInfo,
            markets: poolInfo?.markets?.map((market: any) => ({
              ...market,
              tvlUsdBn: market?.tvlUsdBn?.toString(),
              capUsdBn: market?.capUsdBn?.toString(),
            })),
          }
          : poolInfo;
      const linkInfo = {
        poolType,
        poolAddress,
        poolInfo,
      };

      setLinkInfo(linkInfo);
      sessionStorage.setItem(
        'linkInfo',
        JSON.stringify({
          ...linkInfo,
          poolInfo: storagePoolInfo,
        })
      );
      navigate(getPoolDetailPath(poolType, poolAddress));
    },
    [navigate, setLinkInfo]
  );

  const navigateToGlvDetail = useCallback(
    (item: any) => {
      navigateToPoolDetail('GLV', item);
    },
    [navigateToPoolDetail]
  );

  const navigateToGmDetail = useCallback(
    (pool: any) => {
      navigateToPoolDetail('GM', pool);
    },
    [navigateToPoolDetail]
  );

  const getPoolsByCategory = useCallback(
    (list: any[], category: TabType): any[] => {
      switch (category) {
        case 'favorites':
          return list.filter((pool) => favorites.has(pool?.marketToken));
        case 'crypto':
          return list.filter((pool) => {
            const symbol = (pool?.poolName || '').toLowerCase();
            const layer1Tokens = [
              'eth',
              'btc',
              'sol',
              'xlm',
              'sui',
              'ada',
              'dot',
              'avax',
              'trx',
              'xrp',
              'ltc',
              'bnb',
              'ton',
              'bch',
              'atom',
              'near',
              'arb',
              'op',
              'matic',
              'imx',
              'strk',
              'doge',
              'shib',
              'pepe',
              'wif',
              'bome',
              'fartcoin',
              'mew',
              'pump',
              'bonk',
              'trump',
              'melania',
              'uni',
              'comp',
              'crv',
              'mkr',
              'snx',
              'ldo',
              'pendle',
              'jup',
              'aave',
              'wlfi',
              'gmx',
              'link',
              'aster',
              'ena',
              'hype',
              'xpl',
              'ape',
              'zec',
              'lit',
              'vvv',
              'xmr',
              'ondo',
              'tao',
              'wld'
            ];
            const layer2Tokens = ['arb', 'op', 'matic', 'imx', 'strk', 'near'];
            return (
              layer1Tokens.includes(symbol) || layer2Tokens.includes(symbol)
            );
          });
        case 'stock':
          return list.filter((pool) => {
            const symbol = (pool?.poolName || '').toLowerCase();
            return [
              'qqq',
              'msft',
              'googl',
              'tsla',
              'amzn',
              'aapl',
              'nvda',
              'spy',
              'meta',
              'mstr',
              'spcx',
            ].includes(symbol);
          });
        case 'commodity':
          return list.filter((pool) => {
            const symbol = (pool?.poolName || '').toLowerCase();
            return [
              'xag',
              'xau',
              'wti',
              'brent',
              'xcu',
              'xpt',
              'xpd'
            ].includes(symbol);
          });
        case 'forex':
          return list.filter((pool) => {
            const symbol = (pool?.poolName || '').toLowerCase();
            return [
              'eur',
              'gbp',
              'aud',
              'nzd',
              'usdjpy',
              'usdcad',
              'usdchf',
              'usdmxn',
            ].includes(symbol);
          });
        // case 'other':
        //   return list.filter((pool) => {
        //     const symbol = (pool?.poolName || '').toLowerCase();
        //     return ['ape', 'zec', 'tao', 'wld'].includes(symbol);
        //   });
        default:
          return list;
      }
    },
    [favorites]
  );

  const filteredGmList = useMemo(() => {
    const base = getPoolsByCategory(gmList, activeTab);
    const searched = !searchTerm
      ? base
      : base.filter((pool: any) => {
        const poolName = (pool?.poolName || '').toLowerCase();
        const longTokenSymbol = (
          GMX_SOLANA_TOKENS_RAW[pool?.longToken]?.symbol || ''
        ).toLowerCase();
        const shortTokenSymbol = (
          GMX_SOLANA_TOKENS_RAW[pool?.shortToken]?.symbol || ''
        ).toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        return (
          poolName.includes(searchLower) ||
          longTokenSymbol.includes(searchLower) ||
          shortTokenSymbol.includes(searchLower)
        );
      });

    const getFeeApy = (pool: any): number => {
      try {
        const annualized = feeAprMap?.get(pool?.marketToken)?.annualized;
        if (typeof annualized === 'number') {
          return annualized;
        }
        const num = parseFloat(String(annualized || '0'));
        return isNaN(num) ? 0 : num;
      } catch {
        return 0;
      }
    };
    const getFeeApr24h = (pool: any): number => {
      try {
        const annualized = aprLastMap?.get(pool?.marketToken)?.annualized;
        if (typeof annualized === 'number') {
          return annualized;
        }
        const num = parseFloat(String(annualized || '0'));
        return isNaN(num) ? 0 : num;
      } catch {
        return 0;
      }
    };

    const getAnnPerf = (pool: any): number => {
      try {
        const annualized = annMap?.get(pool?.marketToken)?.annualized;
        if (typeof annualized === 'number') {
          return annualized;
        }
        const num = parseFloat(String(annualized || '0'));
        return isNaN(num) ? 0 : num;
      } catch {
        return 0;
      }
    };

    const getWalletUsd = (pool: any): number => {
      try {
        const usdBn = convertTokenAmountToUsd(
          balanceMap?.get(pool?.marketToken) || BN_ZERO,
          toGmw330Decimals(pool?.decimals || 0),
          toGmw330Bn(pool?.marketPrice)
        );
        const num = parseFloat(usdBn?.toString?.() || '0');
        return isNaN(num) ? 0 : num;
      } catch {
        return 0;
      }
    };

    const sorted = [...searched].sort((a: any, b: any) => {
      if (gmSortFieldList[gmSortField] === 'default') {
        const aValue = parseFloat(a.tvlUsdBn.toString());
        const bValue = parseFloat(b.tvlUsdBn.toString());
        return bValue - aValue;
      }

      let aValue: number, bValue: number;

      switch (gmSortField) {
        case 'tvl':
          aValue = parseFloat(a.tvlUsdBn.toString());
          bValue = parseFloat(b.tvlUsdBn.toString());
          break;
        case 'wallet':
          aValue = getWalletUsd(a);
          bValue = getWalletUsd(b);
          break;
        case 'feeApr24h':
          aValue = getFeeApr24h(a);
          bValue = getFeeApr24h(b);
          break;
        case 'feeApy':
          aValue = getFeeApy(a);
          bValue = getFeeApy(b);
          break;
        case 'annPerformance':
          aValue = getAnnPerf(a);
          bValue = getAnnPerf(b);
          break;
        default:
          return 0;
      }

      return gmSortFieldList[gmSortField] === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    });

    return sorted;
  }, [
    gmList,
    activeTab,
    searchTerm,
    gmSortField,
    gmSortFieldList,
    seletedTab,
    // gmMarketsApyAnnMap,
    gmMarketsApyAndAnnBy180,
    favorites,
    balanceMap,
    getPoolsByCategory,
    aprLastMap,
    annMap,
    feeAprMap,
  ]);

  const gmPageSize = isMobile ? 5 : LEADERBOARD_LIST_PER_PAGE;

  const pageCount = Math.ceil(filteredGmList?.length / gmPageSize);
  const currentPageItems = useMemo(() => {
    const startIndex = (page - 1) * gmPageSize;
    const endIndex = startIndex + gmPageSize;
    return filteredGmList?.slice(startIndex, endIndex);
  }, [filteredGmList, page, gmPageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, activeTab]);

  const handleMoreClick = (e: React.MouseEvent, marketToken: string) => {
    e.stopPropagation();

    if (marketToken === activeVaultId) {
      setActiveVaultId(null);
      return;
    }

    setActiveVaultId(marketToken);
  };

  const closeMenu = () => {
    setActiveVaultId(null);
  };

  React.useEffect(() => {
    const handleClickOutside = () => {
      if (activeVaultId) {
        closeMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeVaultId]);

  const isDataReady = useMemo(() => {
    const gmReady = gmList && gmList.length > 0 && isGmListSorted;
    return gmReady;
  }, [gmList, isGmListSorted]);

  const [showSkeleton, setShowSkeleton] = useState(() => {
    const gmReady = gmList && gmList.length > 0 && isGmListSorted;
    return !gmReady;
  });

  const hasEverHadDataRef = useRef(gmList && gmList.length > 0 && isGmListSorted);

  useEffect(() => {
    if (isDataReady) {
      hasEverHadDataRef.current = true;
      setShowSkeleton(false);
    }
  }, [isDataReady]);

  useEffect(() => {
    if (hasEverHadDataRef.current) {
      if (showSkeleton) {
        setShowSkeleton(false);
      }
      return;
    }

    if (!isDataReady && !showSkeleton) {
      const timer = setTimeout(() => {
        if (!hasEverHadDataRef.current) {
          setShowSkeleton(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isDataReady, showSkeleton]);

  // sort gm list — wait until WebSocket indexTokens have arrived
  useEffect(() => {
    if (!allMarketInfos?.length || isMarketsLoading || !socketIndexTokensReady) {
      return;
    }

    const sortedByTvlUsd = buildGmListData({
      allMarketInfos,
      glvs,
      marketInfosMap,
      tokenPriceMap,
      balanceMap,
      connected,
    });

    const nextGmListVersion = sortedByTvlUsd
      .map((item: any) =>
        [
          item?.marketToken,
          item?.tvlUsdBn?.toString?.() || item?.tvlUsdBn,
          item?.walletUsd,
          item?.walletNum,
        ].join(':')
      )
      .join('|');

    if (connected) {
      let usdSum = BN_ZERO;
      let amountSum = BN_ZERO;
      allMarketInfos.forEach((item: any) => {
        const amt = balanceMap?.get(item?.marketToken) || BN_ZERO;
        amountSum = amountSum.add(amt);
        const usd = convertTokenAmountToUsd(
          amt,
          toGmw330Decimals(item?.marketDecimals || 0),
          toGmw330Bn(item?.marketPrice)
        );
        usdSum = usdSum.add(usd);
      });
      const nextWalletTotalsVersion = `${usdSum.toString()}:${amountSum.toString()}`;
      if (walletTotalsVersionRef.current !== nextWalletTotalsVersion) {
        setWalletTotalUsd(usdSum);
        setWalletTotalAmount(amountSum);
        walletTotalsVersionRef.current = nextWalletTotalsVersion;
      }
    } else {
      const nextWalletTotalsVersion = '0:0';
      if (walletTotalsVersionRef.current !== nextWalletTotalsVersion) {
        setWalletTotalUsd(BN_ZERO);
        setWalletTotalAmount(BN_ZERO);
        walletTotalsVersionRef.current = nextWalletTotalsVersion;
      }
    }

    if (sortedByTvlUsd?.length && gmListVersionRef.current !== nextGmListVersion) {
      setGmListData(sortedByTvlUsd);
      localStorage.setItem('gmListData', JSON.stringify(sortedByTvlUsd));
      setGmList(sortedByTvlUsd);
      gmListVersionRef.current = nextGmListVersion;
    }
    setIsGmListSorted((prev) => prev || sortedByTvlUsd.length > 0);
  }, [
    allMarketInfos,
    balanceMap,
    connected,
    glvs,
    isMarketsLoading,
    marketInfosMap,
    setGmListData,
    socketIndexTokensReady,
    tokenPriceMap,
  ]);

  // Update wallet data for GM list when balance changes
  useEffect(() => {
    if (isGmw330Enabled) return;

    if (!gmList || gmList.length === 0) return;

    if (connected) {
      let usdSum = BN_ZERO;
      let amountSum = BN_ZERO;
      const updatedList = gmList.map((existingItem: any) => {
        const amt = balanceMap?.get(existingItem?.marketToken) || BN_ZERO;
        amountSum = amountSum.add(amt);
        const usd = convertTokenAmountToUsd(
          amt,
          toGmw330Decimals(existingItem?.marketDecimals || 0),
          toGmw330Bn(existingItem?.marketPrice)
        );
        usdSum = usdSum.add(usd);
        return {
          ...existingItem,
          walletUsd: '$' + formatToKMBWithoutUsd(usd, 20),
          walletNum: `(${formatToKMBWithoutUsd(amt, toGmw330Decimals(existingItem?.marketDecimals || 0))} GM)`,
        };
      });
      const nextWalletTotalsVersion = `${usdSum.toString()}:${amountSum.toString()}`;
      if (walletTotalsVersionRef.current !== nextWalletTotalsVersion) {
        setWalletTotalUsd(usdSum);
        setWalletTotalAmount(amountSum);
        walletTotalsVersionRef.current = nextWalletTotalsVersion;
      }

      const nextGmListVersion = updatedList
        .map((item: any) =>
          [
            item?.marketToken,
            item?.tvlUsdBn?.toString?.() || item?.tvlUsdBn,
            item?.walletUsd,
            item?.walletNum,
          ].join(':')
        )
        .join('|');
      if (gmListVersionRef.current !== nextGmListVersion) {
        setGmList(updatedList);
        setGmListData(updatedList);
        gmListVersionRef.current = nextGmListVersion;
      }
    } else {
      const nextWalletTotalsVersion = '0:0';
      if (walletTotalsVersionRef.current !== nextWalletTotalsVersion) {
        setWalletTotalUsd(BN_ZERO);
        setWalletTotalAmount(BN_ZERO);
        walletTotalsVersionRef.current = nextWalletTotalsVersion;
      }
    }
  }, [connected, balanceMap, gmList, isGmw330Enabled, setGmListData]);

  useEffect(() => {
    if (connected && glvList && glvList.length > 0) {
      let usdSum = BN_ZERO;
      let amountSum = BN_ZERO;
      glvList.forEach((item: any) => {
        amountSum = amountSum.add(toGmw330Bn(item?.walletNumBn));
        usdSum = usdSum.add(toGmw330Bn(item?.walletUsdBn));
      })
      setGlvWalletTotalUsd(usdSum);
      setGlvWalletTotalAmount(amountSum);
    } else {
      setGlvWalletTotalUsd(BN_ZERO);
      setGlvWalletTotalAmount(BN_ZERO);
    }
  }, [glvList, connected, balanceMap]);

  const showTvlSkeleton = showSkeleton || isTvlLoading;

  return (
    <div className="pools-overview">
      <div className={`stats-section ${isMobile || isScreen1024 ? 'mt-[2rem]' : ''}`}>
        <div className="stats-value">
          {showTvlSkeleton ? <CellSkeleton width={110} height={32} /> : tvlValue}
        </div>
      </div>
      <div className="stats-section top-stats">
        <div className="stats-label"><Trans>TVL in vaults and pools.</Trans></div>
        {!isPoolNewEnabled && (
          <div className="stats-periods">
            {statsData.periods.map((period) => (
              <button
                key={period.key}
                className={`period-button ${seletedTab === period.key ? 'active' : ''}`}
                onClick={() => setSeletedTab(period.key)}
              >
                {period.period}
              </button>
            ))}
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes skeleton-shimmer {
            0% { background-position: 0% 0; }
            100% { background-position: 100% 0; }
          }
        `}
      </style>
      <div
        className="pools-section glv-vaults"
        style={{ background: '#181818', marginBottom: '0.8rem' }}
      >
        <div className="section-header">
          <h2 className="section-title"><Trans>GLV Vaults</Trans></h2>
          <div className="section-description">
            <Trans>Yield-optimized vaults supplying liquidity across multiple GMTrade markets.</Trans>
          </div>
        </div>

        {!isMobile && <div className="table-container">
          <TableScrollFadeContainer>
            <Table>
              <thead>
                <TableTheadTr>
                  <TableTh className='w-[15%]'>
                    <Trans>VAULT</Trans>
                  </TableTh>
                  <TableTh className='w-[13%]' style={{ whiteSpace: 'nowrap' }}>
                    <Trans>TVL (SUPPLY)</Trans>
                  </TableTh>
                  <TableTh className='w-[11%]'>
                    <div className="gm-table-sort-wrapper">
                      <button>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
                          <Trans>WALLET</Trans>
                          <TooltipWithPortal
                            className="TradeFeesRow-tooltip"
                            handle={
                              <img
                                src={InfoSvg}
                                alt=""
                                className="typeOptions-setting-info positive"
                                style={{ flexShrink: 0, top: 0 }}
                              />
                            }
                            position="bottom-end"
                            renderContent={() => (
                              <div className="gmWalletTooltip flex flex-col gap-6">
                                <p>
                                  <span><Trans>Wallet</Trans>:</span>
                                  <span className="value">
                                    {'$' +
                                      formatToKMBWithoutUsd(glvWalletTotalUsd, 20, { displayDecimals: 2 })
                                    } (
                                    {formatToKMBWithoutUsd(glvWalletTotalAmount, 9, { displayDecimals: 2 })}{' '}
                                    GLV)
                                  </span>
                                </p>
                                <p>
                                  <span><Trans>Total Earned Fees</Trans>:</span>
                                  <span className="value text-green-500">
                                    {formatUsd(userEarnings?.allGlvs?.total, {
                                      displayDecimals: 4,
                                      showPlusForZero: false,
                                      signed: false,
                                    })}
                                  </span>
                                </p>
                                <p>
                                  <span><Trans>7d Earned Fees</Trans>:</span>
                                  <span className="value text-green-500">
                                    {formatUsd(userEarnings?.allGlvs?.recent7d, {
                                      displayDecimals: 4,
                                      showPlusForZero: false,
                                      signed: false,
                                    })}
                                  </span>
                                </p>
                              </div>
                            )}
                          />
                        </span>
                      </button>
                    </div>
                  </TableTh>
                  {isPoolNewEnabled && (
                    <TableTh className='w-[11%]'>
                      <div
                        className="flex items-center"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        <Trans>FEE APR (24H)</Trans>
                        <TooltipWithPortal
                          className="TradeFeesRow-tooltip"
                          handle={
                            <img
                              src={InfoSvg}
                              alt=""
                              className="typeOptions-setting-info positive"
                              style={{ flexShrink: '0', top: 0 }}
                            />
                          }
                          position="bottom-end"
                          renderContent={() => (
                            <div>
                              <p>{t`Based on fees from the previous day.`}</p>
                            </div>
                          )}
                        />
                      </div>
                    </TableTh>
                  )}
                  <TableTh className='w-[11%]'>
                    <div
                      className="flex items-center"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <Trans>{isPoolNewEnabled ? t`FEE APR (90D)` : t`FEE APY`}</Trans>
                      <TooltipWithPortal
                        className="TradeFeesRow-tooltip"
                        handle={
                          <img
                            src={InfoSvg}
                            alt=""
                            className="typeOptions-setting-info positive"
                            style={{ flexShrink: '0', top: 0 }}
                          />
                        }
                        position="bottom-end"
                        renderContent={() => (
                          <div>
                            <p>
                              {isPoolNewEnabled
                                ? t`90-day rolling average of daily Fee APR.`
                                : t`Estimated annualized fees generated by trading activity (open, close, borrow, liquidations, swaps) over the selected period. Does not include backing token price changes, trading PnL, or funding fees.
                                `}
                            </p>
                          </div>
                        )}
                      />
                    </div>
                  </TableTh>
                  <TableTh className='w-[14%]'>
                    <div className="flex items-center">
                      <Trans>SNAPSHOT</Trans>
                      <TooltipWithPortal
                        className="TradeFeesRow-tooltip"
                        handle={
                          <img
                            src={InfoSvg}
                            alt=""
                            className="typeOptions-setting-info positive"
                            style={{ flexShrink: '0', top: 0 }}
                          />
                        }
                        position="bottom-end"
                        renderContent={() => (
                          <div>
                            <p>
                              {isPoolNewEnabled
                                ? t`Graph showing accrued fees over the past 90 days.`
                                : t`Graph showing accrued fee over the selected period.`}
                            </p>
                          </div>
                        )}
                      />
                    </div>
                  </TableTh>
                  <TableTh className='w-[10%]'></TableTh>
                </TableTheadTr>
              </thead>
              <tbody>
                {showSkeleton &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableTr key={`glv-skeleton-${i}`}>
                      {isGmw291Enabled ? (
                        <>
                          <TableTd className='w-[15%]'>
                            <div className="token-info glv-info">
                              <div style={{ flexShrink: 0 }}>
                                <CellSkeleton width={40} height={40} radius="50%" />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                <CellSkeleton width={90} />
                                <CellSkeleton width={60} />
                              </div>
                            </div>
                          </TableTd>
                          <TableTd className='w-[13%]'>
                            <CellSkeleton width={80} />
                          </TableTd>
                          <TableTd className='w-[11%]'>
                            <CellSkeleton width={80} />
                          </TableTd>
                          {isPoolNewEnabled && (
                            <TableTd className='w-[11%]'>
                              <CellSkeleton width={60} />
                            </TableTd>
                          )}
                          <TableTd className='w-[11%]'>
                            <CellSkeleton width={60} />
                          </TableTd>
                          <TableTd className='w-[14%]'>
                            <CellSkeleton width={100} height={24} />
                          </TableTd>
                          <TableTd className='w-[10%]'></TableTd>
                        </>
                      ) : (
                        <TableTd colSpan={isPoolNewEnabled ? 8 : 7}>
                          <div
                            style={{
                              width: '100%',
                              height: '24px',
                              background:
                                'linear-gradient(90deg, #323232 0%, #535353 93%)',
                              backgroundSize: '400% 100%',
                              borderRadius: '6px',
                              animation:
                                'skeleton-shimmer 1.2s ease-in-out infinite',
                            }}
                          />
                        </TableTd>
                      )}
                    </TableTr>
                  ))}
                {!showSkeleton &&
                  glvList.map((item) => (
                    <TableTr
                      key={item.marketToken}
                      onClick={() => navigateToGlvDetail(item)}
                    >
                      <TableTd className='w-[15%]'>
                        <div className="token-info glv-info">
                          <div style={{ flexShrink: '0' }}>
                            {getGmw113Enabled() ? (
                              <img src={TokenSvg} alt={'Token'} width={40} />
                            ) : (
                              <img src={TokenSvgOld} alt={'Token'} />
                            )}
                          </div>
                          <div>
                            <p className="token-name glv-name">
                              {getGlvDisplayNameByTokenAddress(item?.glvToken)}
                              <img
                                src={MoreSvg}
                                alt={'More'}
                                style={{ cursor: 'pointer' }}
                                onClick={(e) =>
                                  handleMoreClick(e, item?.marketToken)
                                }
                              />
                            </p>
                            <p className="token-symbol">[{item?.name}]</p>
                          </div>
                          {activeVaultId === item?.marketToken && (
                            <PopupMenu
                              show={true}
                              onClose={closeMenu}
                              vaultId={item?.marketToken}
                              info={item}
                              type="glv"
                            />
                          )}
                        </div>
                      </TableTd>
                      <TableTd style={{ textAlign: 'left' }} className='w-[13%]'>
                        <p className="tvlUsd">${item?.tvlUsd}</p>
                        <p className="tvlNum">{item?.tvlNum}</p>
                      </TableTd>
                      <TableTd className='w-[11%]'>
                        {isGmw291Enabled && (isWalletStatusSettling || (connected && typeof item?.walletNum !== 'string')) ? (
                          <CellSkeleton width={80} />
                        ) : connected && item?.walletNum !== '0.00' ? (
                          <>
                            <p style={{ fontSize: '1.3rem', fontWeight: 500 }}>
                              {item?.walletUsd}
                            </p>
                            <TooltipWithPortal
                              className="TradeFeesRow-tooltip"
                              handle={
                                <p className="wallet-num">
                                  {`(${item?.walletNum} GLV)`}
                                </p>
                              }
                              position="bottom-end"
                              renderContent={() => (
                                <div className="gmWalletTooltip">
                                  <p>
                                    <span><Trans>Total Earned Fees</Trans>:</span>
                                    <span className="value text-green-500">
                                      {formatUsd(
                                        userEarnings?.byGlvAddress?.[item?.marketToken]?.total,
                                        {
                                          displayDecimals: 4,
                                          showPlusForZero: false,
                                          signed: false,
                                        }
                                      )}
                                    </span>
                                  </p>
                                  <p>
                                    <span><Trans>7d Earned Fees</Trans>:</span>
                                    <span className="value text-green-500">
                                      {formatUsd(
                                        userEarnings?.byGlvAddress?.[item?.marketToken]?.recent7d,
                                        {
                                          displayDecimals: 4,
                                          showPlusForZero: false,
                                          signed: false,
                                        }
                                      )}
                                    </span>
                                  </p>
                                  <p className="description">
                                    <Trans>Earned Fees shows the fees earned from your GLV. Fee values are calculated when earned and exclude incentives.</Trans>
                                    <br />
                                    <br />
                                    <Trans>Your actual return is reflected in changes in the GLV token price.</Trans>
                                  </p>
                                </div>
                              )}
                            />
                          </>
                        ) : (
                          <p style={{ fontSize: '1.3rem', fontWeight: 500 }}>
                            -
                          </p>
                        )}
                      </TableTd>
                      {isPoolNewEnabled && (
                        <TableTd className='w-[11%]'>
                          {isFeeAprColLoading ? (
                            <CellSkeleton width={60} />
                          ) : (
                            <div>
                              {formatNewAprValue(aprLastMap?.get(item?.glvToken)?.annualized)}
                            </div>
                          )}
                        </TableTd>
                      )}
                      <TableTd className='w-[11%]'>
                        {isFeeAprColLoading ? (
                          <CellSkeleton width={60} />
                        ) : isPoolNewEnabled ? (
                          <div>
                            {formatNewAprValue(feeAprMap?.get(item?.glvToken)?.annualized)}
                          </div>
                        ) : (
                          <div>
                            {feeAprMap?.get(item?.glvToken)?.annualized !== 0
                              ? formatPercentageReg(
                                feeAprMap?.get(item?.glvToken)?.annualized * 10000
                              )
                              : '0.00%'}
                          </div>
                        )}
                      </TableTd>
                      <TableTd className='w-[14%]'>
                        {isGmw291Enabled && isAccruedLoading ? (
                          <CellSkeleton width={100} height={24} />
                        ) : (
                          <LineChartComponent
                            color={
                              (typeof glvDailyFeesMap?.get(item?.glvToken)?.annualized ===
                                'number'
                                ? parseFloat(glvDailyFeesMap?.get(item?.glvToken)?.annualized)
                                : parseFloat(
                                  String(
                                    glvDailyFeesMap?.get(item?.glvToken)?.annualized ||
                                    '0'
                                  )
                                )) < 0
                                ? '#F04545'
                                : '#31C366'
                            }
                            data={glvDailyFeesMap?.get(item?.glvToken)?.lineCharts}
                            hideWhenNoData={true}
                            autoScale
                          />
                        )}
                      </TableTd>
                      <TableTd className='w-[10%]'>
                        <div className="action-container">
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToPoolDetail('GLV', item, 'buy', seletedTab);
                            }}
                            style={{
                              cursor: showSkeleton ? 'default' : 'pointer',
                              pointerEvents: showSkeleton
                                ? 'none'
                                : 'auto',
                              opacity: showSkeleton ? 0.5 : 1,
                            }}
                            className="action-btn"
                          >
                            <img src={BuySvg} alt={'buy'} />
                            <span><Trans>Buy</Trans></span>
                          </div>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToPoolDetail('GLV', item, 'sell', seletedTab);
                            }}
                            style={{
                              cursor: showSkeleton ? 'default' : 'pointer',
                              pointerEvents: showSkeleton
                                ? 'none'
                                : 'auto',
                              opacity: showSkeleton ? 0.5 : 1,
                            }}
                            className="action-btn"
                          >
                            <img src={SellSvg} alt={'sell'} />
                            <span><Trans>Sell</Trans></span>
                          </div>
                          <div
                            className='action-btn'
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToPoolDetail('GLV', item, 'buy', seletedTab);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <img src={RightSvg} alt={'right'} />
                          </div>
                        </div>
                      </TableTd>
                    </TableTr>
                  ))}
              </tbody>
            </Table>
          </TableScrollFadeContainer>
        </div>}

        {isMobile && (
          <div className="glv-mobile-card-list">
            {showSkeleton &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={`glv-mobile-skeleton-${i}`} className="glv-mobile-card">
                  {isGmw291Enabled ? (
                    <>
                      <div className="glv-mobile-card-header">
                        <div className="glv-mobile-card-vault-info" style={{ alignItems: 'center', gap: '1rem' }}>
                          <CellSkeleton width={40} height={40} radius="50%" />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <CellSkeleton width={100} />
                            <CellSkeleton width={70} />
                          </div>
                        </div>
                        <div className="glv-mobile-card-chart">
                          <CellSkeleton width={100} height={40} />
                        </div>
                      </div>
                      <div className="glv-mobile-card-metrics" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        {Array.from({ length: 4 }).map((_, j) => (
                          <CellSkeleton key={j} width="100%" />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '120px',
                        background:
                          'linear-gradient(90deg, #323232 0%, #535353 93%)',
                        backgroundSize: '400% 100%',
                        borderRadius: '0.8rem',
                        animation: 'skeleton-shimmer 1.2s ease-in-out infinite',
                      }}
                    />
                  )}
                </div>
              ))}
            {!showSkeleton &&
              glvList.map((item) => (
                <div key={item.marketToken}
                  className="glv-mobile-card">
                  <div
                    className="glv-mobile-card-header"
                  >
                    <div className="glv-mobile-card-vault-info">
                      <div style={{ flexShrink: '0' }}>
                        <img src={getGmw113Enabled() ? TokenSvg : TokenSvgOld} alt={'Token'} />
                      </div>
                      <div>
                        <p className="glv-mobile-card-name">
                          {getGlvDisplayNameByTokenAddress(item?.glvToken)}
                          <img
                            src={MoreSvg}
                            alt={'More'}
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => handleMoreClick(e, item?.marketToken)}
                          />
                        </p>
                        <p className="glv-mobile-card-symbol">[{item?.name}]</p>
                      </div>
                      {activeVaultId === item?.marketToken && (
                        <PopupMenu
                          show={true}
                          onClose={closeMenu}
                          vaultId={item?.marketToken}
                          info={item}
                          type="glv"
                        />
                      )}
                    </div>
                    <div className="glv-mobile-card-chart">
                      {isGmw291Enabled && isAccruedLoading ? (
                        <CellSkeleton width={100} height={40} />
                      ) : (
                        <LineChartComponent
                          width={100}
                          color={
                            (typeof glvDailyFeesMap?.get(item?.glvToken)?.annualized ===
                              'number'
                              ? glvDailyFeesMap?.get(item?.glvToken)?.annualized
                              : parseFloat(
                                String(
                                  glvDailyFeesMap?.get(item?.glvToken)?.annualized || '0'
                                )
                              )) < 0
                              ? '#F04545'
                              : '#31C366'
                          }
                          data={glvDailyFeesMap?.get(item?.glvToken)?.lineCharts}
                          hideWhenNoData={true}
                          autoScale
                        />
                      )}
                    </div>
                    <div
                      className="glv-mobile-card-arrow"
                      onClick={() => navigateToGlvDetail(item)}
                    >
                      <img src={RightSvg} alt={'right'} />
                    </div>
                  </div>
                  <div className="glv-mobile-card-metrics">
                    {isPoolNewEnabled && (
                      <div className="glv-mobile-card-metric-row">
                        <span className="glv-mobile-card-metric-label flex items-center gap-[0.4rem]">
                          <Trans>FEE APR (24H)</Trans>
                          <TooltipWithPortal
                            className="TradeFeesRow-tooltip"
                            handle={
                              <img
                                src={InfoSvg}
                                alt=""
                                className="typeOptions-setting-info positive"
                                style={{ flexShrink: '0', top: 0 }}
                              />
                            }
                            position="top-end"
                            renderContent={() => (
                              <div>
                                <p>{t`Based on fees from the previous day.`}</p>
                              </div>
                            )}
                          />
                        </span>
                        <span className="glv-mobile-card-metric-value">
                          {isFeeAprColLoading ? (
                            <CellSkeleton width={60} />
                          ) : (
                            formatNewAprValue(aprLastMap?.get(item?.glvToken)?.annualized)
                          )}
                        </span>
                      </div>
                    )}
                    <div className="glv-mobile-card-metric-row">
                      <span className="glv-mobile-card-metric-label flex items-center gap-[0.4rem]">
                        <Trans>{isPoolNewEnabled ? t`FEE APR (90D)` : t`FEE APY`}</Trans>
                        <TooltipWithPortal
                          className="TradeFeesRow-tooltip"
                          handle={
                            <img
                              src={InfoSvg}
                              alt=""
                              className="typeOptions-setting-info positive"
                              style={{ flexShrink: '0', top: 0 }}
                            />
                          }
                          position="top-end"
                          renderContent={() => (
                            <div>
                              <p>
                                {isPoolNewEnabled
                                  ? t`90-day rolling average of daily Fee APR.`
                                  : t`Estimated annualized fees generated by trading activity (open, close, borrow, liquidations, swaps) over the selected period. Does not include backing token price changes, trading PnL, or funding fees.`}
                              </p>
                            </div>
                          )}
                        />
                      </span>
                      <span className="glv-mobile-card-metric-value">
                        {isFeeAprColLoading ? (
                          <CellSkeleton width={60} />
                        ) : isPoolNewEnabled ? (
                          <div>
                            {formatNewAprValue(feeAprMap?.get(item?.glvToken)?.annualized)}
                          </div>
                        ) : (
                          <div>
                            {formatPercentageReg(
                              feeAprMap?.get(item?.glvToken)?.annualized * 10000
                            )}
                          </div>
                        )}
                      </span>
                    </div>
                    <div className="glv-mobile-card-metric-row">
                      <span className="glv-mobile-card-metric-label">
                        <Trans>TVL (Supply)</Trans>
                      </span>
                      <span className="glv-mobile-card-metric-value">
                        <span>${item?.tvlUsd}</span>&nbsp;
                        <span className="glv-mobile-card-metric-sub">
                          {item?.tvlNum}
                        </span>
                      </span>
                    </div>
                    <div className="glv-mobile-card-metric-row">
                      <span className="glv-mobile-card-metric-label flex items-center">
                        <Trans>Wallet</Trans>
                        <TooltipWithPortal
                          className="TradeFeesRow-tooltip"
                          handle={
                            <img
                              src={InfoSvg}
                              alt=""
                              className="typeOptions-setting-info positive"
                              style={{ flexShrink: '0', top: 0 }}
                            />
                          }
                          position="bottom-end"
                          renderContent={() => (
                            <div className="gmWalletTooltip flex flex-col gap-6">
                              <p>
                                <span><Trans>Wallet</Trans>:</span>
                                <span className="value">
                                  {'$' +
                                    formatToKMBWithoutUsd(glvWalletTotalUsd, 20, { displayDecimals: 2 })
                                  } (
                                  {formatToKMBWithoutUsd(glvWalletTotalAmount, 9, { displayDecimals: 2 })}{' '}
                                  GLV)
                                </span>
                              </p>
                              <p>
                                <span><Trans>Total Earned Fees</Trans>:</span>
                                <span className="value text-green-500">
                                  {formatUsd(userEarnings?.allGlvs?.total, {
                                    displayDecimals: 4,
                                    showPlusForZero: false,
                                    signed: false,
                                  })}
                                </span>
                              </p>
                              <p>
                                <span><Trans>7d Earned Fees</Trans>:</span>
                                <span className="value text-green-500">
                                  {formatUsd(userEarnings?.allGlvs?.recent7d, {
                                    displayDecimals: 4,
                                    showPlusForZero: false,
                                    signed: false,
                                  })}
                                </span>
                              </p>
                            </div>
                          )}
                        />
                      </span>
                      <span className="glv-mobile-card-metric-value">
                        {isGmw291Enabled && (isWalletStatusSettling || (connected && typeof item?.walletNum !== 'string')) ? (
                          <CellSkeleton width={80} />
                        ) : connected && item?.walletNum !== '0.00' ? (
                          <>
                            <span>{item?.walletUsd}</span>
                            &nbsp;

                            <TooltipWithPortal
                              className="TradeFeesRow-tooltip"
                              handle={
                                <span className="glv-mobile-card-metric-sub">
                                  {`(${item?.walletNum} GLV)`}
                                </span>
                              }
                              position="bottom-end"
                              renderContent={() => (
                                <div className="gmWalletTooltip">
                                  <p>
                                    <span><Trans>Total Earned Fees</Trans>:</span>
                                    <span className="value text-green-500">
                                      {formatUsd(
                                        userEarnings?.byGlvAddress?.[item?.marketToken]?.total,
                                        {
                                          displayDecimals: 4,
                                          showPlusForZero: false,
                                          signed: false,
                                        }
                                      )}
                                    </span>
                                  </p>
                                  <p>
                                    <span><Trans>7d Earned Fees</Trans>:</span>
                                    <span className="value text-green-500">
                                      {formatUsd(
                                        userEarnings?.byGlvAddress?.[item?.marketToken]?.recent7d,
                                        {
                                          displayDecimals: 4,
                                          showPlusForZero: false,
                                          signed: false,
                                        }
                                      )}
                                    </span>
                                  </p>
                                  <p className="description">
                                    <Trans>Earned Fees shows the fees earned from your GLV. Fee values are calculated when earned and exclude incentives.</Trans>
                                    <br />
                                    <br />
                                    <Trans>Your actual return is reflected in changes in the GLV token price.</Trans>
                                  </p>
                                </div>
                              )}
                            />
                          </>
                        ) : (
                          <span>-</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="pools-section gm-pools" style={{ background: '#181818' }}>
        <div className="section-header">
          <h2 className="section-title"><Trans>GM Pools</Trans></h2>
          <div
            className="section-description"
            style={{ marginBottom: '1.6rem' }}
          >
            <Trans>Pools providing liquidity to specific GMTrade markets, supporting single-asset and native asset options.</Trans>
          </div>

          <div className="section-tabs-container">
            <div className="section-tabs-input">
              <div className="search-input-container">
                <div className="search-input-wrapper">
                  <SearchIconComponent className="search-icon" />
                  <input
                    type="text"
                    placeholder={t`Search Pools`}
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <div
                      className="search-close"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchTerm('');
                      }}
                    >
                      <img
                        src={closeIcons}
                        alt="clear"
                        width="14"
                        height="14"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="section-tabs">
              <button
                className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                <Trans>All Markets</Trans>
              </button>
              <button
                className={`tab-button ${activeTab === 'favorites' ? 'active' : ''}`}
                onClick={() => setActiveTab('favorites')}
              >
                <Trans>Favorites</Trans>
              </button>
              {/* <button
                className={`tab-button ${activeTab === 'layer1' ? 'active' : ''}`}
                onClick={() => setActiveTab('layer1')}
              >
                <Trans>Layer1&2</Trans>
              </button> */}
              <button
                className={`tab-button ${activeTab === 'forex' ? 'active' : ''}`}
                onClick={() => setActiveTab('forex')}
              >
                Forex
              </button>
              <button
                className={`tab-button ${activeTab === 'commodity' ? 'active' : ''}`}
                onClick={() => setActiveTab('commodity')}
              >
                <Trans>Commodity</Trans>
              </button>
              <button
                className={`tab-button ${activeTab === 'stock' ? 'active' : ''}`}
                onClick={() => setActiveTab('stock')}
              >
                <Trans>Stock</Trans>
              </button>
              <button
                className={`tab-button ${activeTab === 'crypto' ? 'active' : ''}`}
                onClick={() => setActiveTab('crypto')}
              >
                Crypto
              </button>
            </div>
          </div>
        </div>

        {!isMobile && <div
          className="table-container"
          style={{ borderBottom: '1px solid #535353' }}
        >
          <TableScrollFadeContainer>
            <Table>
              <thead>
                <TableTheadTr>
                  {/* <TableTh></TableTh> */}
                  <TableTh>
                    <Trans>POOL</Trans>
                  </TableTh>
                  <TableTh>
                    <div className="gm-table-sort-wrapper">
                      <button
                        className={`sortable ${gmSortField === 'tvl' && gmSortFieldList[gmSortField] !== 'default' ? 'select' : ''}`}
                        onClick={() => handleGmSort('tvl')}
                        style={{
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Trans>TVL (SUPPLY)</Trans> {getSortIcon('tvl')}
                      </button>
                    </div>
                  </TableTh>
                  <TableTh style={{ whiteSpace: 'nowrap' }}>
                    <div className="gm-table-sort-wrapper">
                      <button
                        className={`sortable ${gmSortField === 'wallet' && gmSortFieldList[gmSortField] !== 'default' ? 'select' : ''}`}
                        onClick={() => handleGmSort('wallet')}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
                          <Trans>WALLET</Trans>
                          <TooltipWithPortal
                            className="TradeFeesRow-tooltip"
                            handle={
                              <img
                                src={InfoSvg}
                                alt=""
                                className="typeOptions-setting-info positive"
                                style={{ flexShrink: '0', top: 0 }}
                              />
                            }
                            position="bottom-end"
                            renderContent={() => (
                              <div className="gmWalletTooltip flex flex-col gap-6">
                                <p>
                                  <span><Trans>Wallet</Trans>:</span>
                                  <span className="value">
                                    {'$' +
                                      formatToKMBWithoutUsd(walletTotalUsd, 20, { displayDecimals: 2 })
                                    } (
                                    {formatToKMBWithoutUsd(walletTotalAmount, 9, { displayDecimals: 2 })}{' '}
                                    GM)
                                  </span>
                                </p>
                                <p>
                                  <span><Trans>Total Earned Fees</Trans>:</span>
                                  <span className="value text-green-500">
                                    {formatUsd(userEarnings?.allMarkets?.total, {
                                      displayDecimals: 4,
                                      showPlusForZero: false,
                                      signed: false,
                                    })}
                                  </span>
                                </p>
                                <p>
                                  <span><Trans>7d Earned Fees</Trans>:</span>
                                  <span className="value text-green-500">
                                    {formatUsd(userEarnings?.allMarkets?.recent7d, {
                                      displayDecimals: 4,
                                      showPlusForZero: false,
                                      signed: false,
                                    })}
                                  </span>
                                </p>
                              </div>
                            )}
                          />
                        </span>
                        {getSortIcon('wallet')}
                      </button>
                    </div>
                  </TableTh>
                  {isPoolNewEnabled && (
                    <TableTh>
                      <div className="gm-table-sort-wrapper">
                        <button
                          className={`sortable ${gmSortField === 'feeApr24h' && gmSortFieldList[gmSortField] !== 'default' ? 'select' : ''}`}
                          onClick={() => handleGmSort('feeApr24h')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
                            <Trans>FEE APR (24H)</Trans>
                            <TooltipWithPortal
                              className="TradeFeesRow-tooltip"
                              handle={
                                <img
                                  src={InfoSvg}
                                  alt=""
                                  className="typeOptions-setting-info positive"
                                  style={{ flexShrink: '0', top: 0 }}
                                />
                              }
                              position="bottom-end"
                              renderContent={() => (
                                <div>
                                  <p>{t`Based on fees from the previous day.`}</p>
                                </div>
                              )}
                            />
                          </span>
                          {getSortIcon('feeApr24h')}
                        </button>
                      </div>
                    </TableTh>
                  )}
                  <TableTh>
                    <div className="gm-table-sort-wrapper">
                      <button
                        className={`sortable ${gmSortField === 'feeApy' && gmSortFieldList[gmSortField] !== 'default' ? 'select' : ''}`}
                        onClick={() => handleGmSort('feeApy')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
                          <Trans>{isPoolNewEnabled ? t`FEE APR (90D)` : t`FEE APY`}</Trans>
                          <TooltipWithPortal
                            className="TradeFeesRow-tooltip"
                            handle={
                              <img
                                src={InfoSvg}
                                alt=""
                                className="typeOptions-setting-info positive"
                                style={{ flexShrink: '0', top: 0 }}
                              />
                            }
                            position="bottom-end"
                            renderContent={() => (
                              <div>
                                <p>
                                  {isPoolNewEnabled
                                    ? t`90-day rolling average of daily Fee APR.`
                                    : t`Estimated annualized fees generated by trading activity (open, close, borrow, liquidations, swaps) over the selected period. Does not include backing token price changes, trading PnL, or funding fees.`}
                                </p>
                                {/* <p style={{ marginTop: '0.5rem' }}>
                                  {t`For detailed stats and comparisons, see the`}
                                </p>
                                <p>
                                  <a
                                    href="https://dune.com/gmx-io/v2-lp-dashboard"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: 'inline-block',
                                      borderBottom: '1px solid #fff',
                                    }}
                                  >
                                    {t`GMX V2 LP Dashboard.`}
                                  </a>
                                </p> */}
                              </div>
                            )}
                          />
                        </span>
                        {getSortIcon('feeApy')}
                      </button>
                    </div>
                  </TableTh>
                  {/* <TableTh>
                    <div className="gm-table-sort-wrapper">
                      <button
                        className={`sortable ${gmSortField === 'annPerformance' && gmSortFieldList[gmSortField] !== 'default' ? 'select' : ''}`}
                        onClick={() => handleGmSort('annPerformance')}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
                          <Trans>ANN. PERFORMANCE</Trans>{' '}
                          <TooltipWithPortal
                            className="TradeFeesRow-tooltip"
                            handle={
                              <img
                                src={InfoSvg}
                                alt=""
                                className="typeOptions-setting-info positive"
                                style={{ flexShrink: '0' }}
                              />
                            }
                            position="bottom-end"
                            renderContent={() => (
                              <div>
                                <p>
                                  {t`Annualized return of the pool or vault over the selected period, compared to a benchmark that follows Uniswap V2–style rebalancing of the backing tokens in the same GM pool or GLV vault.`}
                                </p>
                                <p style={{ marginTop: '0.5rem' }}>
                                  {t`Annualized figures based on short periods may be distorted by short-term volatility.`}
                                </p>
                              </div>
                            )}
                          />
                        </span>
                        {getSortIcon('annPerformance')}
                      </button>
                    </div>
                  </TableTh> */}
                  <TableTh>
                    <div className="gm-table-sort-wrapper">
                      <Trans>SNAPSHOT</Trans>
                      <TooltipWithPortal
                        className="TradeFeesRow-tooltip"
                        handle={
                          <img
                            src={InfoSvg}
                            alt=""
                            className="typeOptions-setting-info positive"
                            style={{ flexShrink: '0', top: 0 }}
                          />
                        }
                        position="bottom-end"
                        renderContent={() => (
                          <div>
                            <p>
                              {isPoolNewEnabled
                                ? t`Graph showing accrued fees over the past 90 days.`
                                : t`Graph showing accrued fee over the selected period.`}
                            </p>
                          </div>
                        )}
                      />
                    </div>
                  </TableTh>
                  <TableTh></TableTh>
                </TableTheadTr>
              </thead>
              <tbody>
                {showSkeleton ? (
                  <>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <TableTr
                        key={`gm-skeleton-${i}`}
                        hoverable={false}
                        bordered={false}
                      >
                        {isGmw291Enabled ? (
                          <>
                            <TableTd className='w-[15%]'>
                              <div className="token-info">
                                <div style={{ flexShrink: 0 }}>
                                  <CellSkeleton width={40} height={40} radius="50%" />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                  <CellSkeleton width={90} />
                                  <CellSkeleton width={60} />
                                </div>
                              </div>
                            </TableTd>
                            <TableTd className='w-[13%]'>
                              <CellSkeleton width={80} />
                            </TableTd>
                            <TableTd className='w-[11%]'>
                              <CellSkeleton width={80} />
                            </TableTd>
                            {isPoolNewEnabled && (
                              <TableTd className='w-[11%]'>
                                <CellSkeleton width={60} />
                              </TableTd>
                            )}
                            <TableTd className='w-[11%]'>
                              <CellSkeleton width={60} />
                            </TableTd>
                            <TableTd className='w-[14%]'>
                              <CellSkeleton width={100} height={24} />
                            </TableTd>
                            <TableTd className='w-[10%]'></TableTd>
                          </>
                        ) : (
                          <TableTd colSpan={isPoolNewEnabled ? 8 : 7} style={{ textAlign: 'center' }}>
                            <div
                              style={{
                                width: '100%',
                                height: '24px',
                                margin: '8px 0',
                                background:
                                  'linear-gradient(90deg, #323232 0%, #535353 93%)',
                                backgroundSize: '400% 100%',
                                borderRadius: '6px',
                                animation:
                                  'skeleton-shimmer 1.2s ease-in-out infinite',
                              }}
                            />
                          </TableTd>
                        )}
                      </TableTr>
                    ))}
                  </>
                ) : filteredGmList?.length === 0 ? (
                  <TableTr hoverable={false} bordered={false}>
                    <TableTd colSpan={isPoolNewEnabled ? 8 : 7} style={{ textAlign: 'center' }}>
                      <div className="pools-empty">
                        <div className="empty-title">{t`No pools matched`}</div>
                      </div>
                    </TableTd>
                  </TableTr>
                ) : (
                  <>
                    {currentPageItems?.map((pool, index) => (
                      <TableTr
                        className='gmListTr'
                        key={pool?.id || index}
                        style={{ height: '6rem' }}
                        hoverable={true}
                        onClick={() => navigateToGmDetail(pool)}
                      >
                        {/* <TableTd>
                        <button
                          className="favorite-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(pool?.marketToken);
                          }}
                        >
                          <IconStar
                            className={
                              favorites.has(pool?.marketToken)
                                ? 'star-filled'
                                : 'star-empty'
                            }
                          />
                        </button>
                      </TableTd> */}
                        <TableTd className='w-[15%]'>
                          <div className="token-info">
                            <div className="token-info-imgBox flex-shrink-0 flex items-center gap-[1.6rem]">
                              <button
                                className="favorite-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(pool?.marketToken);
                                }}
                              >
                                <IconStar
                                  className={
                                    favorites.has(pool?.marketToken)
                                      ? 'star-filled'
                                      : 'star-empty'
                                  }
                                />
                              </button>
                              <div>
                                <img
                                  src={getIconUrlPath(pool?.poolName, 40)}
                                  alt=""
                                  width={40}
                                />
                                <div className="ls-img">
                                  <img
                                    src={getIconUrlPath(
                                      GMX_SOLANA_TOKENS_RAW[pool?.longToken]?.symbol === "WGMX" ? "GMX" : GMX_SOLANA_TOKENS_RAW[pool?.longToken]?.symbol,
                                      24
                                    )}
                                    alt=""
                                    width={18}
                                  />
                                  <img
                                    src={getIconUrlPath(
                                      GMX_SOLANA_TOKENS_RAW[pool?.shortToken]
                                        ?.symbol,
                                      24
                                    )}
                                    alt=""
                                    width={18}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="token-name">
                              <p className="pool-name">
                                {formatMarketName(pool?.indexToken)}
                                {/* {pool?.poolName}/USD */}
                                <img
                                  src={MoreSvg}
                                  alt={'More'}
                                  onClick={(e) =>
                                    handleMoreClick(e, pool?.marketToken)
                                  }
                                  style={{ cursor: 'pointer' }}
                                />
                              </p>
                              <p style={{ whiteSpace: 'nowrap' }}>
                                [{wgmxTogmx(GMX_SOLANA_TOKENS_RAW[pool?.longToken]?.symbol)}-
                                {GMX_SOLANA_TOKENS_RAW[pool?.shortToken]?.symbol}]
                              </p>
                            </div>
                            {activeVaultId === pool?.marketToken && (
                              <PopupMenu
                                show={true}
                                onClose={closeMenu}
                                vaultId={pool?.marketToken}
                                info={pool}
                                type="gm"
                              />
                            )}
                          </div>
                        </TableTd>
                        <TableTd className='w-[13%]'>
                          <div>
                            <p
                              className="supply-usd"
                              style={{ fontSize: '1.3rem', fontWeight: '500' }}
                            >
                              {pool?.tvlUsd}
                            </p>
                            <p className="supply-amount">{pool?.tvlNum}</p>
                          </div>
                        </TableTd>
                        <TableTd className='w-[11%]'>
                          {isGmw291Enabled && (isWalletStatusSettling || (connected && typeof pool?.walletNum !== 'string')) ? (
                            <CellSkeleton width={80} />
                          ) : connected && pool?.walletNum !== '(0.00 GM)' ? (
                            <>
                              <p style={{ fontSize: '1.3rem', fontWeight: '500' }}>
                                {pool?.walletUsd || '-'}
                              </p>
                              <TooltipWithPortal
                                className="TradeFeesRow-tooltip"
                                handle={
                                  <p className="wallet-num">
                                    {pool?.walletNum || '-'}
                                  </p>
                                }
                                position="bottom-end"
                                renderContent={() => (
                                  <div className="gmWalletTooltip">
                                    <p>
                                      <span><Trans>Total Earned Fees</Trans>:</span>
                                      <span className="value text-green-500">
                                        {formatUsd(
                                          userEarnings?.byMarketAddress?.[
                                            pool?.marketToken
                                          ]?.total,
                                          {
                                            displayDecimals: 4,
                                            showPlusForZero: false,
                                            signed: false,
                                          }
                                        )}
                                      </span>
                                    </p>
                                    <p>
                                      <span><Trans>7d Earned Fees</Trans>:</span>
                                      <span className="value text-green-500">
                                        {formatUsd(
                                          userEarnings?.byMarketAddress?.[
                                            pool?.marketToken
                                          ]?.recent7d,
                                          {
                                            displayDecimals: 4,
                                            showPlusForZero: false,
                                            signed: false,
                                          }
                                        )}
                                      </span>
                                    </p>
                                    <p className="description">
                                      <Trans>Earned Fees shows the fees earned from your GM. Fee values are calculated when earned and exclude incentives.</Trans>
                                      <br />
                                      <br />
                                      <Trans>Your actual return is reflected in changes in the GM token price.</Trans>
                                    </p>
                                  </div>
                                )}
                              />
                            </>
                          ) : (
                            <p style={{ fontSize: '1.3rem', fontWeight: '500' }}>
                              -
                            </p>
                          )}
                        </TableTd>
                        {isPoolNewEnabled && (
                          <TableTd className='w-[11%]'>
                            {isFeeAprColLoading ? (
                              <CellSkeleton width={60} />
                            ) : (
                              <div>
                                {formatNewAprValue(aprLastMap?.get(pool?.marketToken)?.annualized)}
                              </div>
                            )}
                          </TableTd>
                        )}
                        <TableTd className='w-[11%]'>
                          {isFeeAprColLoading ? (
                            <CellSkeleton width={60} />
                          ) : isPoolNewEnabled ? (
                            <div>
                              {formatNewAprValue(feeAprMap?.get(pool?.marketToken)?.annualized)}
                            </div>
                          ) : (
                            <div>
                              {(feeAprMap?.get(pool?.marketToken)?.annualized * 100) > 1000
                                ? '> 1000%'
                                : formatPercentageReg(feeAprMap?.get(pool?.marketToken)?.annualized * 10000)}
                            </div>
                          )}
                        </TableTd>
                        <TableTd className='w-[14%]'>
                          {isGmw291Enabled && isAccruedLoading ? (
                            <CellSkeleton width={100} height={24} />
                          ) : (
                            <>
                              {
                                isMobile && (
                                  <LineChartComponent
                                    width={100}
                                    color={
                                      (typeof marketDailyStats?.get(pool?.marketToken)
                                        ?.annualized === 'number'
                                        ? marketDailyStats?.get(pool?.marketToken)?.annualized
                                        : parseFloat(
                                          String(
                                            marketDailyStats?.get(pool?.marketToken)
                                              ?.annualized || '0'
                                          )
                                        )) < 0
                                        ? '#F04545'
                                        : '#31C366'
                                    }
                                    data={marketDailyStats?.get(pool?.marketToken)?.lineCharts}
                                    hideWhenNoData={true}
                                    autoScale
                                  />
                                )
                              }

                              {
                                !isMobile && (
                                  <LineChartComponent
                                    color={
                                      (typeof marketDailyStats?.get(pool?.marketToken)
                                        ?.annualized === 'number'
                                        ? marketDailyStats?.get(pool?.marketToken)?.annualized
                                        : parseFloat(
                                          String(
                                            marketDailyStats?.get(pool?.marketToken)
                                              ?.annualized || '0'
                                          )
                                        )) < 0
                                        ? '#F04545'
                                        : '#31C366'
                                    }
                                    data={marketDailyStats?.get(pool?.marketToken)?.lineCharts}
                                    hideWhenNoData={true}
                                    autoScale
                                  />
                                )
                              }
                            </>
                          )}
                        </TableTd>
                        <TableTd className='w-[10%]'>
                          <div className="action-container">
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateToPoolDetail('GM', pool, 'buy', seletedTab);
                              }}
                              style={{
                                cursor: showSkeleton ? 'default' : 'pointer',
                                pointerEvents: showSkeleton
                                  ? 'none'
                                  : 'auto',
                                opacity: showSkeleton ? 0.5 : 1,
                              }}
                              className="action-btn"
                            >
                              <img src={BuySvg} alt={'buy'} />
                              <span><Trans>Buy</Trans></span>
                            </div>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateToPoolDetail('GM', pool, 'sell', seletedTab);
                              }}
                              style={{
                                cursor: showSkeleton ? 'default' : 'pointer',
                                pointerEvents: showSkeleton
                                  ? 'none'
                                  : 'auto',
                                opacity: showSkeleton ? 0.5 : 1,
                              }}
                              className="action-btn"
                            >
                              <img src={SellSvg} alt={'sell'} />
                              <span><Trans>Sell</Trans></span>
                            </div>
                            <div
                              className='action-btn'
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateToPoolDetail('GM', pool, 'buy', seletedTab);
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <img src={RightSvg} alt={'right'} />
                            </div>
                          </div>
                        </TableTd>
                      </TableTr>

                    ))
                    }
                    <CurrentPageItemsFixedList
                      listTr="gmListTr"
                      data={currentPageItems}
                      page={10}
                    />
                  </>
                  //DOTO
                )}

              </tbody>
            </Table>
          </TableScrollFadeContainer>
        </div>}

        {isMobile && (
          <div className="gm-mobile-card-list">
            {showSkeleton ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={`gm-mobile-skeleton-${i}`} className="gm-mobile-card">
                  {isGmw291Enabled ? (
                    <>
                      <div className="gm-mobile-card-header">
                        <div className="gm-mobile-card-info" style={{ alignItems: 'center', gap: '1rem' }}>
                          <CellSkeleton width={40} height={40} radius="50%" />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <CellSkeleton width={100} />
                            <CellSkeleton width={70} />
                          </div>
                        </div>
                        <div className="gm-mobile-card-chart">
                          <CellSkeleton width={100} height={40} />
                        </div>
                      </div>
                      <div className="gm-mobile-card-metrics" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        {Array.from({ length: 4 }).map((_, j) => (
                          <CellSkeleton key={j} width="100%" />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '140px',
                        background:
                          'linear-gradient(90deg, #323232 0%, #535353 93%)',
                        backgroundSize: '400% 100%',
                        borderRadius: '0.8rem',
                        animation: 'skeleton-shimmer 1.2s ease-in-out infinite',
                      }}
                    />
                  )}
                </div>
              ))
            ) : filteredGmList?.length === 0 ? (
              <div className="pools-empty" style={{ marginTop: '1.6rem' }}>
                <div className="empty-title">{t`No pools matched`}</div>
              </div>
            ) : (
              currentPageItems?.map((pool, index) => (
                <div key={pool?.marketToken || index} className="gm-mobile-card" onClick={(e) => {
                  e.stopPropagation();
                  navigateToGmDetail(pool);
                }}>
                  <div
                    className="gm-mobile-card-header"
                  >
                    <div className="gm-mobile-card-info">

                      <div className="gm-mobile-card-icons">
                        <img
                          src={getIconUrlPath(pool?.poolName, 40)}
                          alt=""
                          width={40}
                          height={40}
                        />
                        <div className="ls-img">
                          <img
                            src={getIconUrlPath(
                              GMX_SOLANA_TOKENS_RAW[pool?.longToken]?.symbol === 'WGMX'
                                ? 'GMX'
                                : GMX_SOLANA_TOKENS_RAW[pool?.longToken]?.symbol,
                              24
                            )}
                            alt=""
                            width={18}
                            height={18}
                          />
                          <img
                            src={getIconUrlPath(
                              GMX_SOLANA_TOKENS_RAW[pool?.shortToken]?.symbol,
                              24
                            )}
                            alt=""
                            width={18}
                            height={18}
                          />
                        </div>
                      </div>
                      <div className="gm-mobile-card-text">
                        <p className="gm-mobile-card-name">
                          {formatMarketName(pool?.indexToken)}
                          <img
                            src={MoreSvg}
                            alt="more"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoreClick(e, pool?.marketToken);
                            }}
                          />
                        </p>
                        <p className="gm-mobile-card-symbol">
                          [
                          {wgmxTogmx(
                            GMX_SOLANA_TOKENS_RAW[pool?.longToken]?.symbol || ''
                          )}
                          -
                          {GMX_SOLANA_TOKENS_RAW[pool?.shortToken]?.symbol}]
                        </p>
                      </div>
                      {activeVaultId === pool?.marketToken && (
                        <PopupMenu
                          show={true}
                          onClose={closeMenu}
                          vaultId={pool?.marketToken}
                          info={pool}
                          type="gm"
                        />
                      )}
                    </div>
                    <div className="gm-mobile-card-chart">
                      {isGmw291Enabled && isAccruedLoading ? (
                        <CellSkeleton width={100} height={40} />
                      ) : (
                        <>
                          {
                            isMobile && (
                              <LineChartComponent
                                width={100}
                                color={
                                  (typeof marketDailyStats?.get(pool?.marketToken)
                                    ?.annualized === 'number'
                                    ? marketDailyStats?.get(pool?.marketToken)?.annualized
                                    : parseFloat(
                                      String(
                                        marketDailyStats?.get(pool?.marketToken)
                                          ?.annualized || '0'
                                      )
                                    )) < 0
                                    ? '#F04545'
                                    : '#31C366'
                                }
                                data={marketDailyStats?.get(pool?.marketToken)?.lineCharts}
                                hideWhenNoData={true}
                                autoScale
                              />
                            )
                          }

                          {
                            !isMobile && (
                              <LineChartComponent
                                color={
                                  (typeof marketDailyStats?.get(pool?.marketToken)
                                    ?.annualized === 'number'
                                    ? marketDailyStats?.get(pool?.marketToken)?.annualized
                                    : parseFloat(
                                      String(
                                        marketDailyStats?.get(pool?.marketToken)
                                          ?.annualized || '0'
                                      )
                                    )) < 0
                                    ? '#F04545'
                                    : '#31C366'
                                }
                                data={marketDailyStats?.get(pool?.marketToken)?.lineCharts}
                                hideWhenNoData={true}
                                autoScale
                              />
                            )
                          }
                        </>
                      )}
                    </div>
                    <div className="gm-mobile-card-fav">
                      <button
                        className="favorite-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(pool?.marketToken);
                        }}
                      >
                        <IconStar
                          className={
                            favorites.has(pool?.marketToken)
                              ? 'star-filled'
                              : 'star-empty'
                          }
                        />
                      </button>
                    </div>
                  </div>

                  <div className="gm-mobile-card-metrics">
                    {isPoolNewEnabled && (
                      <div className="gm-mobile-card-metric-row">
                        <span className="gm-mobile-card-metric-label flex items-center gap-[0.4rem]">
                          <Trans>FEE APR (24H)</Trans>
                          <TooltipWithPortal
                            className="TradeFeesRow-tooltip"
                            handle={
                              <img
                                src={InfoSvg}
                                alt=""
                                className="typeOptions-setting-info positive"
                                style={{ flexShrink: '0', top: 0 }}
                              />
                            }
                            position="top-end"
                            renderContent={() => (
                              <div>
                                <p>{t`Based on fees from the previous day.`}</p>
                              </div>
                            )}
                          />
                        </span>
                        <span className="gm-mobile-card-metric-value">
                          {isFeeAprColLoading ? (
                            <CellSkeleton width={60} />
                          ) : (
                            formatNewAprValue(aprLastMap?.get(pool?.marketToken)?.annualized)
                          )}
                        </span>
                      </div>
                    )}
                    <div className="gm-mobile-card-metric-row">
                      <span className="gm-mobile-card-metric-label flex items-center gap-[0.4rem]">
                        <Trans>{isPoolNewEnabled ? t`FEE APR (90D)` : t`FEE APY`}</Trans>
                        <TooltipWithPortal
                          className="TradeFeesRow-tooltip"
                          handle={
                            <img
                              src={InfoSvg}
                              alt=""
                              className="typeOptions-setting-info positive"
                              style={{ flexShrink: '0', top: 0 }}
                            />
                          }
                          position="top-end"
                          renderContent={() => (
                            <div>
                              <p>
                                {isPoolNewEnabled
                                  ? t`90-day rolling average of daily Fee APR.`
                                  : t`Estimated annualized fees generated by trading activity (open, close, borrow, liquidations, swaps) over the selected period. Does not include backing token price changes, trading PnL, or funding fees.`}
                              </p>
                            </div>
                          )}
                        />
                      </span>
                      <span className="gm-mobile-card-metric-value">
                        {isFeeAprColLoading ? (
                          <CellSkeleton width={60} />
                        ) : isPoolNewEnabled ? (
                          <div>
                            {formatNewAprValue(feeAprMap?.get(pool?.marketToken)?.annualized)}
                          </div>
                        ) : (
                          <div>
                            {(feeAprMap?.get(pool?.marketToken)?.annualized * 100) > 1000
                              ? '> 1000%'
                              : formatPercentageReg(feeAprMap?.get(pool?.marketToken)?.annualized * 10000)}
                          </div>
                        )}
                      </span>
                    </div>
                    <div className="gm-mobile-card-metric-row">
                      <span className="gm-mobile-card-metric-label">
                        <Trans>TVL (Supply)</Trans>
                      </span>
                      <span className="gm-mobile-card-metric-value">
                        <span>{pool?.tvlUsd}</span>&nbsp;
                        <span className="gm-mobile-card-metric-sub">
                          {pool?.tvlNum}
                        </span>
                      </span>
                    </div>
                    <div className="gm-mobile-card-metric-row">
                      <span className="gm-mobile-card-metric-label flex items-center">
                        <Trans>Wallet</Trans>
                        <TooltipWithPortal
                          className="TradeFeesRow-tooltip"
                          handle={
                            <img
                              src={InfoSvg}
                              alt=""
                              className="typeOptions-setting-info positive"
                              style={{ flexShrink: '0', top: 0 }}
                            />
                          }
                          position="bottom-end"
                          renderContent={() => (
                            <div className="gmWalletTooltip flex flex-col gap-6">
                              <p>
                                <span><Trans>Wallet</Trans>:</span>
                                <span className="value">
                                  {'$' +
                                    formatToKMBWithoutUsd(walletTotalUsd, 20, { displayDecimals: 2 })
                                  } (
                                  {formatToKMBWithoutUsd(walletTotalAmount, 9, { displayDecimals: 2 })}{' '}
                                  GM)
                                </span>
                              </p>
                              <p>
                                <span><Trans>Total Earned Fees</Trans>:</span>
                                <span className="value text-green-500">
                                  {formatUsd(userEarnings?.allMarkets?.total, {
                                    displayDecimals: 4,
                                    showPlusForZero: false,
                                    signed: false,
                                  })}
                                </span>
                              </p>
                              <p>
                                <span><Trans>7d Earned Fees</Trans>:</span>
                                <span className="value text-green-500">
                                  {formatUsd(userEarnings?.allMarkets?.recent7d, {
                                    displayDecimals: 4,
                                    showPlusForZero: false,
                                    signed: false,
                                  })}
                                </span>
                              </p>
                            </div>
                          )}
                        />
                      </span>
                      <span className="gm-mobile-card-metric-value">
                        {isGmw291Enabled && (isWalletStatusSettling || (connected && typeof pool?.walletNum !== 'string')) ? (
                          <CellSkeleton width={80} />
                        ) : connected && pool?.walletNum && pool?.walletNum !== '(0.00 GM)' ? (
                          <>
                            <span>{pool?.walletUsd || '-'}</span>
                            &nbsp;
                            <TooltipWithPortal
                              className="TradeFeesRow-tooltip"
                              handle={
                                <span className="gm-mobile-card-metric-sub">
                                  {pool?.walletNum || '-'}
                                </span>
                              }
                              position="top-end"
                              renderContent={() => (
                                <div className="gmWalletTooltip flex flex-col gap-6">
                                  <p>
                                    <span><Trans>Total Earned Fees</Trans>:</span>
                                    <span className="value text-green-500">
                                      {formatUsd(
                                        userEarnings?.byMarketAddress?.[
                                          pool?.marketToken
                                        ]?.total,
                                        {
                                          displayDecimals: 4,
                                          showPlusForZero: false,
                                          signed: false,
                                        }
                                      )}
                                    </span>
                                  </p>
                                  <p>
                                    <span><Trans>7d Earned Fees</Trans>:</span>
                                    <span className="value text-green-500">
                                      {formatUsd(
                                        userEarnings?.byMarketAddress?.[
                                          pool?.marketToken
                                        ]?.recent7d,
                                        {
                                          displayDecimals: 4,
                                          showPlusForZero: false,
                                          signed: false,
                                        }
                                      )}
                                    </span>
                                  </p>
                                  <p className="description">
                                    <Trans>Earned Fees shows the fees earned from your GM. Fee values are calculated when earned and exclude incentives.</Trans>
                                    <br />
                                    <br />
                                    <Trans>Your actual return is reflected in changes in the GM token price.</Trans>
                                  </p>
                                </div>
                              )}
                            />
                          </>
                        ) : (
                          <span>-</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* <div className="gm-mobile-card-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLinkInfo({
                          poolType: 'GM',
                          poolAddress: pool?.marketToken,
                          poolInfo: { ...pool, operationType: 'buy' },
                        });
                        sessionStorage.setItem(
                          'linkInfo',
                          JSON.stringify({
                            poolType: 'GM',
                            poolAddress: pool?.marketToken,
                            poolInfo: { ...pool, operationType: 'buy' },
                          })
                        );
                        navigate('/pools/poolDetail');
                      }}
                    >
                      <img src={BuySvg} alt="buy" />
                      <span>Buy</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLinkInfo({
                          poolType: 'GM',
                          poolAddress: pool?.marketToken,
                          poolInfo: { ...pool, operationType: 'sell' },
                        });
                        sessionStorage.setItem(
                          'linkInfo',
                          JSON.stringify({
                            poolType: 'GM',
                            poolAddress: pool?.marketToken,
                            poolInfo: { ...pool, operationType: 'sell' },
                          })
                        );
                        navigate('/pools/poolDetail');
                      }}
                    >
                      <img src={SellSvg} alt="sell" />
                      <span>Sell</span>
                    </button>
                    <button
                      className="gm-mobile-card-arrow"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLinkInfo({
                          poolType: 'GM',
                          poolAddress: pool?.marketToken,
                          poolInfo: { ...pool, operationType: 'buy' },
                        });
                        sessionStorage.setItem(
                          'linkInfo',
                          JSON.stringify({
                            poolType: 'GM',
                            poolAddress: pool?.marketToken,
                            poolInfo: { ...pool, operationType: 'buy' },
                          })
                        );
                        navigate('/pools/poolDetail');
                      }}
                    >
                      <img src={RightSvg} alt="enter" />
                    </button>
                  </div> */}
                </div>
              ))
            )}
          </div>
        )}

        <div className="pagination" style={{ marginTop: '0rem' }}>
          <style>
            {`
              .pagination .pagination {
                margin-top: 0rem !important;
              }
            `}
          </style>
          <BottomTablePagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
};

export default PoolsOverview;
