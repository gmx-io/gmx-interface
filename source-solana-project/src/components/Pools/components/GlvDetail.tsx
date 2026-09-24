/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { getPoolNewEnabled, getGmw331Enabled, getGmw291Enabled, getGmw379Enabled, getGmw442Enabled } from '@/config/featureFlagEnable';
import './GlvDetail.scss';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { msg, Trans, t } from '@lingui/macro';
import Tab from '@/components/Common/Tab/Tab';
import CellSkeleton from '@/components/Common/Skeleton/CellSkeleton';
import LoadingComponent from '@/utils/LoadingComponent';
import GlvTradePanel from '@/components/Pools/components/GlvTradePanel';
import GmTradePanel from '@/components/Pools/components/GmTradePanel';
import ExposureAbout from '@/components/Pools/components/ExposureAbout/ExposureAbout';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import { ChartMountGuard } from '@/components/Common/Chart/ChartMountGuard';
import InfoSvg from '@/components/TradeBoxNew/assets/Info.svg';
import { useTokenPriceMap } from '../Hooks/useTokenPriceMap';
import { getGmGlvPrice } from '../utils/getGmGlvPrice';
import { getAnnData } from '../utils/getAnnData';
import { getApyData } from '../utils/getApyData';
import { useFeeAprChartData } from '../Hooks/useFeeAprChartData';
import { useDetailAprData } from '../Hooks/useDetailAprData';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import { getGlvDisplayNameByTokenAddress } from '@/utils/glv/getGlvDisplayName';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Area,
} from 'recharts';
import {
  formatAmount,
  formatToKMBWithoutUsd,
  formatUsd,
  formatUsdToKMB,
} from '@/utils/legacy/format';
import { BN } from '@coral-xyz/anchor';
import { getIconUrlPath } from '@/utils/lib/icon';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { useGlvMarkets } from '../Hooks/useGlvMarkets';
import { GMX_SOLANA_GLV_TOKENS } from '@/config/program';
import { useTokenMetadatasForGlv } from '../Hooks/useTokenMetadatasForGlv';
import { BN_ZERO } from '@solana/spl-governance';
import { useAppStore } from '@/zustand/useAppStore';
import { useMarkets } from '../Hooks/useMarkets';
import { useMarkets as useOnChainMarkets } from '@/hooks/fetchHooks/useMarkets';
import { formatPercentageReg } from '@/utils/legacy/format';
import { useMedia } from 'react-use';
import RightSvg from '@/img/pools/Right.svg';
import { TOKEN_COLOR_MAP } from '@/config/tokens';
import { getBalanceMap } from '../utils/getBalanceMap';
import HeaderLeft from '../HeaderLeft/HeaderLeft';
import { PublicKey } from '@solana/web3.js';
import { useAnchorProvider, useStoreProgram } from '@/contexts/anchor';
import { findGlvPDA } from 'gmsol';
import { useUserEarnings } from '../Hooks/useUserEarnings';
import { useMarketDailyStats } from '../Hooks/useAccruedData';
import { useNavigate } from 'react-router-dom';
import { getPoolDetailPath } from '@/components/Pools/utils/poolDetailRoute';
import { buildGmListData } from '@/components/Pools/utils/buildGmListData';
import { POOLS_GLV_SQUID_ADDRESSES } from '@/components/Pools/utils/poolsSquidAddresses';
import { IS_DEVELOPMENT } from '@/config/env';
import { useLocalizedMap } from '@/utils/lib/i18n';

type PoolType = 'GLV' | 'GM';
type OperationType = 'Buy' | 'Sell' | 'Shift';
type TabType = 'Accrued Fee' | 'Price' | 'Fee APR';

const useGmw379OnChainMarkets = getGmw379Enabled()
  ? useOnChainMarkets
  : (_options?: { enableRefresh?: boolean }) => undefined;

interface GlvDetailProps {
  poolType?: PoolType;
  poolAddress?: string;
  poolData?: any;
  onClose?: () => void;
}

const operationClassNames = {
  Buy: {
    active: '!bg-[#19382A] border-b border-b-green-500',
    regular: 'border-b border-b-[transparent]',
  },
  Sell: {
    active: '!bg-[#2D1919] border-b border-b-red-500',
    regular: 'border-b border-b-[transparent]',
  },
  Shift: {
    active: '!bg-[#323232] border-b border-b-[#FA7B4E]',
    regular: 'border-b border-b-[transparent]',
  },
};

const POOL_DETAIL_LABELS = {
  BuyGlv: msg`Buy GLV`,
  SellGlv: msg`Sell GLV`,
  BuyGm: msg`Buy GM`,
  SellGm: msg`Sell GM`,
  ShiftGm: msg`Shift GM`,
  Single: msg`Single`,
  Pair: msg`Pair`,
};

const toStoredOperationType = (operation: OperationType) => {
  if (operation === 'Sell') {
    return 'sell';
  }

  if (operation === 'Shift') {
    return 'shift';
  }

  return 'buy';
};

const fromStoredOperationType = (operationType?: string): OperationType => {
  if (operationType === 'sell') {
    return 'Sell';
  }

  if (operationType === 'shift') {
    return 'Shift';
  }

  return 'Buy';
};

const hasPositiveBnValue = (value: any) => {
  try {
    if (value && typeof value === "string") {
      return new BN(value?.toString?.() || value || '0').gt(BN_ZERO);
    } else {
      return new BN('0').gt(BN_ZERO);
    }
  } catch {
    return false;
  }
};

const getFallbackPoolData = (
  poolType: PoolType,
  poolAddress?: string,
  poolData?: any
) => {
  if (poolData && Object.keys(poolData).length) {
    return poolData;
  }

  if (!poolAddress) {
    return poolData;
  }

  return {
    marketToken: poolAddress,
    ...(poolType === 'GLV' ? { glvToken: poolAddress } : {}),
    operationType: 'buy',
  };
};

const getPoolDataVersion = (poolData?: any) => {
  if (!poolData || typeof poolData !== 'object') {
    return '';
  }

  return [
    poolData.marketToken,
    poolData.glvToken,
    poolData.operationType,
    poolData.seletedTab,
    poolData.glvPriceBN?.toString?.() || poolData.glvPriceBN,
    poolData.totalSupply?.toString?.() || poolData.totalSupply,
    poolData.tvlUsdBn?.toString?.() || poolData.tvlUsdBn,
    poolData.tvlUsdBnStr,
    poolData.longRate,
    poolData.shortRate,
    Array.isArray(poolData.markets) ? poolData.markets.length : 0,
    Array.isArray(poolData.markets)
      ? poolData.markets
        .map((market: any) =>
          [
            market?.marketToken,
            market?.tvlUsdBn?.toString?.() || market?.tvlUsdBn,
            market?.capUsdBn?.toString?.() || market?.capUsdBn,
            market?.composition,
            ...(getGmw442Enabled()
              ? [market?.perMarketSellableUsd?.toString?.() || market?.perMarketSellableUsd || '']
              : []),
          ].join(':')
        )
        .join('|')
      : '',
    ...(getGmw442Enabled() ? [poolData.sellableUsd] : []),
  ].join('::');
};

const getPoolDataVersionWithoutOperation = (poolData?: any) => {
  if (!poolData || typeof poolData !== 'object') {
    return '';
  }

  return getPoolDataVersion({
    ...poolData,
    operationType: '',
  });
};

const getPoolIdentity = (
  poolType: PoolType,
  poolAddress?: string,
  poolData?: any
) => {
  const dataAddress = poolType === 'GLV'
    ? poolData?.glvToken || poolData?.marketToken
    : poolData?.marketToken;

  return `${poolType}:${poolAddress || dataAddress || ''}`;
};

const getInitialDays = (seletedTab?: string) => (
  seletedTab === '30d' ? '30'
    : seletedTab === '90d' ? '90'
      : seletedTab === '180d' ? '180'
        : seletedTab === 'Total' ? 'all'
          : 'all'
);

const generateChartData = (
  list?: Array<{ timeStamp?: number | string; ydata?: number | string, ydataBn?: BN }>,
  poolType?: PoolType,
  selectedTab?: TabType,
  marketDecimals?: number,
  decimals?: number
): Array<{ date: string; value: number; fullDate: string; timestamp: number }> => {
  if (!Array.isArray(list)) return [];
  const items = list
    .map((it) => {
      const tRaw = it?.timeStamp;
      const yRaw = it?.ydata;

      const t = typeof tRaw === 'string' ? parseFloat(tRaw) : Number(tRaw ?? 0);
      const yAny = typeof yRaw === 'string' ? yRaw : String(yRaw ?? '0');
      return isNaN(t) ? null : { t, y: yAny, yBn: it?.ydataBn || new BN('0') };
    })
    .filter((v) => v !== null) as { t: number; y: string, yBn: BN }[];
  items.sort((a, b) => a.t - b.t);
  const data: Array<{ date: string; value: number; fullDate: string; timestamp: number, valueBn?: BN }> = items.map((it) => {
    const ms = it.t > 1e12 ? it.t : it.t * 1000;
    const d = new Date(ms);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = `${day}/${month}`;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const fullDate = `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

    let value: number;
    let valueBn: BN;
    if (selectedTab === 'Price') {
      const rawStr = String(it.y ?? '0').replace(/[^0-9]/g, '');
      const bn = new BN(rawStr || '0');
      if (poolType === 'GM') {
        value = Number(formatAmount(bn, 20 - marketDecimals, 5));
      } else {
        const dec = Math.max(0, 20 - (decimals ?? 0));
        value = Number(formatAmount(new BN(bn.toString()), dec, 5));
      }
    } else if (selectedTab === 'Accrued Fee') {
      const yNum = parseFloat(typeof it.y === 'string' ? it.y : String(it.y));
      value = Number(formatPercentageReg(yNum * 100, 2, { showPercent: false }));
      valueBn = it.yBn;
    } else {
      const yNum = parseFloat(typeof it.y === 'string' ? it.y : String(it.y));
      value = isFinite(yNum) ? parseFloat((yNum * 100).toFixed(2)) : 0;
      // const pct = isFinite(yNum) ? yNum * 100 : 0;
      // value = parseFloat(Math.min(pct, 1000).toFixed(2));
    }
    return { date, value: isNaN(value) ? 0 : value, fullDate, timestamp: ms, valueBn };
  });
  return data;
};

export function GlvDetail({ poolType: initialPoolType = 'GLV', poolAddress, poolData }: GlvDetailProps) {
  useGmw379OnChainMarkets({ enableRefresh: true });
  const isGmw291Enabled = getGmw291Enabled();
  const provider = useAnchorProvider();
  const navigate = useNavigate();
  const isPoolNewEnabled = getPoolNewEnabled();
  const isGmw331Enabled = getGmw331Enabled();
  const [startTimestamp, setStartTimestamp] = useState<string>('');

  const { setGlvPriceMap, glvListData, gmListData, linkInfo, setLinkInfo } = useAppStore((state) => state.pools);
  const { marketInfosMap, allMarketInfos, isLoading: isMarketsLoading } = useMarkets();
  const { balanceMap, connected } = getBalanceMap();
  const { glvs } = useGlvMarkets(GMX_SOLANA_GLV_TOKENS);
  const { tokenMetadatas: glvTokenMetadatas } = useTokenMetadatasForGlv(
    GMX_SOLANA_GLV_TOKENS
  );
  const { tokenPriceMap } = useTokenPriceMap();
  const [selectedTab, setSelectedTab] = useState<TabType>('Accrued Fee');
  const initialPoolData = getFallbackPoolData(initialPoolType, poolAddress, poolData);
  const poolDataVersion = getPoolDataVersion(poolData);
  const initialPoolIdentity = getPoolIdentity(initialPoolType, poolAddress, initialPoolData);
  const [operation, setOperation] = useState<OperationType>(
    fromStoredOperationType(initialPoolData?.operationType)
  );
  const [isChange, setIsChange] = useState(false);
  const [poolType, setPoolType] = useState<PoolType>(initialPoolType);
  const [poolInfo, setPoolInfo] = useState<any>(initialPoolData);
  const [isExecutionDetailsOpen, setIsExecutionDetailsOpen] = useState(false);
  const [gmBuyAndSellAbleInfo, setGmBuyAndSellAbleInfo] = useState<any>(null);
  const [annMap, setAnnMap] = useState<Map<string, any>>(new Map());
  const [apyMap, setApyMap] = useState<Map<string, any>>(new Map());
  const [days, setDays] = useState(getInitialDays(initialPoolData?.seletedTab));
  const [glvGmPrices, setGlvGmPrices] = useState<any>(null);
  const isScreen1024 = useMedia('(max-width: 1024px)');
  const isMobile = useMedia('(max-width: 768px)');
  const [isMobileTradeOpen, setIsMobileTradeOpen] = useState(false);
  const [chartAnimationDuration, setChartAnimationDuration] = useState(0);
  const [isPriceChartLoading, setIsPriceChartLoading] = useState(false);
  const mobileTradeContainerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const lastPoolIdentityRef = useRef(initialPoolIdentity);
  const operationRef = useRef(operation);
  const marketAddresses = useMemo(
    () => Array.from(marketInfosMap?.keys() || []),
    [marketInfosMap]
  );
  const legacyGlvAddresses = useMemo(
    () => GMX_SOLANA_GLV_TOKENS.map((item) => item.toString()),
    []
  );
  const glvAddresses = isGmw331Enabled
    ? POOLS_GLV_SQUID_ADDRESSES
    : legacyGlvAddresses;
  const feeAprTokenAddress =
    poolType === 'GM'
      ? poolInfo?.marketToken
      : poolInfo?.glvToken || poolInfo?.marketToken;
  const isDetailSquidReady =
    isGmw331Enabled &&
    isPoolNewEnabled &&
    !isMarketsLoading &&
    marketAddresses.length > 0;
  const detailSquidOptions = useMemo(
    () => ({
      squidSource: 'detail' as const,
      marketAddresses,
      glvAddresses: POOLS_GLV_SQUID_ADDRESSES,
      poolType: isPoolNewEnabled ? poolType : undefined,
      tokenAddress: isPoolNewEnabled ? feeAprTokenAddress : undefined,
      enabled: isDetailSquidReady,
    }),
    [marketAddresses, isPoolNewEnabled, poolType, feeAprTokenAddress, isDetailSquidReady]
  );
  const {
    marketChartDataMap: marketDailyStats,
    glvDailyFeesMap,
    isAccruedLoading,
  } =
    useMarketDailyStats(
      startTimestamp,
      isGmw331Enabled ? detailSquidOptions : undefined
    );
  const userEarnings = useUserEarnings(
    marketAddresses,
    glvAddresses,
    isGmw331Enabled ? detailSquidOptions : undefined
  );
  const { feeAprChartData, isLoading: isFeeAprChartLoading } = useFeeAprChartData({
    poolType: isPoolNewEnabled ? poolType : undefined,
    tokenAddress: isPoolNewEnabled ? feeAprTokenAddress : undefined,
    startTimestamp: isPoolNewEnabled ? startTimestamp : undefined,
    ...(isGmw331Enabled
      ? {
        marketAddresses,
        glvAddresses: POOLS_GLV_SQUID_ADDRESSES,
        enabled: isDetailSquidReady,
      }
      : {}),
  });
  const { detailAprMap } = useDetailAprData({
    poolType: isPoolNewEnabled ? poolType : undefined,
    tokenAddress: isPoolNewEnabled ? feeAprTokenAddress : undefined,
    ...(isGmw331Enabled
      ? {
        marketAddresses,
        glvAddresses: POOLS_GLV_SQUID_ADDRESSES,
        enabled: isDetailSquidReady,
      }
      : {}),
  });
  const liveGmListData = useMemo(() => {
    if (!IS_DEVELOPMENT || !allMarketInfos?.length) {
      return [];
    }

    return buildGmListData({
      allMarketInfos,
      glvs,
      marketInfosMap,
      tokenPriceMap,
      balanceMap,
      connected,
    });
  }, [allMarketInfos, balanceMap, connected, glvs, marketInfosMap, tokenPriceMap]);

  useEffect(() => {
    operationRef.current = operation;
  }, [operation]);

  useEffect(() => {
    const nextPoolData = getFallbackPoolData(initialPoolType, poolAddress, poolData);
    const nextPoolIdentity = getPoolIdentity(initialPoolType, poolAddress, nextPoolData);
    const isPoolIdentityChanged = lastPoolIdentityRef.current !== nextPoolIdentity;
    const nextPoolInfo = !isPoolIdentityChanged && nextPoolData
      ? {
        ...nextPoolData,
        operationType: toStoredOperationType(operationRef.current),
      }
      : nextPoolData;

    setPoolType(initialPoolType);
    setPoolInfo(nextPoolInfo);
    if (isPoolIdentityChanged) {
      const nextOperation = fromStoredOperationType(nextPoolData?.operationType);
      operationRef.current = nextOperation;
      setOperation(nextOperation);
      setDays(getInitialDays(nextPoolData?.seletedTab));
    }

    if (isPoolIdentityChanged) {
      setSelectedTab('Accrued Fee');
      lastPoolIdentityRef.current = nextPoolIdentity;
    }
  }, [
    initialPoolType,
    poolAddress,
    poolData?.marketToken,
    poolData?.glvToken,
    poolData?.operationType,
    poolData?.seletedTab,
    poolDataVersion,
  ]);

  const resolvedPoolInfo = useMemo(() => {
    if (!poolAddress) {
      return undefined;
    }

    const sourceList = initialPoolType === 'GLV'
      ? glvListData
      : IS_DEVELOPMENT
        ? [...liveGmListData, ...gmListData]
        : gmListData;

    return sourceList?.find((item: any) => {
      if (initialPoolType === 'GLV') {
        return item?.glvToken === poolAddress || item?.marketToken === poolAddress;
      }

      return item?.marketToken === poolAddress;
    });
  }, [glvListData, gmListData, initialPoolType, liveGmListData, poolAddress]);

  useEffect(() => {
    if (!resolvedPoolInfo) {
      return;
    }

    const nextPoolInfo = {
      ...resolvedPoolInfo,
      operationType: toStoredOperationType(operation),
    };

    const nextPoolAddress = initialPoolType === 'GLV'
      ? nextPoolInfo.glvToken || nextPoolInfo.marketToken || poolAddress
      : nextPoolInfo.marketToken || poolAddress;
    const nextLinkInfo = {
      poolType: initialPoolType,
      poolAddress: nextPoolAddress,
      poolInfo: nextPoolInfo,
    };
    const isPoolInfoCurrent =
      poolType === initialPoolType &&
      getPoolDataVersionWithoutOperation(poolInfo) ===
      getPoolDataVersionWithoutOperation(nextPoolInfo);
    const isLinkInfoCurrent =
      linkInfo?.poolType === nextLinkInfo.poolType &&
      linkInfo?.poolAddress === nextLinkInfo.poolAddress &&
      getPoolDataVersion(linkInfo?.poolInfo) === getPoolDataVersion(nextPoolInfo);

    if (!isPoolInfoCurrent) {
      setPoolType(initialPoolType);
      setPoolInfo(nextPoolInfo);
    }

    if (!isLinkInfoCurrent) {
      setLinkInfo(nextLinkInfo);
      sessionStorage.setItem('linkInfo', JSON.stringify(nextLinkInfo));
    }
  }, [
    initialPoolType,
    linkInfo,
    operation,
    poolAddress,
    poolInfo,
    poolType,
    resolvedPoolInfo,
    setLinkInfo,
  ]);

  const handleOperationChange = (nextOperation: OperationType) => {
    operationRef.current = nextOperation;
    const nextOperationType = toStoredOperationType(nextOperation);
    const nextPoolInfo = poolInfo && typeof poolInfo === 'object'
      ? {
        ...poolInfo,
        operationType: nextOperationType,
      }
      : poolInfo;

    setOperation(nextOperation);
    setPoolInfo(nextPoolInfo);

    if (!nextPoolInfo || typeof nextPoolInfo !== 'object') {
      return;
    }

    const nextPoolAddress = poolType === 'GLV'
      ? nextPoolInfo.glvToken || nextPoolInfo.marketToken || poolAddress
      : nextPoolInfo.marketToken || poolAddress;

    if (!nextPoolAddress) {
      return;
    }

    const nextLinkInfo = {
      poolType,
      poolAddress: nextPoolAddress,
      poolInfo: nextPoolInfo,
    };

    setLinkInfo(nextLinkInfo);
    sessionStorage.setItem('linkInfo', JSON.stringify(nextLinkInfo));
  };

  useEffect(() => {
    if (poolType !== 'GLV' || !poolInfo?.marketToken) {
      return
    }
    const subId = provider.connection.onAccountChange(
      new PublicKey(findGlvPDA(new PublicKey(poolInfo.marketToken))[0].toBase58()),
      // new PublicKey(poolInfo?.marketToken),
      () => {
        setIsChange(true);
      }
    );
    return () => {
      void provider.connection.removeAccountChangeListener(subId);
    };
  }, [
    provider.connection,
  ]);

  useEffect(() => {
    if (poolType !== 'GLV' || !isChange) {
      return
    }
    const glvInfo = glvListData?.find((item: any) => item?.glvToken === poolInfo?.glvToken);
    if (glvInfo) {
      setPoolInfo(glvInfo);
    }
  }, [glvs]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [poolInfo?.marketToken, poolInfo?.glvToken]);

  useEffect(() => {
    if (isScreen1024 && isMobileTradeOpen) {
      const scrollY = window.scrollY;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
        if (mobileTradeContainerRef.current) {
          mobileTradeContainerRef.current.style.paddingRight = `${scrollbarWidth}px`;
        }
        if (backdropRef.current) {
          backdropRef.current.style.paddingRight = `${scrollbarWidth}px`;
        }
      }

      if (mobileTradeContainerRef.current) {
        mobileTradeContainerRef.current.scrollTop = 0;
      }

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        if (mobileTradeContainerRef.current) {
          mobileTradeContainerRef.current.style.paddingRight = '';
        }
        if (backdropRef.current) {
          backdropRef.current.style.paddingRight = '';
        }
        window.scrollTo(0, scrollY);
      };
    }
  }, [isScreen1024, isMobileTradeOpen]);

  useEffect(() => {
    const now = new Date();
    let dateToSet: Date | null = null;

    switch (days) {
      case '30':
        dateToSet = new Date(now.setDate(now.getDate() - 30));
        break;
      case '90':
        dateToSet = new Date(now.setDate(now.getDate() - 90));
        break;
      case '180':
        dateToSet = new Date(now.setDate(now.getDate() - 180));
        break;
      case 'all':
      default:
        setStartTimestamp('total');
        return;
    }

    if (dateToSet) {
      let isoString = dateToSet.toISOString();
      isoString = isoString.replace(/(\.\d{3})Z$/, '$1000Z');
      setStartTimestamp(isoString);
    } else {
      setStartTimestamp('total');
    }
  }, [days]);

  const handleGlvTokenSelected = (token: any) => {
    if (token?.glvToken) {
      const glvInfo = glvListData?.find((item: any) => item?.glvToken === token?.glvToken);

      if (glvInfo) {
        const glvDetailData = {
          ...glvInfo,
          operationType: 'buy',
        };
        setPoolInfo(glvDetailData);
        setPoolType('GLV');
        setLinkInfo({
          poolType: 'GLV',
          poolAddress: token?.glvToken,
          poolInfo: glvDetailData,
        });

        sessionStorage.setItem(
          'linkInfo',
          JSON.stringify({
            poolType: 'GLV',
            poolAddress: token?.glvToken,
            poolInfo: glvDetailData,
          })
        );
        navigate(getPoolDetailPath('GLV', token.glvToken), { replace: true });
        operationRef.current = 'Buy';
        setOperation('Buy');
      } else {
        console.warn('No corresponding GLV data was found.:', token?.glvToken);
      }
    }
  };

  const handleGlvStatusChange = (status: any) => {
    void status;
  };

  const capUsdByCalc = useMemo(() => new BN(poolInfo?.tvlUsdBnStr || '0')?.add(gmBuyAndSellAbleInfo?.bugUsd || BN_ZERO), [poolInfo, gmBuyAndSellAbleInfo]);
  useEffect(() => {
    sessionStorage.setItem('capUsdByCalc', capUsdByCalc.toString());
  }, [capUsdByCalc]);
  // init glvPriceMap
  const lastGlvPriceVersionRef = useRef<string>('');
  useEffect(() => {
    if (!glvTokenMetadatas || !glvs) {
      return;
    }
    const glvPriceBNMap: Map<string, BN> = new Map();
    Object.entries(glvs).forEach(([key, info]) => {
      let sumGmBalance = new BN(0);
      let sumGmBalanceUsd = new BN(0);
      info?.markets.forEach((market) => {
        const marketToken = market?.marketTokenAddress?.toBase58?.();
        if (!marketToken) return;
        const gmBalance = market?.gmBalance || BN_ZERO;
        const marketInfo = marketInfosMap?.get(marketToken);
        if (!marketInfo) {
          return;
        }
        const marketPriceStr: string = marketInfo?.marketPrice ?? '0';
        const marketPriceBN = new BN(marketPriceStr || '0');
        const gmBalanceUsd = new BN(marketInfo?.marketDecimals || 0)?.gt(BN_ZERO) ? gmBalance
          .mul(marketPriceBN)
          ?.div(new BN(10).pow(new BN(marketInfo?.marketDecimals || 0))) : new BN(0);
        sumGmBalance = sumGmBalance.add(market?.gmBalance || BN_ZERO);
        sumGmBalanceUsd = sumGmBalanceUsd.add(gmBalanceUsd);
      });
      const glvPriceBN = glvTokenMetadatas[key]?.totalSupply?.gt(new BN(0))
        ? sumGmBalanceUsd?.div(glvTokenMetadatas[key]?.totalSupply)
        : new BN(0);
      glvPriceBNMap.set(key, glvPriceBN);
    });
    const entries = Array.from(glvPriceBNMap.entries())
      .map(([k, v]) => `${k}:${v?.toString?.() || String(v)}`)
      .sort();
    const version = entries.join('|');
    if (lastGlvPriceVersionRef.current !== version) {
      setGlvPriceMap(glvPriceBNMap);
      lastGlvPriceVersionRef.current = version;
    }
  }, [glvs, marketInfosMap]);

  useEffect(() => {
    if (poolType !== 'GM') {
      return;
    }
    if (poolInfo) {
      const marketPriceBN = new BN(poolInfo?.marketPrice || '0');
      const decimalsPow = new BN(10).pow(new BN(poolInfo?.marketDecimals || '0'));
      const longUnitPrice = tokenPriceMap[poolInfo?.longToken]?.unitPrice || '0';
      const shortUnitPrice = tokenPriceMap[poolInfo?.shortToken]?.unitPrice || '0';
      const longBuyUsd = new BN(poolInfo?.longDepositCapacityAmount || '0').mul(
        new BN(longUnitPrice)
      );
      const shortBuyUsd = new BN(poolInfo?.shortDepositCapacityAmount || '0').mul(
        new BN(shortUnitPrice)
      );
      const bugUsd = longBuyUsd.add(shortBuyUsd);
      const buyAmount = marketPriceBN.gt(new BN(0))
        ? bugUsd.mul(decimalsPow).div(marketPriceBN)
        : new BN(0);
      const gmSellableAmountUsd = new BN(poolInfo?.maxLongSellableUsd || '0').add(
        new BN(poolInfo?.maxShortSellableUsd || '0')
      );
      const supply = new BN(poolInfo?.supply?.toString() || '0');
      let gmSellableAmount = new BN(0);
      if (marketPriceBN.gt(new BN(0))) {
        const calculatedGmSellableAmount = gmSellableAmountUsd.div(marketPriceBN).mul(decimalsPow);
        gmSellableAmount = calculatedGmSellableAmount.gt(supply)
          ? supply.div(decimalsPow)
          : gmSellableAmountUsd.div(marketPriceBN);
      }
      const longPrice = tokenPriceMap[poolInfo?.longToken]?.price || '0';
      const shortPrice = tokenPriceMap[poolInfo?.shortToken]?.price || '0';
      const longAmountUsd = new BN(poolInfo?.longTokenAmount || '0')
        .mul(new BN(longPrice))
        .div(new BN(10).pow(new BN(20)));
      const shortAmountUsd = new BN(poolInfo?.shortTokenAmount || '0')
        .mul(new BN(shortPrice))
        .div(new BN(10).pow(new BN(20)));
      sessionStorage.setItem('gmSellableAmountUsd', gmSellableAmountUsd.toString());
      setGmBuyAndSellAbleInfo({
        bugUsd,
        buyAmount,
        shortAmountUsd,
        longAmountUsd,
        gmSellableAmount: gmSellableAmount?.toString() || '0',
        gmSellableAmountUsd,
      });
    }
  }, [poolInfo, tokenPriceMap]);

  useEffect(() => {
    void getAnnData(days).then((data) => {
      setAnnMap(new Map(data.map((item) => [item.tokenAddress, item])));
    });
    // get apy data
    void getApyData(days).then((data) => {
      setApyMap(new Map(data.map((item) => [item.tokenAddress, item])));
    });
  }, [days]);

  useEffect(() => {
    let cancelled = false;
    const tokenAddress = poolInfo?.marketToken;
    if (!tokenAddress) {
      setGlvGmPrices(null);
      setIsPriceChartLoading(false);
      return;
    }

    setGlvGmPrices(null);
    setIsPriceChartLoading(true);

    void (async () => {
      try {
        const res = await getGmGlvPrice(tokenAddress, days, poolType);
        if (!cancelled) {
          setGlvGmPrices(res);
        }
      } catch (error) {
        if (!cancelled) {
          setGlvGmPrices(null);
        }
        console.warn('Failed to fetch pool price chart data:', error);
      } finally {
        if (!cancelled) {
          setIsPriceChartLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [days, poolInfo?.marketToken, poolType]);

  const availableOperations = useMemo(() => {
    if (poolType !== 'GM') {
      return ['Buy', 'Sell'];
    }

    const hasShiftableGM = allMarketInfos?.some((item: any) =>
      item?.longToken === poolInfo?.longToken &&
      item?.shortToken === poolInfo?.shortToken &&
      item?.marketToken !== poolInfo?.marketToken
    );

    return hasShiftableGM ? ['Buy', 'Sell', 'Shift'] : ['Buy', 'Sell'];
  }, [poolType, allMarketInfos, poolInfo?.longToken, poolInfo?.shortToken, poolInfo?.marketToken]);

  const poolDetailLabels = useLocalizedMap(POOL_DETAIL_LABELS);
  const localizedOperationLabels = useMemo(() => {
    if (poolType === 'GLV') {
      return {
        Buy: poolDetailLabels.BuyGlv,
        Sell: poolDetailLabels.SellGlv,
      };
    } else {
      return {
        Buy: poolDetailLabels.BuyGm,
        Sell: poolDetailLabels.SellGm,
        Shift: poolDetailLabels.ShiftGm,
      };
    }
  }, [poolDetailLabels, poolType]);

  const localizedModeLabels = useMemo(() => ({
    Single: poolDetailLabels.Single,
    Pair: poolDetailLabels.Pair,
  }), [poolDetailLabels]);
  const localizedTabLabels = useMemo(() => ({
    'Accrued Fee': (
      <span className="inline-flex items-center">
        {t`Accrued Fee`}
        <span className="pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <TooltipWithPortal
            className="TradeFeesRow-tooltip"
            style={{ marginTop: '-0.4rem' }}
            handle={
              <img
                src={InfoSvg}
                alt=""
                className="typeOptions-setting-info positive"
                style={{ marginLeft: '0.6rem' }}
              />
            }
            position="bottom"
            renderContent={() => (
              <p>
                {poolType === 'GLV' ? (
                  <Trans>Accrued Fee is the vault revenue distributed to LPs, sourced from fees earned by supplying liquidity across underlying GMTrade markets. It consists of order fees, liquidation fees, borrowing fees, swap fees, and buy/sell fees.</Trans>
                ) : (
                  <Trans>Accrued Fee is the pool revenue distributed to LPs, consisting of order fees, liquidation fees, borrowing fees, swap fees, and buy/sell fees.</Trans>
                )}
              </p>
            )}
          />
        </span>
      </span>
    ),
    'Price': t`Price`,
    'Fee APR': t`Fee APR`,
  }), [poolType]);

  const chartData = useMemo(() => {
    const entry = poolType === 'GM' ? marketDailyStats?.get(poolInfo?.marketToken) : glvDailyFeesMap?.get(poolInfo?.marketToken);
    const list = entry?.lineCharts;
    const apyEntry = apyMap?.get(poolInfo?.marketToken);
    const apyList = apyEntry?.lineCharts;
    const feeAprList = isPoolNewEnabled ? feeAprChartData : apyList;
    const data = generateChartData(
      selectedTab === 'Price'
        ? glvGmPrices
        : selectedTab === 'Accrued Fee'
          ? list
          : feeAprList,
      poolType,
      selectedTab,
      poolInfo?.marketDecimals,
      poolInfo?.decimals
    );
    if (selectedTab === 'Fee APR') {
      return data.map(item => ({
        ...item,
        displayValue: Math.min(item.value, 10000),
      }));
    }
    return data.map(item => ({ ...item, displayValue: item.value }));
  }, [marketDailyStats, glvDailyFeesMap, poolInfo, poolType, selectedTab, glvGmPrices, feeAprChartData, apyMap, isPoolNewEnabled]);

  const selectedRangeKey = days === 'all' ? 'all' : days;
  const feeAprFromRange = detailAprMap?.get(selectedRangeKey as '30' | '90' | '180' | 'all');
  const feeAprFromLegacy =
    apyMap?.get(poolInfo?.marketToken)?.lineCharts?.at(-1)?.ydata * 10000;
  const latestFeeAprValue = isPoolNewEnabled
    ? feeAprFromRange === null || feeAprFromRange === undefined
      ? null
      : feeAprFromRange * 10000
    : feeAprFromLegacy;

  const getMeaningfulDecimals = (num: number) => {
    const s = Number(num).toFixed(3);
    const fraction = s.split('.')[1] || "";
    return fraction.replace(/0+$/, "").length;
  };

  const getNiceStep = (rawStep: number) => {
    if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;

    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;

    let niceNormalized;
    if (normalized <= 1) niceNormalized = 1;
    else if (normalized <= 2) niceNormalized = 2;
    else if (normalized <= 2.5) niceNormalized = 2.5;
    else if (normalized <= 5) niceNormalized = 5;
    else niceNormalized = 10;

    return niceNormalized * magnitude;
  };

  const getMaxTickDecimals = (ticks: number[]) => {
    return Math.min(
      ticks.reduce((max, tick) => Math.max(max, getMeaningfulDecimals(tick)), 0),
      3
    );
  };

  const yAxisConfig = useMemo(() => {
    const needsAutoScale = selectedTab === "Price" || selectedTab === "Accrued Fee";

    if (!needsAutoScale || !chartData.length) {
      return {
        ticks: undefined as number[] | undefined,
        domain: ["auto", "auto"] as [number | string, number | string],
        decimals: 0,
      };
    }

    const values = chartData
      .map((item) => item.value)
      .filter((v) => Number.isFinite(v));

    if (!values.length) {
      return {
        ticks: undefined,
        domain: ["auto", "auto"] as [number | string, number | string],
        decimals: 0,
      };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (min === max) {
      const single = Number(min.toFixed(3));
      return {
        ticks: [single],
        domain: [single, single] as [number, number],
        decimals: Math.min(getMeaningfulDecimals(single), 3),
      };
    }

    const tickCount = 5;
    const range = max - min;
    const rawStep = range / (tickCount - 1);
    const step = getNiceStep(rawStep);

    let domainMin: number;
    if (min > 0 && min < step) {
      const smallerStep = Math.pow(10, Math.floor(Math.log10(Math.max(min, 1))));
      domainMin = Math.floor(min / smallerStep) * smallerStep;
    } else {
      domainMin = Math.floor(min / step) * step;
    }
    const domainMax = Math.ceil(max / step) * step;

    const actualStep = (domainMax - domainMin) / (tickCount - 1);

    const ticks: number[] = [];
    for (let v = domainMin; v <= domainMax + actualStep / 2; v += actualStep) {
      ticks.push(Number(v.toFixed(6)));
    }

    // For Price tab: if 3 decimal places can't distinguish adjacent ticks, auto-increase precision
    let decimals = getMaxTickDecimals(ticks);
    if (selectedTab === 'Price') {
      // Find minimum decimals where all ticks are distinct
      for (let d = decimals; d <= 8; d++) {
        const rounded = ticks.map(t => Number(t.toFixed(d)));
        const unique = new Set(rounded).size;
        if (unique === ticks.length) {
          decimals = d;
          break;
        }
        decimals = d + 1;
      }
    }

    return {
      ticks,
      domain: [domainMin, domainMax] as [number, number],
      decimals,
    };
  }, [selectedTab, chartData]);

  const xAxisInterval = useMemo(() => {
    if (chartData.length === 0) return 0;
    let tickCount;
    switch (days) {
      case '30':
        tickCount = 9;
        break;
      case '90':
        tickCount = 9;
        break;
      case '180':
        tickCount = 9;
        break;
      case 'all':
        tickCount = 9;
        break;
      default:
        tickCount = 9;
    }
    return Math.floor((chartData.length - 1) / (tickCount - 1));
  }, [chartData.length, days]);

  const chartDataRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 0 };
    const values = chartData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    return { min: minValue, max: maxValue };
  }, [chartData]);

  const gradientId = useMemo(
    () =>
      `areaFill-${poolInfo?.marketToken || poolInfo?.glvToken || 'default'}`,
    [poolInfo?.marketToken, poolInfo?.glvToken]
  );

  const lineColor = useMemo(() => {
    return '#FA7B4E';
  }, [selectedTab, annMap, poolInfo?.marketToken]);

  const [LongTokenName = '', ShortTokenName = ''] = poolInfo?.name?.split('-') ?? [];
  const LongColor = TOKEN_COLOR_MAP[LongTokenName];
  const ShortColor = TOKEN_COLOR_MAP[ShortTokenName] || LongColor;
  const currentPriceValue = useMemo(() => {
    if (poolType === 'GM') {
      return formatUsd(new BN(poolInfo?.marketPrice), {
        displayDecimals: 5,
      });
    }
    return `$${formatAmount(
      new BN(poolInfo?.glvPriceBN?.toString() || '0'),
      20 - (poolInfo?.decimals ?? 0),
      5
    )}`;
  }, [poolType, poolInfo?.marketPrice, poolInfo?.glvPriceBN, poolInfo?.decimals]);

  const glvMetadata = glvTokenMetadatas[poolInfo?.glvToken || ''];
  const gmMarketInfo = marketInfosMap?.get(poolInfo?.marketToken);
  const isPoolReady = !isGmw291Enabled || (poolType === 'GM'
    ? hasPositiveBnValue(poolInfo?.marketPrice)
    : hasPositiveBnValue(poolInfo?.glvPriceBN));
  const isTvlReady = !isGmw291Enabled || (poolType === 'GM'
    ? Boolean(
      poolInfo?.tvlUsd != null &&
      gmMarketInfo?.marketDecimals != null &&
      hasPositiveBnValue(gmMarketInfo?.supply) &&
      hasPositiveBnValue(gmMarketInfo?.marketPrice)
    )
    : Boolean(
      poolInfo?.tvlUsd != null &&
      glvMetadata?.totalSupply != null &&
      glvMetadata?.decimals != null &&
      hasPositiveBnValue(poolInfo?.tvlUsdBn || poolInfo?.tvlUsdBnStr)
    ));
  const isWalletReady = !isGmw291Enabled ||
    !connected ||
    (isPoolReady && balanceMap.size > 0 && (poolType === 'GM'
      ? poolInfo?.marketDecimals != null
      : glvMetadata?.decimals != null));

  const [isChartLoading, setIsChartLoading] = useState(isAccruedLoading)

  useEffect(() => {
    const _isChartLoading = isGmw291Enabled && (
      selectedTab === 'Accrued Fee'
        ? isAccruedLoading
        : selectedTab === 'Fee APR'
          ? isFeeAprChartLoading || !isDetailSquidReady
          : isPriceChartLoading
    );
    console.log('isFeeAprChartLoading:', isFeeAprChartLoading, 'isDetailSquidReady:', isDetailSquidReady);

    setIsChartLoading(_isChartLoading)
  }, [isGmw291Enabled, selectedTab, isFeeAprChartLoading, isPriceChartLoading, isAccruedLoading, isDetailSquidReady])

  return (
    <>
      <div className="glv-detail-container">
        {!isMobile && <div className="pool-header">
          <div className="pool-info">
            {
              poolType === 'GLV' &&
              <div className="pool-icon">
                <img
                  src={getIconUrlPath('GLV', 40)}
                  alt={poolType}
                  className="token-icon"
                />
              </div>
            }

            {
              poolType === 'GM' &&
              <div style={{ position: 'relative' }}>
                <div className="pool-icon">
                  <img
                    src={getIconUrlPath(poolInfo?.poolName, 40)}
                    alt={poolType}
                    className="token-icon"
                  />
                </div>
                <div className="ls-img">
                  <img
                    src={getIconUrlPath(
                      GMX_SOLANA_TOKENS_RAW[poolInfo?.longToken]?.symbol === "WGMX" ? "GMX" : GMX_SOLANA_TOKENS_RAW[poolInfo?.longToken]?.symbol,
                      24
                    )}
                    alt={poolType}
                    width={18}
                  />
                  <img
                    src={getIconUrlPath(
                      GMX_SOLANA_TOKENS_RAW[poolInfo?.shortToken]?.symbol,
                      24
                    )}
                    alt={poolType}
                    width={18}
                  />
                </div>
              </div>

            }

            <div className="pool-title">
              {isPoolReady ? (
                <>
                  <h2 className="pool-name">
                    {poolType === 'GM'
                      ? `${formatMarketName(poolInfo?.indexToken)}`
                      : getGlvDisplayNameByTokenAddress(poolInfo?.glvToken)}
                  </h2>
                  <div className="pool-subtitle">
                    {poolType === 'GM' && (
                      <>
                        <p>[{poolInfo?.name}]</p>
                      </>
                    )}
                    {poolType === 'GLV' && `[${poolInfo?.name}]`}
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <CellSkeleton width={120} height={20} />
                  <CellSkeleton width={80} height={14} />
                </div>
              )}
            </div>
          </div>
          <div className="pool-stats">
            <div className="stat-item">
              <div className="stat-label">
                <Trans>Price</Trans>
              </div>
              <div className="stat-value">
                {isPoolReady ? currentPriceValue : <CellSkeleton width={70} height={18} />}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">
                <Trans>TVL (Supply)</Trans>
              </div>
              {!isTvlReady && <div className="stat-value"><CellSkeleton width={120} height={18} /></div>}
              {
                isTvlReady && poolType === 'GLV' &&
                <div className="stat-value">
                  <span style={{ color: '#fff', fontWeight: 400, fontSize: '1.6rem' }}>
                    ${poolInfo?.tvlUsd}
                  </span>
                  &nbsp;&nbsp;
                  <span style={{ color: '#A3A3A3' }}>
                    {'('}{formatToKMBWithoutUsd(new BN(glvMetadata?.totalSupply || 0), glvMetadata?.decimals || 0)} GLV{')'}
                  </span>
                </div>
              }
              {
                isTvlReady && poolType === 'GM' &&
                <div className="stat-label">
                  <span style={{ color: '#fff', fontWeight: 400, fontSize: '1.6rem' }}>
                    {/* {formatUsdToKMB(
                      new BN(marketInfosMap?.get(poolInfo?.marketToken)?.marketDecimals || 0)?.gt(BN_ZERO) ? new BN(marketInfosMap?.get(poolInfo?.marketToken)?.supply || 0)
                        .mul(new BN(marketInfosMap?.get(poolInfo?.marketToken)?.marketPrice || 0))
                        ?.div(new BN(10).pow(new BN(marketInfosMap?.get(poolInfo?.marketToken)?.marketDecimals || 0))) : new BN(0)
                    )} */}
                    {poolInfo?.tvlUsd}
                  </span>
                  &nbsp;&nbsp;
                  <span className='stat-value'>
                    ({formatToKMBWithoutUsd(new BN(gmMarketInfo?.supply || 0), gmMarketInfo?.marketDecimals || 0)} GM)
                  </span>
                </div>
              }

            </div>
            <div className="stat-item">
              <div className="stat-label">
                <Trans>Wallet</Trans>
              </div>
              <div className="stat-value">
                {!isWalletReady ? (
                  <CellSkeleton width={90} height={18} />
                ) : (
                  <>
                    {
                      !poolInfo?.glvToken ?
                        formatUsdToKMB(
                          new BN(poolInfo?.marketDecimals)?.gt(BN_ZERO) ? new BN(balanceMap?.get(poolInfo?.marketToken) || 0)?.mul(new BN(poolInfo?.marketPrice))?.div(new BN(10 ** poolInfo?.marketDecimals)) : BN_ZERO
                        ) : formatUsdToKMB(
                          new BN(balanceMap?.get(poolInfo?.glvToken || '') || 0)?.mul(new BN(poolInfo?.glvPriceBN?.toString()))
                        )
                    }
                    &nbsp;&nbsp;
                    <>
                      {
                        !poolInfo?.glvToken && formatAmount(
                          new BN(balanceMap?.get(poolInfo?.marketToken) || 0),
                          poolInfo?.marketDecimals,
                          2
                        ) === '0.00' && <span style={{ color: '#A3A3A3' }}>(0.00 GM)</span>
                      }
                      {
                        poolInfo?.glvToken && formatAmount(
                          new BN(balanceMap?.get(poolInfo?.glvToken) || 0),
                          poolInfo?.decimals,
                          2
                        ) === '0.00' && <span style={{ color: '#A3A3A3' }}>(0.00 GLV)</span>
                      }
                      {
                        ((!poolInfo?.glvToken && formatAmount(
                          new BN(balanceMap?.get(poolInfo?.marketToken) || 0),
                          poolInfo?.marketDecimals,
                          2
                        ) !== '0.00') || (
                            poolInfo?.glvToken && formatAmount(
                              new BN(balanceMap?.get(poolInfo?.glvToken) || 0),
                              poolInfo?.decimals,
                              2
                            ) !== '0.00'
                          )) && <TooltipWithPortal
                          className="TradeFeesRow-tooltip"
                          handle={
                            <span className="stat-sub">
                              {!poolInfo?.glvToken ? (
                                <>
                                  {' '}(
                                  {formatAmount(
                                    new BN(balanceMap?.get(poolInfo?.marketToken) || 0),
                                    poolInfo?.marketDecimals,
                                    2
                                  )}{' '}
                                  GM)
                                </>
                              ) : (
                                <>
                                  {' '}
                                  ({formatAmount(
                                    new BN(balanceMap?.get(poolInfo?.glvToken) || 0),
                                    poolInfo?.decimals,
                                    2
                                  )}{' '}
                                  GLV)
                                </>
                              )}
                            </span>
                          }
                          position="bottom-end"
                          renderContent={() => (
                            <div className="gmWalletTooltip">
                              <p>
                                <span><Trans>Total Earned Fees</Trans>:</span>
                                <span className="value text-green-500">
                                  {formatUsd(
                                    !poolInfo?.glvToken ? userEarnings?.byMarketAddress?.[poolInfo?.marketToken]?.total : userEarnings?.byGlvAddress?.[poolInfo?.glvToken || '']?.total,
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
                                    !poolInfo?.glvToken ? userEarnings?.byMarketAddress?.[poolInfo?.marketToken]?.recent7d : userEarnings?.byGlvAddress?.[poolInfo?.glvToken || '']?.recent7d,
                                    {
                                      displayDecimals: 4,
                                      showPlusForZero: false,
                                      signed: false,
                                    }
                                  )}
                                </span>
                              </p>
                              <p className="description">
                                {
                                  poolType === "GLV" ? <>
                                    <Trans>Earned Fees shows the fees earned from your GLV. Fee values are calculated when earned and exclude incentives.</Trans>
                                    <br />
                                    <br />
                                    <Trans>Your actual return is reflected in changes in the GLV token price.</Trans>
                                  </> :
                                    <>
                                      <Trans>Earned Fees shows the fees earned from your GM. Fee values are calculated when earned and exclude incentives.</Trans>
                                      <br />
                                      <br />
                                      <Trans>Your actual return is reflected in changes in the GM token price.</Trans>
                                    </>
                                }

                              </p>
                            </div>
                          )}
                        />
                      }

                    </>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>}
        {isMobile && (
          <div className="pool-header-mobile">
            <div className="pool-header-mobile-top">
              <div className="pool-header-mobile-return">
                <HeaderLeft isShowSign={false} />
              </div>
              <div className="pool-header-mobile-info">
                <div className="pool-icon">
                  <img
                    src={
                      poolType === 'GLV'
                        ? getIconUrlPath('GLV', 40)
                        : getIconUrlPath(poolInfo?.poolName, 40)
                    }
                    alt={poolType}
                    style={{ width: '4rem', height: '4rem' }}
                    className="token-icon"
                  />
                </div>
                <div className="pool-title">
                  {isPoolReady ? (
                    <>
                      <h2 className="pool-name">
                        {poolType === 'GM'
                          ? `${formatMarketName(poolInfo?.indexToken)}`
                          : getGlvDisplayNameByTokenAddress(poolInfo?.glvToken)}
                      </h2>
                      <div className="pool-subtitle">
                        {poolType === 'GM' && `[${poolInfo?.name}]`}
                        {poolType === 'GLV' && `[${poolInfo?.name}]`}
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <CellSkeleton width={110} height={18} />
                      <CellSkeleton width={70} height={12} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pool-header-mobile-stats">
              <div className="stat-item">
                <span className="stat-label">
                  <Trans>Price</Trans>
                </span>
                <span className="stat-value">{isPoolReady ? currentPriceValue : <CellSkeleton width={60} height={16} />}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">
                  <Trans>TVL (Supply)</Trans>
                </span>
                <span className="stat-value">
                  {!isTvlReady && <CellSkeleton width={110} height={16} />}
                  {isTvlReady && poolType === 'GLV' && (
                    <>
                      ${poolInfo?.tvlUsd}
                      <span className="stat-sub">
                        {' '}({formatToKMBWithoutUsd(
                          new BN(
                            glvMetadata?.totalSupply || 0
                          ),
                          glvMetadata?.decimals || 0
                        )}{' '}
                        GLV)
                      </span>
                    </>
                  )}
                  {isTvlReady && poolType === 'GM' && (
                    <>
                      {formatUsdToKMB(
                        new BN(
                          gmMarketInfo?.supply || 0
                        )
                          .mul(
                            new BN(
                              gmMarketInfo?.marketPrice || 0
                            )
                          )
                          ?.div(
                            new BN(10).pow(
                              new BN(
                                gmMarketInfo?.marketDecimals || 0
                              )
                            )
                          )
                      )}
                      <span className="stat-sub">
                        ({formatToKMBWithoutUsd(
                          new BN(
                            gmMarketInfo?.supply || 0
                          ),
                          gmMarketInfo?.marketDecimals || 0
                        )}{' '}
                        GM)
                      </span>
                    </>
                  )}
                </span>
              </div>

              <div className="stat-item">
                <span className="stat-label">
                  <Trans>Wallet</Trans>
                </span>
                <span className="stat-value">
                  {!isWalletReady ? (
                    <CellSkeleton width={80} height={16} />
                  ) : (
                    <>
                      {!poolInfo?.glvToken
                        ? formatUsdToKMB(
                          new BN(poolInfo?.marketDecimals)?.gt(BN_ZERO) ? new BN(balanceMap?.get(poolInfo?.marketToken) || 0)
                            ?.mul(new BN(poolInfo?.marketPrice))
                            ?.div(new BN(10 ** poolInfo?.marketDecimals)) : BN_ZERO
                        )
                        : formatUsdToKMB(
                          new BN(balanceMap?.get(poolInfo?.glvToken || '') || 0)?.mul(
                            new BN(poolInfo?.glvPriceBN?.toString())
                          )
                        )}
                      {
                        !poolInfo?.glvToken && formatAmount(
                          new BN(balanceMap?.get(poolInfo?.marketToken) || 0),
                          poolInfo?.marketDecimals,
                          2
                        ) === '0.00' && <span style={{ color: '#A3A3A3' }}>(0.00 GM)</span>
                      }
                      {
                        poolInfo?.glvToken && formatAmount(
                          new BN(balanceMap?.get(poolInfo?.glvToken) || 0),
                          poolInfo?.decimals,
                          2
                        ) === '0.00' && <span style={{ color: '#A3A3A3' }}>(0.00 GLV)</span>
                      }
                      {
                        ((!poolInfo?.glvToken && formatAmount(
                          new BN(balanceMap?.get(poolInfo?.marketToken) || 0),
                          poolInfo?.marketDecimals,
                          2
                        ) !== '0.00') || (
                            poolInfo?.glvToken && formatAmount(
                              new BN(balanceMap?.get(poolInfo?.glvToken) || 0),
                              poolInfo?.decimals,
                              2
                            ) !== '0.00'
                          )) && <TooltipWithPortal
                          className="TradeFeesRow-tooltip"
                          handle={
                            <span className="stat-sub">
                              {!poolInfo?.glvToken ? (
                                <>
                                  {' '}(
                                  {formatAmount(
                                    new BN(balanceMap?.get(poolInfo?.marketToken) || 0),
                                    poolInfo?.marketDecimals,
                                    2
                                  )}{' '}
                                  GM)
                                </>
                              ) : (
                                <>
                                  {' '}
                                  ({formatAmount(
                                    new BN(balanceMap?.get(poolInfo?.glvToken) || 0),
                                    poolInfo?.decimals,
                                    2
                                  )}{' '}
                                  GLV)
                                </>
                              )}
                            </span>
                          }
                          position="bottom-end"
                          renderContent={() => (
                            <div className="gmWalletTooltip">
                              <p>
                                <span><Trans>Total Earned Fees</Trans>:</span>
                                <span className="value text-green-500">
                                  {formatUsd(
                                    !poolInfo?.glvToken ? userEarnings?.byMarketAddress?.[poolInfo?.marketToken]?.total : userEarnings?.byGlvAddress?.[poolInfo?.glvToken || '']?.total,
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
                                    !poolInfo?.glvToken ? userEarnings?.byMarketAddress?.[poolInfo?.marketToken]?.recent7d : userEarnings?.byGlvAddress?.[poolInfo?.glvToken || '']?.recent7d,
                                    {
                                      displayDecimals: 4,
                                      showPlusForZero: false,
                                      signed: false,
                                    }
                                  )}
                                </span>
                              </p>
                              <p className="description">
                                {
                                  poolType === "GLV" ? <>
                                    <Trans>Earned Fees shows the fees earned from your GLV. Fee values are calculated when earned and exclude incentives.</Trans>
                                    <br />
                                    <br />
                                    <Trans>Your actual return is reflected in changes in the GLV token price.</Trans>
                                  </> : <>
                                    <Trans>Earned Fees shows the fees earned from your GM. Fee values are calculated when earned and exclude incentives.</Trans>
                                    <br />
                                    <br />
                                    <Trans>Your actual return is reflected in changes in the GM token price.</Trans></>
                                }

                              </p>
                            </div>
                          )}
                        />
                      }
                    </>
                  )}

                </span>
              </div>
            </div>
          </div>
        )}

        <div className="glv-detail-layout">
          <div className="glv-detail-left">
            <div className="performance-section">
              <div className="performance-tabs">
                <Tab
                  options={['Accrued Fee', 'Fee APR', 'Price']}
                  optionLabels={localizedTabLabels}
                  option={selectedTab}
                  onChange={(tab: string) => {
                    setSelectedTab(tab as TabType);
                    setChartAnimationDuration(400);
                  }}
                  type="inline"
                  className="detail-tabs"
                />
              </div>
              <div className="performance-header">
                {selectedTab === 'Accrued Fee' && (
                  <div className="performance-info">
                    {/* <div className={`performance-value ${annMap?.get(poolInfo?.marketToken)?.annualized * 10000 > 0 ? 'text-green-500' : 'text-red-500'}`}> */}
                    <div className={`performance-value text-green-500`}>
                      {isGmw291Enabled && isAccruedLoading ? (
                        <CellSkeleton width={90} height={24} />
                      ) : poolType === 'GM' ? formatUsdToKMB(
                        new BN(marketDailyStats?.get(poolInfo?.marketToken)?.annualized || '0'),
                      ) : formatUsdToKMB(
                        new BN(glvDailyFeesMap?.get(poolInfo?.marketToken)?.annualized || '0'),
                      )
                      }
                    </div>
                  </div>
                )}

                {selectedTab === 'Fee APR' && (
                  <div className="performance-info">
                    <div
                      className={`performance-value ${latestFeeAprValue === null || latestFeeAprValue === undefined
                        ? ''
                        : latestFeeAprValue > 0
                          ? 'text-green-500'
                          : 'text-red-500'
                        }`}
                    >
                      {isGmw291Enabled && (isFeeAprChartLoading || !isDetailSquidReady)
                        ? <CellSkeleton width={70} height={24} />
                        : latestFeeAprValue === null || latestFeeAprValue === undefined
                          ? '-'
                          : formatPercentageReg(latestFeeAprValue)}
                    </div>
                    {/* <div className="performance-label">
                      <Trans>Fee APY</Trans>
                    </div> */}
                  </div>
                )}

                {selectedTab === 'Price' && (
                  <div className="performance-info">
                    <div className="performance-value positive">
                      {isPoolReady ? currentPriceValue : <CellSkeleton width={90} height={24} />}
                    </div>
                    <div className="performance-label">
                      <Trans>Current Price</Trans>
                    </div>
                  </div>
                )}
                {!isMobile && <div className="time-range-selector">
                  <button
                    className={`time-btn ${days === '30' ? 'active' : ''}`}
                    onClick={() => {
                      setDays('30');
                      setChartAnimationDuration(400);
                    }}
                  >
                    30d
                  </button>
                  <button
                    className={`time-btn ${days === '90' ? 'active' : ''}`}
                    onClick={() => {
                      setDays('90');
                      setChartAnimationDuration(400);
                    }}
                  >
                    90d
                  </button>
                  <button
                    className={`time-btn ${days === '180' ? 'active' : ''}`}
                    onClick={() => {
                      setDays('180');
                      setChartAnimationDuration(400);
                    }}
                  >
                    180d
                  </button>
                  <button
                    className={`time-btn ${days === 'all' ? 'active' : ''}`}
                    onClick={() => {
                      setDays('all');
                      setChartAnimationDuration(400);
                    }}
                  >
                    Total
                  </button>
                </div>}
              </div>

              <div className="chart-container">
                {isChartLoading ? (
                  <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LoadingComponent />
                  </div>
                ) : (
                  <ChartMountGuard>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart
                        key={`${poolInfo?.marketToken || poolInfo?.glvToken}`}
                        data={chartData}
                        isAnimationActive={false}
                        margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient
                            id={gradientId}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={lineColor}
                              stopOpacity={0.35}
                            />
                            <stop
                              offset="50%"
                              stopColor={lineColor}
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="100%"
                              stopColor={lineColor}
                              stopOpacity={0.08}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#535353" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#A3A3A3', fontSize: 11, fontWeight: 500 }}
                          axisLine={{ stroke: '#535353' }}
                          interval={xAxisInterval}
                        />
                        <YAxis
                          width={70}
                          tick={{ fill: '#A3A3A3', fontSize: 12, fontWeight: 500 }}
                          axisLine={false}
                          tickLine={false}
                          domain={
                            selectedTab === 'Price' || selectedTab === 'Accrued Fee'
                              ? yAxisConfig.domain
                              : selectedTab === 'Fee APR' && chartDataRange.max > 10000
                                ? [chartDataRange.min < 0 ? chartDataRange.min : 0, 10000]
                                : [chartDataRange.min < 0 ? chartDataRange.min : 0, 'auto']
                          }
                          ticks={selectedTab === 'Price' || selectedTab === 'Accrued Fee' ? yAxisConfig.ticks : undefined}
                          allowDataOverflow={selectedTab === 'Price' || selectedTab === 'Accrued Fee'}
                          tickFormatter={(value) =>
                            selectedTab === 'Price' ? Number(value).toFixed(yAxisConfig.decimals) :
                              selectedTab === 'Accrued Fee' ? `${value < 0 ? '-' : ''}${formatUsdToKMB(new BN(Math.abs(Math.round(Number(value) || 0)))?.mul(new BN(10).pow(new BN(20))), { signed: false, showDollarSign: false, stripTrailingZeros: true })}` :
                                (selectedTab === 'Fee APR' && chartDataRange.max > 10000 && value >= 10000) ? `>10000%` :
                                  `${value}%`
                          }
                        />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const data = payload[0]?.payload;
                            const val = data?.value;
                            const fullDate = data?.fullDate;

                            return (
                              <div style={{
                                backgroundColor: '#323232',
                                borderRadius: '8px',
                                padding: '12px 14px',
                                minWidth: '140px'
                              }}>
                                <div style={{
                                  color: '#A3A3A3',
                                  fontSize: '12px',
                                  fontWeight: 400,
                                  marginBottom: '6px',
                                  lineHeight: '1.4'
                                }}>
                                  {fullDate}
                                </div>
                                <div style={{
                                  color: '#FFFFFF',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  lineHeight: '1.3'
                                }}>
                                  {selectedTab === 'Price' ? `$${val}` : selectedTab === 'Accrued Fee' ? `${formatUsdToKMB(data?.valueBn || new BN(0), { signed: false })}` : `${val}%`}
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="displayValue"
                          stroke="none"
                          fill={`url(#${gradientId})`}
                          fillOpacity={1}
                          baseValue="dataMin"
                          isAnimationActive={false}
                          animationBegin={0}
                          animationDuration={chartAnimationDuration}
                        // animationEasing="ease-out"
                        />
                        <Line
                          type="monotone"
                          dataKey="displayValue"
                          stroke={lineColor}
                          strokeWidth={1}
                          dot={false}
                          isAnimationActive={false}
                          animationBegin={0}
                          animationDuration={chartAnimationDuration}
                        // animationEasing="ease-out"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </ChartMountGuard>
                )}
              </div>
              {isMobile && <div className='performance-footer'>
                <div className="time-range-selector">
                  <button
                    className={`time-btn ${days === '30' ? 'active' : ''}`}
                    onClick={() => {
                      setDays('30');
                      setChartAnimationDuration(400);
                    }}
                  >
                    30d
                  </button>
                  <button
                    className={`time-btn ${days === '90' ? 'active' : ''}`}
                    onClick={() => {
                      setDays('90');
                      setChartAnimationDuration(400);
                    }}
                  >
                    90d
                  </button>
                  <button
                    className={`time-btn ${days === '180' ? 'active' : ''}`}
                    onClick={() => {
                      setDays('180');
                      setChartAnimationDuration(400);
                    }}
                  >
                    180d
                  </button>
                  <button
                    className={`time-btn ${days === 'all' ? 'active' : ''}`}
                    onClick={() => {
                      setDays('all');
                      setChartAnimationDuration(400);
                    }}
                  >
                    Total
                  </button>
                </div>
              </div>}
            </div>

            <ExposureAbout
              poolInfo={poolInfo}
              isPoolReady={isPoolReady}
              isMobile={isMobile}
              marketInfosMap={marketInfosMap}
              poolType={poolType}
              poolAddress={poolAddress}
            />

          </div>

          {!isScreen1024 && (
            <>
              {poolType === 'GLV' && (
                <GlvTradePanel
                  poolInfo={poolInfo}
                  availableOperations={availableOperations}
                  localizedOperationLabels={localizedOperationLabels}
                  operation={operation}
                  operationClassNames={operationClassNames}
                  onOperationChange={handleOperationChange}
                  localizedModeLabels={localizedModeLabels}
                  poolType={poolType}
                  isExecutionDetailsOpen={isExecutionDetailsOpen}
                  isMobileTradeOpen={isMobileTradeOpen}
                  onToggleMobileTrade={() =>
                    setIsMobileTradeOpen(!isMobileTradeOpen)
                  }
                  onToggleExecutionDetails={() =>
                    setIsExecutionDetailsOpen(!isExecutionDetailsOpen)
                  }
                  onGlvStatusChange={handleGlvStatusChange}
                />
              )}
              {poolType === 'GM' && (
                <GmTradePanel
                  poolData={poolInfo}
                  availableOperations={availableOperations}
                  localizedOperationLabels={localizedOperationLabels}
                  operation={operation}
                  operationClassNames={operationClassNames}
                  onOperationChange={handleOperationChange}
                  localizedModeLabels={localizedModeLabels}
                  setDetailPoolInfo={(poolInfo: {}) => {
                    const nextPoolInfo = poolInfo as any;
                    setPoolInfo(nextPoolInfo);

                    if (!nextPoolInfo?.marketToken) {
                      return;
                    }

                    const nextLinkInfo = {
                      poolType: 'GM',
                      poolAddress: nextPoolInfo.marketToken,
                      poolInfo: {
                        ...nextPoolInfo,
                        operationType: toStoredOperationType(operation),
                      },
                    };

                    setLinkInfo(nextLinkInfo);
                    sessionStorage.setItem('linkInfo', JSON.stringify(nextLinkInfo));
                    navigate(getPoolDetailPath('GM', nextPoolInfo.marketToken), { replace: true });
                  }}
                  poolType={poolType}
                  isExecutionDetailsOpen={isExecutionDetailsOpen}
                  isMobileTradeOpen={isMobileTradeOpen}
                  onToggleMobileTrade={() =>
                    setIsMobileTradeOpen(!isMobileTradeOpen)
                  }
                  onToggleExecutionDetails={() =>
                    setIsExecutionDetailsOpen(!isExecutionDetailsOpen)
                  }
                  onGlvTokenSelected={handleGlvTokenSelected}
                />
              )}
            </>
          )}
        </div>

        {isScreen1024 && (
          <div className="pool-footer">
            <div className="footer-buttons">
              {availableOperations.map((op) => (
                <button
                  key={op}
                  className={`footer-button ${operation === op ? 'active' : ''}`}
                  onClick={() => {
                    handleOperationChange(op as OperationType)
                    setIsMobileTradeOpen(true)
                  }
                  }
                >
                  <span className="button-text">
                    {localizedOperationLabels[op]}
                  </span>
                </button>
              ))}
              <button
                className="footer-expand-button"
                onClick={() => setIsMobileTradeOpen(!isMobileTradeOpen)}
              >
                <img
                  src={RightSvg}
                  alt="expand"
                  className={`expand-icon ${isMobileTradeOpen ? 'expanded' : ''}`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Mobile Trade Panel Content - Above glv-detail-container */}
        {isScreen1024 && isMobileTradeOpen && (
          <>
            <div
              ref={backdropRef}
              className="mobile-trade-backdrop"
              onClick={() => setIsMobileTradeOpen(false)}
            />
            {/* Trade Panel Content */}
            <div
              ref={mobileTradeContainerRef}
              className="mobile-trade-content-container"
              onClick={(e) => e.stopPropagation()}
            >
              {poolType === 'GLV' && (
                <GlvTradePanel
                  gmSellableAmountUsd={gmBuyAndSellAbleInfo?.gmSellableAmountUsd || '0'}
                  poolInfo={poolInfo}
                  availableOperations={availableOperations}
                  localizedOperationLabels={localizedOperationLabels}
                  operation={operation}
                  operationClassNames={operationClassNames}
                  onOperationChange={handleOperationChange}
                  localizedModeLabels={localizedModeLabels}
                  poolType={poolType}
                  isExecutionDetailsOpen={isExecutionDetailsOpen}
                  isMobileTradeOpen={isMobileTradeOpen}
                  onToggleMobileTrade={() =>
                    setIsMobileTradeOpen(!isMobileTradeOpen)
                  }
                  onToggleExecutionDetails={() =>
                    setIsExecutionDetailsOpen(!isExecutionDetailsOpen)
                  }
                  onGlvStatusChange={handleGlvStatusChange}
                />
              )}
              {poolType === 'GM' && (
                <GmTradePanel
                  gmSellableAmountUsd={gmBuyAndSellAbleInfo?.gmSellableAmountUsd || '0'}
                  poolData={poolInfo}
                  availableOperations={availableOperations}
                  localizedOperationLabels={localizedOperationLabels}
                  operation={operation}
                  operationClassNames={operationClassNames}
                  onOperationChange={handleOperationChange}
                  localizedModeLabels={localizedModeLabels}
                  setDetailPoolInfo={(poolInfo: {}) => {
                    setPoolInfo(poolInfo)
                  }}
                  poolType={poolType}
                  isExecutionDetailsOpen={isExecutionDetailsOpen}
                  isMobileTradeOpen={isMobileTradeOpen}
                  onToggleMobileTrade={() =>
                    setIsMobileTradeOpen(!isMobileTradeOpen)
                  }
                  onToggleExecutionDetails={() =>
                    setIsExecutionDetailsOpen(!isExecutionDetailsOpen)
                  }
                  onGlvTokenSelected={handleGlvTokenSelected}
                />
              )}
            </div>
          </>
        )}
      </div >
    </>
  );
}
export default GlvDetail;
