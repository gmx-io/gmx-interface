

import { getGmw248Enabled, getGmw291Enabled } from '@/config/featureFlagEnable';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import './marketlist.scss';
import { BottomTablePagination } from '@/components/Common/Pagination/BottomTablePagination';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import CellSkeleton from '@/components/Common/Skeleton/CellSkeleton';
import InfoSvg from '@/img/pools/Info.svg';
import { t, Trans } from '@lingui/macro';
import IconSort from '@/img/header/sort.svg?react';
import IconSortDown from '@/img/header/sort-down.svg?react';
import IconSortUp from '@/img/header/sort-up.svg?react';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import {
  useEffect,
  useMemo,
  useState,
  useImperativeHandle,
  forwardRef,
  useRef,
} from 'react';
import { TableScrollFadeContainer } from '@/components/Common/Table/TableScrollFade/TableScrollFade';
import SearchIconComponent from '@/img/stats/stats-search.svg?react';
import closeIcons from '@/img/header/close.svg';
import { useMarkets } from '../Hooks/useMarkets';
import MoreSvg from '@/img/pools/More.svg';
import { BN } from '@coral-xyz/anchor';
import {
  formatRatePercentage,
  formatUsdToKMB,
  formatPriceUsd,
  formatUsd,
  convertTokenAmountToUsd,
  formatAmount,
} from '@/utils/legacy';
import { GMX_SOLANA_TOKENS, GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { getBalanceMap } from '@/components/Pools/utils/getBalanceMap';
import { useAnchor } from '@/contexts/anchor';
import { LEADERBOARD_LIST_PER_PAGE } from '@/config/ui';
import { getIconUrlPath } from '@/utils/lib/icon';
import PopupMenu from '../components/PopupMenu';
import { BN_ZERO } from '@solana/spl-governance';
import { useMedia } from 'react-use';
import CurrentPageItemsFixedList from '@/components/CurrentPageItemsFixedList';
import { getNormalizedTokenSymbolGMX } from '@/utils/token/getNormalizedTokenSymbolGMX';

type TotalsItem = {
  allPoolValue: any;
  allTvl: any;
  allLongPosition: string;
  allShortPosition: string;
  allOpenInterest: string;
};

const FOREX_PRICE_DECIMALS = 5;

const getPriceFormatOptions = (indexToken?: string) => {
  const tokenConfig = indexToken ? GMX_SOLANA_TOKENS[indexToken] : undefined;

  if (tokenConfig?.type !== 'forex') {
    return undefined;
  }

  return {
    displayDecimals: FOREX_PRICE_DECIMALS,
    isDisplayDecimals: true,
  };
};

const MarketList = forwardRef(function MarketList(
  { onTotalsUpdate }: { onTotalsUpdate?: (totals: TotalsItem) => void },
  ref
) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { indexTokens } = useMarkets();
  const { balanceMap, connected } = getBalanceMap();
  const { owner } = useAnchor();
  const FAVORITES_KEY = 'pools_gm_favorites';
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [activeVaultId, setActiveVaultId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const isMobile = useMedia('(max-width: 768px)');
  type SortField = 'price' | 'tvl' | 'liquidity' | 'utilization';
  type SortOrder = 'default' | 'asc' | 'desc';
  const [gmSortField, setGmSortField] = useState<SortField>('price');
  // const [currentPageItemsFixedList, setCurrentPageItemsFixedList] = useState<any[]>([]);
  const [gmSortFieldList, setGmSortFieldList] = useState<
    Record<SortField, SortOrder>
  >({
    price: 'default',
    tvl: 'default',
    liquidity: 'default',
    utilization: 'default',
  });
  const isGmw291Enabled = getGmw291Enabled();
  const nextOrder = (v: SortOrder): SortOrder =>
    v === 'default' ? 'desc' : v === 'desc' ? 'asc' : 'default';

  const getSortIcon = (field: SortField) => {
    return gmSortFieldList[field] === 'asc' ? (
      <IconSortUp fill="#FA7B4E" className="icon-sort-up" />
    ) : gmSortFieldList[field] === 'desc' ? (
      <IconSortDown fill="#FA7B4E" className="icon-sort-down" />
    ) : (
      <IconSort fill="currentColor" className="icon-sort" />
    );
  };

  useImperativeHandle(ref, () => ({
    closeMenu: () => setActiveVaultId(null),
  }));

  // Load favorites from localStorage
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

  const bnMax = (list: any, key: string) => {
    if (!list || list.length === 0) return null;

    return list.reduce(
      (max, item) => {
        const cur = new BN(item[key] || 0);
        return cur.gt(max) ? cur : max;
      },
      new BN(list[0][key] || 0)
    );
  };

  const poolList = useMemo(() => {
    if (!indexTokens || indexTokens?.length === 0) {
      return [];
    }
    return indexTokens?.map((item) => {
      const poolName = getNormalizedTokenSymbolGMX(
        GMX_SOLANA_TOKENS_RAW[item?.indexToken]?.symbol
      );
      const newMarketInfos = item?.marketInfos?.map((item1) => {
        const lpLong = new BN(item1?.lpLong);
        const lpShort = new BN(item1?.lpShort);
        const liquidity = getGmw248Enabled()
          ? lpLong
            .add(lpShort)
            .add(new BN(item1?.longOpenInterest || 0))
            .add(new BN(item1?.shortOpenInterest || 0))
          : lpLong.add(lpShort);
        return {
          ...item1,
          formatePrice: item1?.marketPrice
            ? formatPriceUsd(
              new BN(item1?.marketPrice),
              getPriceFormatOptions(item1?.indexToken)
            )
            : 0,
          formateTvl: formatUsdToKMB(
            new BN(item1?.supply)
              .mul(new BN(item1?.marketPrice))
              ?.div(new BN(10).pow(new BN(item1?.marketDecimals || 0)))
          ),
          formateLiquidity: formatUsdToKMB(new BN(liquidity)),
          formateLongNetRatePerHour: formatRatePercentage(
            new BN(item1?.longNetRatePerHour),
            4,
            {
              signed: true,
              percentages: true,
            }
          ),
          formateShortNetRatePerHour: formatRatePercentage(
            new BN(item1?.shortNetRatePerHour),
            4,
            {
              signed: true,
              percentages: true,
            }
          ),
          marketTokenName: formatMarketName(item1?.indexToken),
          tvlUsd: formatUsdToKMB(
            new BN(item1?.supply)
              .mul(new BN(item1?.marketPrice))
              ?.div(new BN(10).pow(new BN(item1?.marketDecimals || 0)))
          ),
          tvlUsdBn: new BN(item1?.supply)
            .mul(new BN(item1?.marketPrice))
            ?.div(new BN(10).pow(new BN(item1?.marketDecimals || 0))),
          composition: 100,
        };
      });
      const sortedMarketInfos = newMarketInfos?.sort((a: any, b: any) => {
        const aTvl = a?.tvlUsdBn || new BN(0);
        const bTvl = b?.tvlUsdBn || new BN(0);
        const aLiquidity = a?.liquidityBn || new BN(0);
        const bLiquidity = b?.liquidityBn || new BN(0);

        if (!aTvl.eq(bTvl)) {
          return bTvl.cmp(aTvl);
        }
        return bLiquidity.cmp(aLiquidity);
      });

      let allLiquidity = new BN('0');
      let allTvl = new BN('0');
      let allLongPosition = new BN('0');
      let allShortPosition = new BN('0');
      let allPoolValueLong = new BN('0');
      let allPoolValueShort = new BN('0');
      let allLongNetRatePerHour = new BN('0');
      let allShortNetRatePerHour = new BN('0');
      let allLongOpenInterest = new BN('0');
      let allShortOpenInterest = new BN('0');
      let allOpenInterest = new BN('0');
      let allMlForLong = new BN('0');
      let allMlFrShort = new BN('0');

      const currentMarketInfos: any = [...(item?.marketInfos || [])];
      currentMarketInfos?.forEach((allItem: any) => {
        const lpLong = new BN(allItem?.lpLong || 0);
        const lpShort = new BN(allItem?.lpShort || 0);
        const liquidity = getGmw248Enabled()
          ? lpLong
            .add(lpShort)
            .add(new BN(allItem?.longOpenInterest || 0))
            .add(new BN(allItem?.shortOpenInterest || 0))
          : lpLong.add(lpShort);
        allLiquidity = allLiquidity.add(liquidity);
        allTvl = allTvl.add(
          new BN(allItem?.supply || 0)
            .mul(new BN(allItem?.marketPrice || 0))
            ?.div(new BN(10).pow(new BN(allItem?.marketDecimals || 0)))
        );
        allLongPosition = allLongPosition.add(
          new BN(allItem?.longOpenInterest || 0)
        );
        allShortPosition = allShortPosition.add(
          new BN(allItem?.shortOpenInterest || 0)
        );
        allPoolValueLong = allPoolValueLong.add(
          new BN(allItem?.poolValueLong || 0)
        );
        allPoolValueShort = allPoolValueShort.add(
          new BN(allItem?.poolValueShort || 0)
        );
        allLongNetRatePerHour = allLongNetRatePerHour.add(
          new BN(allItem?.longNetRatePerHour || 0)
        );
        allShortNetRatePerHour = allShortNetRatePerHour.add(
          new BN(allItem?.shortNetRatePerHour || 0)
        );
        allLongOpenInterest = allLongOpenInterest.add(
          new BN(allItem?.longOpenInterest || 0)
        );
        allMlForLong = allMlForLong.add(
          new BN(allItem?.mlForLong || 0)
        );
        allMlFrShort = allMlFrShort.add(
          new BN(allItem?.mlForShort || 0)
        );
        allShortOpenInterest = allShortOpenInterest.add(
          new BN(allItem?.shortOpenInterest || 0)
        );
        allOpenInterest = allLongPosition.add(new BN(allShortPosition || 0));
      });
      const denominatorNew = allPoolValueLong.add(allPoolValueShort);
      const numerator = allLongPosition.add(allShortPosition);
      const denominator = allMlForLong.add(allMlFrShort);
      let utilizationNum = 0;
      if (!denominator.isZero()) {
        const SCALE = new BN(100);
        const percentBN = numerator
          .mul(SCALE)
          .mul(new BN(100))
          .div(denominator);
        utilizationNum = percentBN.toNumber() / 100;
      }

      const utilization = utilizationNum.toFixed(2) + '%';
      const longRateMax = bnMax(item?.marketInfos, 'longNetRatePerHour');
      const shortRateMax = bnMax(item?.marketInfos, 'shortNetRatePerHour');
      return {
        poolName,
        symbol: item?.symbol,
        indexToken: item?.indexToken,
        price: item?.price
          ? formatPriceUsd(
            new BN(item?.price || 0),
            getPriceFormatOptions(item?.indexToken)
          )
          : 0,
        priceBn: new BN(item?.price || 0),
        marketInfos: sortedMarketInfos,
        supply: formatUsdToKMB(allLiquidity),
        supplyBn: allLiquidity,
        tvl: formatUsdToKMB(allTvl),
        allLongOpenInterest: allLongOpenInterest,
        allShortOpenInterest: allShortOpenInterest,
        allOpenInterest: allOpenInterest,
        tvlBn: allTvl,
        marketToken: item?.indexToken,
        allLongPosition,
        allShortPosition,
        allPoolValue: denominatorNew,
        longRate: formatRatePercentage(allLongNetRatePerHour, 4, {
          signed: true,
          percentages: true,
        }),
        longRateMax: formatRatePercentage(new BN(longRateMax), 4, {
          signed: true,
          percentages: true,
        }),
        shortRateMax: formatRatePercentage(new BN(shortRateMax), 4, {
          signed: true,
          percentages: true,
        }),
        shortRate: formatRatePercentage(allShortNetRatePerHour, 4, {
          signed: true,
          percentages: true,
        }),
        name: item?.symbol + '-' + 'USD',
        walletUsd:
          connected &&
          formatUsd(
            convertTokenAmountToUsd(
              balanceMap?.get(item?.marketToken) || BN_ZERO,
              item?.marketDecimals,
              new BN(item?.marketPrice || 0)
            ),
            {
              fallbackToZero: true,
            }
          ),
        walletNum: `(${connected && formatAmount(balanceMap?.get(item?.marketToken) || BN_ZERO, item?.marketDecimals, 2)} GM)`,
        utilization: utilization,
        utilizationNum: utilizationNum,
      };
    });
  }, [indexTokens, balanceMap, connected]);

  const isLoading = useMemo(() => {
    const poolReady = poolList && poolList.length > 0;
    return !poolReady;
  }, [searchTerm, gmSortField, poolList]);

  const handleGmSort = (field: SortField) => {
    setGmSortFieldList((prev) => {
      const nextValue = nextOrder(prev[field] ?? 'default');
      const reset: Record<SortField, SortOrder> = {
        price: 'default',
        tvl: 'default',
        liquidity: 'default',
        utilization: 'default',
      };
      return { ...reset, [field]: nextValue };
    });
    setGmSortField(field);
  };

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

  useEffect(() => {
    if (!poolList || poolList.length === 0) {
      onTotalsUpdate?.({
        allPoolValue: '',
        allTvl: '',
        allLongPosition: '',
        allShortPosition: '',
        allOpenInterest: '',
      });
    } else {
      let totalPoolValue = new BN(0);
      let totalTvlBn = new BN(0);
      let totalLongBn = new BN(0);
      let totalShortBn = new BN(0);
      let totalGmPoolValue = new BN(0);
      let totalOpenInterest = new BN(0);

      poolList.forEach((it: any) => {
        if (it?.tvlBn) totalTvlBn = totalTvlBn.add(it.tvlBn);
        if (it?.allLongOpenInterest)
          totalLongBn = totalLongBn.add(new BN(it.allLongOpenInterest));
        if (it?.allShortOpenInterest)
          totalShortBn = totalShortBn.add(new BN(it.allShortOpenInterest));
        if (it?.allPoolValue)
          totalPoolValue = totalPoolValue.add(new BN(it.allPoolValue));
        if (it?.tvlBn) {
          totalGmPoolValue = totalGmPoolValue.add(it.tvlBn);
        }
        if (it?.allOpenInterest)
          totalOpenInterest = totalOpenInterest.add(
            new BN(it.allOpenInterest)
          );
      });

      onTotalsUpdate?.({
        allPoolValue: totalPoolValue,
        allTvl: '0',
        allLongPosition: formatUsdToKMB(totalLongBn),
        allShortPosition: formatUsdToKMB(totalShortBn),
        allOpenInterest: formatUsdToKMB(totalOpenInterest, {
          displayDecimals: 2,
        }),
      });
    }
  }, [poolList]);

  const tooltipMaxWidth = useMemo(() => isMobile ? 300 : 700, [isMobile]);

  const filteredSortedList = useMemo(() => {
    const base = (poolList || []).filter(Boolean);

    const searched = !searchTerm
      ? base
      : base.filter((pool: any) => {
        // const poolName = (pool?.poolName || '').toLowerCase();
        const symbol = (pool?.symbol || '').toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        return symbol.includes(searchLower);
        // poolName.includes(searchLower) ||
        // symbol.includes(searchLower) ||
        // (pool?.marketToken || '')
        //   .toString()
        //   .toLowerCase()
        //   .includes(searchLower)
      });

    if (gmSortFieldList[gmSortField] === 'default') {
      return [...searched].sort((a: any, b: any) => {
        const aFav = favorites.has(a?.marketToken);
        const bFav = favorites.has(b?.marketToken);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        const aSupply = Number(a?.supplyBn?.toString?.() || 0);
        const bSupply = Number(b?.supplyBn?.toString?.() || 0);
        return bSupply - aSupply;
      });
    }

    const sorted = [...searched].sort((a: any, b: any) => {
      let aValue = 0;
      let bValue = 0;

      switch (gmSortField) {
        case 'price':
          aValue = Number(a?.priceBn?.toString?.() || 0);
          bValue = Number(b?.priceBn?.toString?.() || 0);
          break;
        case 'tvl':
          aValue = Number(a?.tvlBn?.toString?.() || 0);
          bValue = Number(b?.tvlBn?.toString?.() || 0);
          break;
        case 'liquidity':
          aValue = Number(a?.supplyBn?.toString?.() || 0);
          bValue = Number(b?.supplyBn?.toString?.() || 0);
          break;
        case 'utilization':
          aValue = Number(a?.utilizationNum || 0);
          bValue = Number(b?.utilizationNum || 0);
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (gmSortFieldList[gmSortField] === 'asc') return aValue - bValue;
      return bValue - aValue;
    });

    sorted.sort((a: any, b: any) => {
      const aFav = favorites.has(a?.marketToken);
      const bFav = favorites.has(b?.marketToken);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });
    return sorted;
  }, [poolList, searchTerm, gmSortField, gmSortFieldList, favorites]);

  const filteredPageCount = Math.max(
    1,
    Math.ceil((filteredSortedList?.length || 0) / LEADERBOARD_LIST_PER_PAGE)
  );

  const currentPageItems = useMemo(() => {
    const startIndex = (page - 1) * LEADERBOARD_LIST_PER_PAGE;
    const endIndex = startIndex + LEADERBOARD_LIST_PER_PAGE;
    const data = filteredSortedList?.slice(startIndex, endIndex);

    // setCurrentPageItemsFixedList([]);
    // if (data.length < LEADERBOARD_LIST_PER_PAGE) {
    //   const count = LEADERBOARD_LIST_PER_PAGE - data.length;
    //   const emptyList = Array.from({ length: count }, (_, index) => index);
    //   setCurrentPageItemsFixedList(emptyList);
    // }

    return data;
  }, [filteredSortedList, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, gmSortField, gmSortFieldList]);

  return (
    <div
      className="stats-market mt-[0.8rem] rounded-[0.8rem] bg-[#181818]"
      onClick={() => closeMenu()}
      ref={menuRef}
    >
      <div className="table-head">
        <div className="section-tabs-container">
          <div className="section-tabs-input border-b-[0.1rem] border-[#535353] px-[2rem] py-[2rem]">
            <div className={`stats-title font-[500] ${!isMobile ? 'text-[2.4rem]' : 'text-[1.4rem]'}`}>{t`GM Pools`}</div>
            <div className="search-input-container mt-[1.6rem]">
              <div className="search-input-wrapper">
                <SearchIconComponent className="search-icon" />
                <input
                  type="text"
                  placeholder="Search Pools"
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
          <div className="table-container">
            <TableScrollFadeContainer>
              <Table
                className={`${filteredPageCount > 1 ? 'border-b-[0.05rem] border-[#535353ff]' : ''} w-[max(100%,900px)]`}
              >
                <thead>
                  <TableTheadTr>
                    <TableTh>
                      <Trans>{t`MARKETS`}</Trans>
                    </TableTh>
                    <TableTh>
                      <button
                        className={`sortable ${gmSortField === 'price' && gmSortFieldList[gmSortField] !== 'default' ? 'select' : ''}`}
                        onClick={() => handleGmSort('price')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                        }}
                      >
                        <Trans>{t`PRICE`}</Trans> {getSortIcon('price')}
                      </button>
                    </TableTh>
                    <TableTh>
                      <button
                        className={`sortable ${gmSortField === 'liquidity' && gmSortFieldList[gmSortField] !== 'default' ? 'select' : ''}`}
                        onClick={() => handleGmSort('liquidity')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                        }}
                      >
                        <Trans> {t`LIQUIDITY`}</Trans>{' '}
                        {getSortIcon('liquidity')}
                      </button>
                    </TableTh>
                    <TableTh>
                      <div className="flex items-center">
                        <Trans>{t`NET RATE / 1H`}</Trans>
                        <TooltipWithPortal
                          style={{ marginTop: '-0.4rem' }}
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
                                {t`Net rate combines funding and borrowing fees but excludes open, swap or impact fees.`}
                              </p>
                              <p style={{ marginTop: '0.5rem' }}>
                                {t`Funding fees help to balance longs and shorts and are exchanged between both sides.`}
                              </p>
                              <p style={{ marginTop: '0.5rem' }}>
                                {t`Borrowing fees help ensure available liquidity.`}
                              </p>
                            </div>
                          )}
                        />
                      </div>
                    </TableTh>
                    <TableTh>
                      <button
                        className={`sortable ${gmSortField === 'utilization' && gmSortFieldList[gmSortField] !== 'default' ? 'select' : ''}`}
                        onClick={() => handleGmSort('utilization')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                        }}
                      >
                        <Trans>{t`UTILIZATION`}</Trans>{' '}
                        {getSortIcon('utilization')}
                      </button>
                    </TableTh>
                  </TableTheadTr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <TableTr
                          key={`gm-skeleton-${i}`}
                          hoverable={false}
                          bordered={false}
                        >
                          {isGmw291Enabled ? (
                            <>
                              <TableTd className='w-[30%]' style={{ minWidth: '20rem' }}>
                                <div className="flex items-center gap-[0.8rem]">
                                  <CellSkeleton width={40} height={40} radius="50%" />
                                  <CellSkeleton width={90} />
                                </div>
                              </TableTd>
                              <TableTd className='w-[13.5%]'>
                                <CellSkeleton width={70} />
                              </TableTd>
                              <TableTd className='w-[14.2%]'>
                                <CellSkeleton width={70} />
                              </TableTd>
                              <TableTd className='w-[22%]'>
                                <CellSkeleton width={90} />
                              </TableTd>
                              <TableTd className="flex w-full justify-end">
                                <CellSkeleton width={60} />
                              </TableTd>
                            </>
                          ) : (
                            <TableTd colSpan={7} style={{ textAlign: 'center' }}>
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
                  ) : filteredSortedList?.length === 0 ? (
                    <TableTr hoverable={false} bordered={false}>
                      <TableTd colSpan={7} style={{ textAlign: 'center' }}>
                        <div className="pools-empty">
                          <div className="empty-title">
                            {isLoading && owner && !searchTerm
                              ? t`Loading...`
                              : t`No pools matched`}
                          </div>
                        </div>
                      </TableTd>
                    </TableTr>
                  ) : (
                    <>
                      {currentPageItems?.map((pool, index) => (
                        <TableTr hoverable={false} key={index}>
                          <TableTd className='w-[30%]' style={{ minWidth: '20rem' }}>
                            <div className="token-info relative flex items-center gm-pools-market-item">
                              <img
                                src={getIconUrlPath(pool?.poolName, 40)}
                                alt=""
                                width={40}
                                height={40}
                                // className="mr-[0.8rem] rounded-[50%]"
                                className="mr-[0.8rem]"
                              />
                              <p className="pool-name">
                                <span>
                                  {formatMarketName(pool?.indexToken)}
                                  {/* <span className=" !text-[#A3A3A3]">
                                      
                                    </span> */}
                                </span>
                              </p>
                              <button
                                className="favorite-btn ml-[0.3rem]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(pool?.marketToken);
                                }}
                              >
                                <svg
                                  width="1"
                                  height="1"
                                  style={{ display: 'none' }}
                                />
                              </button>
                              <img
                                src={MoreSvg}
                                alt={'More'}
                                onClick={(e) =>
                                  handleMoreClick(e, pool?.indexToken)
                                }
                                style={{ cursor: 'pointer' }}
                              />
                              {activeVaultId === pool?.indexToken && (
                                <PopupMenu
                                  show={true}
                                  onClose={closeMenu}
                                  vaultId={pool?.indexToken}
                                  info={pool}
                                />
                              )}
                            </div>
                          </TableTd>
                          <TableTd className='w-[13.5%]'>
                            <div className="w-full">{pool?.price}</div>
                          </TableTd>
                          <TableTd className='w-[14.2%]'>
                            <TooltipWithPortal
                              style={{
                                marginTop: '-0.4rem',
                                width: 'fit-content',
                              }}
                              className="TradeFeesRow-tooltip"
                              handle={
                                <div className="table-value w-full text-left  font-[500] text-[#fff]">
                                  {pool.supply}
                                </div>
                              }
                              position="bottom-end"
                              renderContent={() => (
                                <div>
                                  {pool?.marketInfos?.map((tip, index) => (
                                    <div
                                      key={index}
                                      className="leadng-[2rem] my-[0.4rem] flex items-center justify-between text-[1.4rem]"
                                    >
                                      <div className="flex items-center text-[#A3A3A3]">
                                        <span>{formatMarketName(pool?.indexToken)}</span>
                                        <span className="ml-[0.6rem] flex items-center text-[1.2rem]">
                                          <span>
                                            [
                                            {getNormalizedTokenSymbolGMX(
                                              GMX_SOLANA_TOKENS_RAW[
                                                tip?.longToken
                                              ]?.symbol
                                            )}
                                          </span>
                                          <span>-</span>
                                          <span>
                                            {getNormalizedTokenSymbolGMX(
                                              GMX_SOLANA_TOKENS_RAW[
                                                tip?.shortToken
                                              ]?.symbol
                                            )}
                                            ]
                                          </span>
                                        </span>
                                        <span className="ml-[0.2rem]">:</span>
                                      </div>
                                      <span className=" ml-[1rem]">
                                        {tip?.formateLiquidity}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            />
                          </TableTd>
                          <TableTd className='w-[22%]'>
                            {isMobile ? (
                              <TooltipWithPortal
                                key={`tooltip-300`}
                                maxAllowedWidth={300}
                                style={{
                                  marginTop: '-0.4rem',
                                  width: 'fit-content',
                                }}
                                handle={
                                  <div className="table-value flex w-full items-center text-left  font-[500] text-[#fff]">
                                    <span>{pool.longRateMax}</span>
                                    <span className="mx-[0.2rem]">/</span>
                                    <span>{pool.shortRateMax}</span>
                                  </div>
                                }
                                position="bottom-end"
                                renderContent={() => (
                                  <div className="tooltip-style flex flex-wrap gap-[2rem]">
                                    {pool?.marketInfos?.map(
                                      (tip, index) => (
                                        <div
                                          key={index}
                                          className="leadng-[2rem] mb-[1.4rem] text-[1.4rem]"
                                        >
                                          <div className="flex items-center text-[#A3A3A3]">
                                            <span className="text-white">
                                              {formatMarketName(pool?.indexToken)}
                                            </span>
                                            <span className="ml-[0.6rem] flex items-center text-[1.2rem] text-[#A3A3A3]">
                                              <span>
                                                [
                                                {getNormalizedTokenSymbolGMX(
                                                  GMX_SOLANA_TOKENS_RAW[
                                                    tip?.longToken
                                                  ]?.symbol
                                                )}
                                              </span>
                                              <span>-</span>
                                              <span>
                                                {getNormalizedTokenSymbolGMX(
                                                  GMX_SOLANA_TOKENS_RAW[
                                                    tip?.shortToken
                                                  ]?.symbol
                                                )}
                                                ]
                                              </span>
                                            </span>
                                          </div>

                                          <div>
                                            <div
                                              key={index}
                                              className="leadng-[2rem] my-[0.4rem] flex items-center justify-between text-[1.2rem]"
                                            >
                                              <span className="text-[#A3A3A3]">{t`LONGS NET RATE / 1H`}</span>
                                              <span
                                                className={`${tip?.formateLongNetRatePerHour?.indexOf('+') >= 0 ? 'value-up' : tip?.formateLongNetRatePerHour?.indexOf('-') >= 0 ? 'value-down' : ''}`}
                                              >
                                                {
                                                  tip?.formateLongNetRatePerHour
                                                }
                                              </span>
                                            </div>
                                          </div>

                                          <div>
                                            <div
                                              key={index}
                                              className="leadng-[2rem] my-[0.4rem] flex items-center justify-between text-[1.2rem]"
                                            >
                                              <span className="text-[#A3A3A3]">{t`SHORTS NET RATE / 1H`}</span>
                                              <span
                                                className={`${tip?.formateShortNetRatePerHour?.indexOf('+') >= 0 ? 'value-up' : tip?.formateShortNetRatePerHour?.indexOf('-') >= 0 ? 'value-down' : ''}`}
                                              >
                                                {
                                                  tip?.formateShortNetRatePerHour
                                                }
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              />
                            ) : (
                              <TooltipWithPortal
                                key={`tooltip-700`}
                                maxAllowedWidth={700}
                                style={{
                                  marginTop: '-0.4rem',
                                  width: 'fit-content',
                                }}
                                handle={
                                  <div className="table-value flex w-full items-center text-left  font-[500] text-[#fff]">
                                    <span>{pool.longRateMax}</span>
                                    <span className="mx-[0.2rem]">/</span>
                                    <span>{pool.shortRateMax}</span>
                                  </div>
                                }
                                position="bottom-end"
                                renderContent={() => (
                                  <div className="tooltip-style flex flex-wrap gap-[2rem]">
                                    <div>
                                      <div className="leadng-[2rem] mb-[1rem] text-[1.2rem] text-[#A3A3A3]">{t`POOL`}</div>
                                      {pool?.marketInfos?.map((tip) => (
                                        <div
                                          key={tip?.longToken}
                                          className="leadng-[2rem] my-[0.4rem] flex items-center text-[1.4rem] "
                                        >
                                          <span>{formatMarketName(tip?.indexToken)}</span>
                                          <span className="ml-[0.6rem] flex items-center text-[1.2rem] text-[#A3A3A3]">
                                            <span>
                                              [
                                              {getNormalizedTokenSymbolGMX(
                                                GMX_SOLANA_TOKENS_RAW[
                                                  tip?.longToken
                                                ]?.symbol
                                              )}
                                            </span>
                                            <span>-</span>
                                            <span>
                                              {getNormalizedTokenSymbolGMX(
                                                GMX_SOLANA_TOKENS_RAW[
                                                  tip?.shortToken
                                                ]?.symbol
                                              )}
                                              ]
                                            </span>
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                    <div>
                                      <div className="leadng-[2rem]  mb-[1rem] text-[1.2rem] text-[#A3A3A3]">{t`LONGS NET RATE / 1H`}</div>
                                      {pool?.marketInfos?.map(
                                        (tip, index) => (
                                          <div
                                            key={index}
                                            className="leadng-[2rem] my-[0.4rem] flex items-center text-[1.4rem]"
                                          >
                                            <span
                                              className={`${tip?.formateLongNetRatePerHour?.indexOf('+') >= 0 ? 'value-up' : tip?.formateLongNetRatePerHour?.indexOf('-') >= 0 ? 'value-down' : ''}`}
                                            >
                                              {tip?.formateLongNetRatePerHour}
                                            </span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                    <div>
                                      <div className="leadng-[2rem]  mb-[1rem] text-[1.2rem] text-[#A3A3A3]">{t`SHORTS NET RATE / 1H`}</div>
                                      {pool?.marketInfos?.map(
                                        (tip, index) => (
                                          <div
                                            key={index}
                                            className="leadng-[2rem] my-[0.4rem] flex items-center text-[1.4rem]"
                                          >
                                            <span
                                              className={`${tip?.formateShortNetRatePerHour?.indexOf('+') >= 0 ? 'value-up' : tip?.formateShortNetRatePerHour?.indexOf('-') >= 0 ? 'value-down' : ''}`}
                                            >
                                              {
                                                tip?.formateShortNetRatePerHour
                                              }
                                            </span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                              />
                            )}
                          </TableTd>
                          <TableTd>
                            <div className="w-full text-right">
                              {pool.utilization}
                            </div>
                          </TableTd>
                        </TableTr>
                      ))}
                      <CurrentPageItemsFixedList
                        data={currentPageItems}
                        page={LEADERBOARD_LIST_PER_PAGE}
                      />
                    </>
                  )}
                </tbody>
              </Table>
            </TableScrollFadeContainer>
            <div className="pagination">
              <BottomTablePagination
                page={page}
                pageCount={filteredPageCount}
                onPageChange={setPage}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
);
export default MarketList;
