import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { useAppStore } from '@/zustand/useAppStore';
import { useGlvMarkets } from './Hooks/useGlvMarkets';
import { useTokenMetadatasForGlv } from './Hooks/useTokenMetadatasForGlv';
import { useTokenMetadatasForGm } from './Hooks/useTokenMetadatasForGm';
import { useTokenPriceMap } from './Hooks/useTokenPriceMap';
import { useMarkets } from './Hooks/useMarkets';
import { getGlvMarketMaxCappedUsd } from '@/utils/glv/getGlvMarketMaxCappedUsd';
import { BN_ZERO } from '@solana/spl-governance';
import { BN } from '@coral-xyz/anchor';
import { USD_DECIMALS } from '@/config/constants';
import { getBalanceMap } from '@/components/Pools/utils/getBalanceMap';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { formatToKMBWithoutUsd, formatUsdToKMB, formatPercentage, formatBNToKMB } from '@/utils/legacy/format';
import { GMX_SOLANA_GLV_TOKENS, GMX_SOLANA_TOKENS_RAW, GMX_SOLANA_MARKET_TOKENS } from '@/config/program';
import { getGlvMintableInfo } from '@/components/Pools/utils/getGlvMintableInfo';
import { usePageVisibility } from '@/components/Pools/Hooks/usePageVisibility';
import useSocketStore from '@/zustand/socketStore';
import { buildGmListData } from '@/components/Pools/utils/buildGmListData';
import { getGmw442Enabled } from '@/config/featureFlagEnable';

interface GlvDataProviderProps {
  children: ReactNode;
}

function getGlvListVersion(list: any[]) {
  const includePerMarketSellable = getGmw442Enabled();
  return list
    .map((it: any) => {
      const base = `${it?.glvToken}:${it?.tvlUsdBn}:${it?.sellableUsd}:${it?.walletUsd}:${it?.walletNum}`;
      if (!includePerMarketSellable) {
        return base;
      }
      const perMarket = (it?.markets || [])
        .map(
          (market: any) =>
            `${market?.marketToken}:${market?.perMarketSellableUsd || '0'}`
        )
        .join(',');
      return `${base}:${perMarket}`;
    })
    .join('|');
}

const GlvDataProvider: React.FC<GlvDataProviderProps> = ({ children }) => {
  const { setGlvListData, setGmListData } = useAppStore((state) => state.pools);
  const { glvs } = useGlvMarkets(GMX_SOLANA_GLV_TOKENS);
  const { marketInfosMap, allMarketInfos, isLoading: isMarketsLoading } = useMarkets();
  const socketIndexTokensReady = useSocketStore((s) => s.socketIndexTokensReady);
  const { tokenMetadatas: gmTokenMetadatas } = useTokenMetadatasForGm(
    GMX_SOLANA_MARKET_TOKENS
  );
  const { tokenMetadatas: glvTokenMetadatas } = useTokenMetadatasForGlv(
    GMX_SOLANA_GLV_TOKENS
  );
  const { tokenPriceMap } = useTokenPriceMap();
  const { balanceMap, connected } = getBalanceMap();

  const [glvList, setGlvList] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('glvListData');
      if (cached) {
        const parsedData = JSON.parse(cached);
        const isSorted = parsedData.every((item: any, idx: number, arr: any[]) => {
          if (idx === 0) return true;
          const current = new BN(item?.tvlUsdBn || 0);
          const prev = new BN(arr[idx - 1]?.tvlUsdBn || 0);
          return prev.gte(current);
        });
        return parsedData;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [glvPriceMap, setGlvPriceMap] = useState<Map<string, BN>>(new Map());
  const [isGlvListSorted, setIsGlvListSorted] = useState(() => {
    try {
      const cached = localStorage.getItem('glvListData');
      if (cached) {
        const parsedData = JSON.parse(cached);
        if (parsedData.length === 0) return false;
        return parsedData.every((item: any, idx: number, arr: any[]) => {
          if (idx === 0) return true;
          const current = new BN(item?.tvlUsdBn || 0);
          const prev = new BN(arr[idx - 1]?.tvlUsdBn || 0);
          return prev.gte(current);
        });
      }
    } catch {
      // ignore
    }
    return false;
  });

  const isPageVisible = usePageVisibility();
  const glvListVersionRef = useRef<string>('');
  const gmListVersionRef = useRef<string>('');
  const lastMarketDataVersionRef = useRef<string>('');

  const marketInfosVersion = React.useMemo(() => {
    if (!isPageVisible || !marketInfosMap) return '0';
    try {
      const includeSellable = getGmw442Enabled();
      const entries = Array.from(marketInfosMap.entries())
        .map(([k, v]: any) => {
          const base = `${k}:${v?.marketPrice ?? ''}:${v?.marketDecimals ?? ''}`;
          if (!includeSellable) {
            return base;
          }
          return `${base}:${v?.maxLongSellableUsd?.toString?.() ?? v?.maxLongSellableUsd ?? ''}:${v?.maxShortSellableUsd?.toString?.() ?? v?.maxShortSellableUsd ?? ''}`;
        })
        .sort();
      return entries.join('|');
    } catch {
      return String((marketInfosMap as any)?.size ?? 0);
    }
  }, [marketInfosMap, isPageVisible]);

  const tokenPriceVersion = React.useMemo(() => {
    if (!isPageVisible) return '0';
    try {
      return String(Object.keys(tokenPriceMap || {}).length);
    } catch {
      return '0';
    }
  }, [tokenPriceMap, isPageVisible]);

  const glvsVersion = React.useMemo(() => {
    if (!isPageVisible) return '0';
    try {
      const includeGmBalance = getGmw442Enabled();
      return Object.entries(glvs || {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, info]: [string, any]) => {
          if (!includeGmBalance) {
            return key;
          }
          const balances = (info?.markets || [])
            .map(
              (market: any) =>
                `${market?.marketTokenAddress?.toBase58?.() || ''}:${market?.gmBalance?.toString?.() || '0'}`
            )
            .sort()
            .join(',');
          return `${key}:${balances}`;
        })
        .join('|');
    } catch {
      return '0';
    }
  }, [glvs, isPageVisible]);

  const wgmxTogmx = (str: string) => {
    return str === 'WGMX' ? 'GMX' : str;
  };

  useEffect(() => {
    if (!socketIndexTokensReady || isMarketsLoading || !allMarketInfos?.length) {
      return;
    }

    const sortedGmList = buildGmListData({
      allMarketInfos,
      glvs,
      marketInfosMap,
      tokenPriceMap,
      balanceMap,
      connected,
    });
    const nextVersion = sortedGmList
      .map(
        (item: any) =>
          `${item?.marketToken}:${item?.tvlUsdBn?.toString?.() || item?.tvlUsdBn}:${item?.markets?.[0]?.capUsdBn?.toString?.() || item?.markets?.[0]?.capUsdBn}:${item?.walletUsd}:${item?.walletNum}`
      )
      .join('|');

    if (gmListVersionRef.current !== nextVersion) {
      setGmListData(sortedGmList);
      localStorage.setItem('gmListData', JSON.stringify(sortedGmList));
      gmListVersionRef.current = nextVersion;
    }
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

  // sort glv list
  useEffect(() => {
    if (!glvTokenMetadatas && !glvs) {
      return;
    }
    const isDependenciesReady = marketInfosMap && marketInfosMap.size > 0 && gmTokenMetadatas && Object.keys(gmTokenMetadatas).length > 0;
    const isGlvPriceMapValid = glvList && glvList.length > 0 && glvList.every((item: any) => {
      const price = glvPriceMap.get(item.glvToken);
      return price && price.gt(BN_ZERO);
    });

    if (!isDependenciesReady && glvList && glvList.length > 0) {
      return;
    }

    const marketDataVersion = `${glvsVersion}|${marketInfosVersion}`;
    const shouldRebuildMarkets =
      getGmw442Enabled() && lastMarketDataVersionRef.current !== marketDataVersion;

    if (isGlvListSorted && isGlvPriceMapValid && isDependenciesReady && !shouldRebuildMarkets) {
      const updatedList = glvList.map((existingItem: any) => {
        const key = existingItem.glvToken;
        const glvPriceBN = glvPriceMap.get(key) || new BN(existingItem.glvPriceBN || 0);
        const walletUsd = balanceMap?.get(key)?.mul(glvPriceBN);
        return {
          ...existingItem,
          walletUsd:
            connected &&
            '$' + formatToKMBWithoutUsd(walletUsd || BN_ZERO, USD_DECIMALS),
          walletNum:
            connected &&
            formatToKMBWithoutUsd(
              balanceMap?.get(key) || BN_ZERO,
              glvTokenMetadatas[key]?.decimals
            ),
          walletUsdBn: walletUsd?.toString() || '0',
          walletNumBn: balanceMap?.get(key)?.toString() || '0',
        };
      });

      const nextVersion = getGlvListVersion(updatedList);

      if ((glvListVersionRef as any)?.current !== nextVersion) {
        setGlvList(updatedList);
        setGlvListData(updatedList);
        localStorage.setItem('glvListData', JSON.stringify(updatedList));
        (glvListVersionRef as any).current = nextVersion;
      }
      return;
    }

    let newGlvList = [];
    const newGlvPriceMap = new Map<string, BN>();
    Object.entries(glvs).forEach(([key, info]) => {
      const longTokenAddress = info?.longTokenAddress.toBase58();
      const shortTokenAddress = info?.shortTokenAddress.toBase58();
      const shiftLastExecutedAt = info?.shiftLastExecutedAt || BN_ZERO;
      let sumGmBalance = new BN(0);
      let sumGmBalanceUsd = new BN(0);
      let sumLongUsd = new BN(0);
      let sumShortUsd = new BN(0);
      let sumSellableUsd = new BN(0);
      const marketsArray = [];

      info?.markets.forEach((market) => {
        const marketToken = market?.marketTokenAddress?.toBase58?.();
        if (!marketToken) return;
        const gmBalance = market?.gmBalance || BN_ZERO;
        const supply = gmTokenMetadatas[marketToken]?.totalSupply || BN_ZERO;
        const poolValueLong =
          marketInfosMap?.get(marketToken)?.poolValueLong || BN_ZERO;
        const poolValueShort =
          marketInfosMap?.get(marketToken)?.poolValueShort || BN_ZERO;
        const longUsd = supply.gt(BN_ZERO)
          ? gmBalance.mul(new BN(poolValueLong)).div(supply)
          : BN_ZERO;
        const shortUsd = supply.gt(BN_ZERO)
          ? gmBalance.mul(new BN(poolValueShort)).div(supply)
          : BN_ZERO;
        const marketInfo = marketInfosMap?.get(marketToken);
        if (!marketInfo) {
          return;
        }
        const capUsd = getGlvMarketMaxCappedUsd(market, {
          ...marketInfo,
        });
        const marketPriceStr: string = marketInfo?.marketPrice ?? '0';
        const marketPriceBN = new BN(marketPriceStr || '0');
        const gmBalanceUsd = gmBalance
          .mul(marketPriceBN)
          ?.div(new BN(10).pow(new BN(marketInfo?.marketDecimals || 0)));
        const marketSellableUsd = new BN(marketInfo?.maxLongSellableUsd || '0').add(
          new BN(marketInfo?.maxShortSellableUsd || '0')
        );
        const perMarketSellableUsd = marketSellableUsd.lt(gmBalanceUsd)
          ? marketSellableUsd
          : gmBalanceUsd;
        const params = {
          // ...marketInfo,
          indexToken: marketInfo?.indexToken,
          closed: marketInfo?.closed,
          marketToken,
          gmBalance,
          marketTokenName:
            GMX_SOLANA_TOKENS_RAW[marketInfo?.indexToken]?.symbol + '/USD',
          tvlUsd: formatBNToKMB(
            convertTokenAmountToUsd(
              gmBalance || BN_ZERO,
              Number(marketInfo?.marketDecimals || 0),
              new BN(marketInfo?.marketPrice || '0')
            )
          ),
          tvlUsdBn: new BN(gmBalance)
            .mul(new BN(marketInfo?.marketPrice || '0'))
            .div(new BN(10).pow(new BN(marketInfo?.marketDecimals || 0))).toString(),
          // cap: formatUsdToKMB(capUsd),
          cap: formatBNToKMB(capUsd),
          capUsdBn: capUsd,
          composition: 0,
          ...(getGmw442Enabled()
            ? { perMarketSellableUsd: perMarketSellableUsd.toString() }
            : {}),
        };
        marketsArray.push(params);
        sumGmBalance = sumGmBalance.add(market?.gmBalance || BN_ZERO);
        sumGmBalanceUsd = sumGmBalanceUsd.add(gmBalanceUsd);
        sumSellableUsd = sumSellableUsd.add(perMarketSellableUsd);
        sumLongUsd = sumLongUsd.add(longUsd);
        sumShortUsd = sumShortUsd.add(shortUsd);
      });
      const markets = marketsArray
        .filter(Boolean)
        .map((item) => {
          return {
            ...item,
            composition: sumGmBalanceUsd?.gt(BN_ZERO)
              ? Number(
                formatPercentage(
                  Number(
                    new BN(item?.tvlUsdBn)
                      .mul(new BN(10).pow(new BN(4)))
                      .div(sumGmBalanceUsd)
                      .toString()
                  ),
                  2,
                  { showPercent: false }
                )
              )
              : 0,
          };
        })
        .sort((a, b) => {
          const aBN = new BN(a?.tvlUsdBn) || BN_ZERO;
          const bBN = new BN(b?.tvlUsdBn) || BN_ZERO;
          return bBN.cmp(aBN);
        });
      const totalUsd = sumLongUsd.add(sumShortUsd);
      const longRateBN = totalUsd.isZero()
        ? BN_ZERO
        : sumLongUsd.mul(new BN(10).pow(new BN(4))).div(totalUsd);
      const shortRateBN = totalUsd.isZero()
        ? BN_ZERO
        : sumShortUsd.mul(new BN(10).pow(new BN(4))).div(totalUsd);
      const longRate = Number(
        formatPercentage(Number(longRateBN?.toString()), 2, {
          showPercent: false,
        })
      );
      const shortRate = Number(
        formatPercentage(Number(shortRateBN?.toString()), 2, {
          showPercent: false,
        })
      );
      const glvPriceBN = glvTokenMetadatas[key]?.totalSupply?.gt(BN_ZERO)
        ? sumGmBalanceUsd?.div(glvTokenMetadatas[key]?.totalSupply)
        : BN_ZERO;
      newGlvPriceMap.set(key, glvPriceBN);
      const { mintableAmount, mintableUsd } = getGlvMintableInfo(
        info,
        glvPriceBN,
        glvTokenMetadatas[key]?.decimals,
        marketInfosMap
      );
      const timestamp = Number(shiftLastExecutedAt?.toString()) * 1000;
      let shiftDate = new Date(timestamp);
      if (shiftDate.getFullYear() === 1970 && shiftDate.getMonth() === 0 && shiftDate.getDate() === 1) {
        shiftDate = new Date();
        shiftDate.setHours(0, 0, 0, 0);
      }
      const formattedShift = shiftDate
        .toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
        .replace(',', '');
      const walletUsd = balanceMap?.get(key)?.mul(glvPriceBN);
      newGlvList.push({
        glvToken: key,
        glvPriceBN: glvPriceBN?.toString(),
        marketToken: key,
        longToken: longTokenAddress,
        shortToken: shortTokenAddress,
        totalSupply: glvTokenMetadatas[key]?.totalSupply?.toString(),
        decimals: glvTokenMetadatas[key]?.decimals,
        sumGmBalance: sumGmBalance?.toString(),
        tvlUsdBn: sumGmBalanceUsd?.toString(),
        longRate: Number.isNaN(longRate) ? 0 : longRate,
        shortRate: Number.isNaN(shortRate) ? 0 : shortRate,
        markets,
        formattedShift,
        tvlUsd: formatToKMBWithoutUsd(sumGmBalanceUsd, USD_DECIMALS),
        tvlNum: `(${formatToKMBWithoutUsd(new BN(glvTokenMetadatas[key]?.totalSupply || 0), glvTokenMetadatas[key]?.decimals)} GLV)`,
        buyableAmount: formatToKMBWithoutUsd(mintableAmount, 0),
        buyableUsd: formatToKMBWithoutUsd(mintableUsd, USD_DECIMALS),
        sellableUsd: sumSellableUsd.toString(),
        name: wgmxTogmx(GMX_SOLANA_TOKENS_RAW[longTokenAddress]?.symbol) +
          '-' +
          wgmxTogmx(GMX_SOLANA_TOKENS_RAW[shortTokenAddress]?.symbol),
        walletUsd:
          connected &&
          '$' + formatToKMBWithoutUsd(walletUsd || BN_ZERO, USD_DECIMALS),
        walletNum:
          connected &&
          formatToKMBWithoutUsd(
            balanceMap?.get(key) || BN_ZERO,
            glvTokenMetadatas[key]?.decimals
          ),
        walletUsdBn: walletUsd?.toString() || '0',
        walletNumBn: balanceMap?.get(key)?.toString() || '0',
      });
    });
    const sortedGlvList = [...newGlvList].sort((a: any, b: any) =>
      new BN(b?.tvlUsdBn || 0)?.cmp(new BN(a?.tvlUsdBn || 0))
    );
    const nextVersion = getGlvListVersion(sortedGlvList);
    lastMarketDataVersionRef.current = marketDataVersion;
    if ((glvListVersionRef as any)?.current !== nextVersion) {
      setGlvListData(sortedGlvList);
      setGlvList(sortedGlvList);
      setGlvPriceMap(newGlvPriceMap);
      localStorage.setItem('glvListData', JSON.stringify(sortedGlvList));
      (glvListVersionRef as any).current = nextVersion;
      setIsGlvListSorted(true);
    }
  }, [glvsVersion, marketInfosVersion, tokenPriceVersion, balanceMap, connected, glvTokenMetadatas, glvs]);

  return (
    <>
      {children}
    </>
  );
};

export default GlvDataProvider;
