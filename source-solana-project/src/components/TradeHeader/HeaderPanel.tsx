import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import { t, Trans } from '@lingui/macro';
import {
  GMX_SOLANA_TOKENS_RAW,
  GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS,
} from '@/config/program';
import { BN_10 } from '@/config/constants';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import { getMarketDefaultLeverage } from '@/components/TradeBoxNew/utils/getMarketDefaultLeverage';
import {
  formatPercentage,
  formatPriceUsd,
  formatUsdToKMB,
} from '@/utils/legacy/format';
import { BN } from '@coral-xyz/anchor';
import { useAppStore } from '@/zustand/useAppStore';
import useSocketStore from '@/zustand/socketStore';
import SearchIconComponent from '@/img/search.svg?react';
import IconSort from '@/img/header/sort.svg?react';
import IconSortDown from '@/img/header/sort-down.svg?react';
import IconSortUp from '@/img/header/sort-up.svg?react';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import closeIcons from '@/img/header/close.svg';
import IconStar from '@/img/header/star.svg?react';
import { useMedia } from 'react-use';
import './HeaderPanel.scss';
import { getIconUrlPath } from '@/utils/lib/icon';
import { useShallow } from 'zustand/react/shallow';
import { formatInput } from '../TradeBoxNew/utils/formatInput';
import { useBodyScrollLock } from '@/hooks/utilsHooks/useBodyScrollLock';
import { emitTokenSelectEvent } from '@/utils/events/tokenSelectEvent';
import { getGmw374Enabled } from '@/config/featureFlagEnable';
import { useLocation, useNavigate } from 'react-router-dom';
import { selectIndexMarket } from '@/utils/market/selectIndexMarket';
interface Token {
  indexToken: string;
  symbol?: string;
  price?: string;
  volume24h?: string;
  openInterest?: string;
  availableLiquidity?: string;
  netRate?: string;
  lpLong?: string;
  lpShort?: string;
  maxLeverage?: string;
  percentChange24h?: string;
  LongOpenInterest: string;
  shortOpenInterest: string;
  [key: string]: any;
}

interface HeaderPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sortedTokens: Token[];
}

type SortField =
  | 'symbol'
  | 'price'
  | 'volume24h'
  | 'percentChange24h'
  | 'openInterest'
  | 'availableLiquidity'
  | 'netRate';
// type SortDirection = 'asc' | 'desc';
type SortOrder = 'default' | 'asc' | 'desc';

type TabType =
  | 'all'
  | 'favorites'
  // | 'layer1'
  // | 'layer2'
  // | 'meme'
  // | 'defi'
  | 'forex'
  | 'commodity'
  | 'stock'
  | 'crypto';
// | 'other';

const FAVORITES_KEY = 'trade_header_favorites';

const HeaderPanel: React.FC<HeaderPanelProps> = ({
  isOpen,
  onClose,
  sortedTokens,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [sortField, setSortField] = useState<SortField>('volume24h');
  // const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const [topHeight, setTopHeight] = useState(0);
  const [leftWidth, setLeftWidth] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(48);
  /** Raw index markets from WebSocket (`subscribe: indexTokens`), before app-side transforms. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- use `indexTokens` where you need the live socket list
  const indexTokens = useSocketStore(
    useShallow((state) => state.indexTokens as Token[])
  );
  const marketsOpenInfo = useMemo(() => {
    return indexTokens.map((token) => token.marketInfos?.[0]);
  }, [indexTokens]);

  const navigate = useNavigate();
  const location = useLocation();
  const { leverage, setLeverage, setForbiddenTrade } = useAppStore(
    useShallow(useShallow((state) => state.TradeboxNew))
  );
  const { indexToken } = useAppStore(useShallow((state) => state.indexTokens));
  const { marketInfo } = useAppStore(useShallow((state) => state.markets));
  const { setHasCollateralChange } = useAppStore(
    useShallow((state) => state.collateralTokens)
  );
  const settings = useAppStore((state) => state.settings);
  const { isCollapsed } = settings;
  const { tokenPriceMap } = useAppStore(
    useShallow((state) => ({
      tokenPriceMap: state.tickersState.tokenPriceMap,
    }))
  );
  const isMobile = useMedia('(max-width: 768px)');
  const [sortFieldList, setSortFieldList] = useState<Record<string, SortOrder>>(
    {
      price: 'default',
      volume24h: 'default',
      percentChange24h: 'default',
      openInterest: 'default',
      availableLiquidity: 'default',
      netRate: 'default',
    }
  );

  useBodyScrollLock(isOpen);
  useEffect(() => {
    const savedFavorites = localStorage.getItem(FAVORITES_KEY);
    if (savedFavorites) {
      try {
        const favArray = JSON.parse(savedFavorites);
        setFavorites(new Set(favArray));
      } catch (error) {
        console.error('Failed to parse favorites from localStorage:', error);
      }
    }
  }, []);

  useLayoutEffect(() => {
    const updateDimensions = () => {
      const nodeHeaderObject = document.querySelector(
        '.App-header-top-container'
      );
      const nodeLeftObject = document.querySelector('.App-header-left');

      const isMobile = window.innerWidth <= 768;

      if (isMobile) {
        const header = document.querySelector('.App-header');
        if (header instanceof HTMLElement) {
          const actualHeaderHeight = header.offsetHeight;
          setHeaderHeight(actualHeaderHeight);
          setTopHeight(window.innerHeight - actualHeaderHeight);
        } else {
          const headerContainer = document.querySelector(
            '.App-header-container'
          );
          if (headerContainer instanceof HTMLElement) {
            setHeaderHeight(headerContainer.offsetHeight);
            setTopHeight(window.innerHeight - headerContainer.offsetHeight);
          } else {
            setHeaderHeight(48);
            setTopHeight(window.innerHeight - 48);
          }
        }
      } else {
        if (nodeHeaderObject?.clientHeight) {
          setTopHeight(nodeHeaderObject?.clientHeight + 8);
        } else {
          setTopHeight(60);
        }
      }

      if (nodeLeftObject?.clientWidth) {
        setLeftWidth(nodeLeftObject?.clientWidth);
      } else {
        setLeftWidth(isCollapsed ? 80 : 320);
      }
    };

    updateDimensions();

    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [isCollapsed]);

  useEffect(() => {
    if (marketInfo?.closed) {
      setForbiddenTrade(true);
    } else {
      setForbiddenTrade(false);
    }
  }, [marketInfo]);

  const saveFavorites = (newFavorites: Set<string>) => {
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(Array.from(newFavorites))
    );
  };

  const toggleFavorite = (tokenSymbol: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(tokenSymbol)) {
      newFavorites.delete(tokenSymbol);
    } else {
      newFavorites.add(tokenSymbol);
    }
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
  };

  const nextOrder = (v: SortOrder): SortOrder => {
    return v === 'default' ? 'desc' : v === 'desc' ? 'asc' : 'default';
  };

  const handleSort = (field: SortField) => {
    setSortFieldList((prev) => {
      const nextValue = nextOrder(prev[field] ?? 'default');

      const resetFields: Record<string, SortOrder> = {};
      Object.keys(prev).forEach((key) => {
        if (key !== field) {
          resetFields[key] = 'default';
        }
      });

      return {
        ...prev,
        ...resetFields,
        [field]: nextValue,
      };
    });

    setSortField(field);
  };

  const getSortIcon = (field: SortField) => {
    if (sortFieldList[field] === 'asc') {
      return <IconSortUp fill="#FA7B4E" className="icon-sort-up" />;
    } else if (sortFieldList[field] === 'desc') {
      return <IconSortDown fill="#FA7B4E" className="icon-sort-down" />;
    } else {
      return <IconSort fill="currentColor" className="icon-sort" />;
    }
  };

  const handleSelectToken = (token: Token) => {
    if (marketInfo?.closed) {
      setForbiddenTrade(true);
    } else {
      setForbiddenTrade(false);
    }
    if (!getGmw374Enabled() && indexToken !== token.indexToken) {
      const leverageBn = formatInput(leverage, 1);
      const isEnableMaxLeverage =
        localStorage.getItem('isEnableMaxLeverage') === 'enable';
      if (isEnableMaxLeverage) {
        if (
          leverageBn
            .mul(new BN(10).pow(new BN(20)))
            .gt(new BN(token.maxLeverage))
        ) {
          setLeverage(getMarketDefaultLeverage(token.indexToken));
        }
      } else {
        if (
          leverageBn
            .mul(new BN(10).pow(new BN(20)))
            .div(BN_10)
            .gt(new BN(token.maxLeverage).divn(2))
        ) {
          setLeverage(getMarketDefaultLeverage(token.indexToken));
        }
      }
    }
    // const leverageMarks = getTradeLeverageSliderMarks(
    //   new BN(token.maxLeverage)
    // );

    setHasCollateralChange(false);
    selectIndexMarket(navigate, {
      indexToken: token.indexToken,
      tokenData: token,
      search: location.search,
    });
    emitTokenSelectEvent(token);
    onClose();
  };

  const getTokensByCategory = (tokens: Token[], category: TabType): Token[] => {
    switch (category) {
      case 'favorites':
        return tokens.filter((token) =>
          favorites.has(token.symbol || token.indexToken)
        );
      case 'crypto':
        return tokens.filter((token) => {
          const symbol = (token.symbol || token.indexToken).toLowerCase();
          return [
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
            'bonk',
            'wif',
            'bome',
            'fartcoin',
            'mew',
            'pump',
            'trump',
            'melania',
            'wlfi',
            'uni',
            'aave',
            'comp',
            'crv',
            'mkr',
            'snx',
            'ldo',
            'pendle',
            'jup',
            'wlfl',
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
            'wld',
          ].includes(symbol);
        });
      case 'stock':
        return tokens.filter((token) => {
          const symbol = (token.symbol || token.indexToken).toLowerCase();
          return [
            'qqq',
            'msft',
            'googl',
            'tsla',
            'aman',
            'aapl',
            'nvda',
            'spy',
            'meta',
            'mstr',
            'spcx',
            'amzn',
          ].includes(symbol);
        });
      case 'commodity':
        return tokens.filter((token) => {
          const symbol = (token.symbol || token.indexToken).toLowerCase();
          return ['xag', 'xau', 'wti', 'brent', 'xcu', 'xpt', 'xpd'].includes(symbol);
        });
      case 'forex':
        return tokens.filter((token) => {
          const symbol = (token.symbol || token.indexToken).toLowerCase();
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
      //   return tokens.filter((token) => {
      //     const symbol = (token.symbol || token.indexToken).toLowerCase();
      //     return ['ape', 'zec', 'tao', 'wld'].includes(symbol);
      //   });
      default:
        return tokens;
    }
  };

  const filteredAndSortedTokens = useMemo(() => {
    let filtered = getTokensByCategory(sortedTokens, activeTab);

    if (searchTerm) {
      filtered = filtered.filter((token) => {
        const symbol = (token.symbol || token.indexToken).toLowerCase();
        return symbol.includes(searchTerm.toLowerCase());
      });
    }
    return filtered?.sort((a, b) => {
      if (activeTab === 'all') {
        const aIsFavorite = favorites.has(a.symbol || a.indexToken);
        const bIsFavorite = favorites.has(b.symbol || b.indexToken);

        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;
      }

      if (sortFieldList[sortField] === 'default') {
        const aValue = parseFloat(a.volume24h || '0');
        const bValue = parseFloat(b.volume24h || '0');
        return bValue - aValue;
      }

      let aValue: number, bValue: number;
      let aLongOI: number, aShortOI: number, bLongOI: number, bShortOI: number;

      switch (sortField) {
        // case 'symbol':
        //   const aSymbol = (a.symbol || a.indexToken).toLowerCase();
        //   const bSymbol = (b.symbol || b.indexToken).toLowerCase();
        //   return sortDirection === 'asc'
        //     ? aSymbol.localeCompare(bSymbol)
        //     : bSymbol.localeCompare(aSymbol);
        case 'price':
          aValue = parseFloat(a.price || '0');
          bValue = parseFloat(b.price || '0');
          break;
        case 'volume24h':
          aValue = parseFloat(a.volume24h || '0');
          bValue = parseFloat(b.volume24h || '0');
          break;
        case 'openInterest':
          aLongOI = parseFloat(a.LongOpenInterest || '0');
          aShortOI = parseFloat(a.shortOpenInterest || '0');
          bLongOI = parseFloat(b.LongOpenInterest || '0');
          bShortOI = parseFloat(b.shortOpenInterest || '0');
          aValue = aLongOI + aShortOI;
          bValue = bLongOI + bShortOI;
          break;
        case 'availableLiquidity':
          aValue = parseFloat(
            new BN(a.lpLong).add(new BN(a.lpShort)).toString() || '0'
          );
          bValue = parseFloat(
            new BN(b.lpLong).add(new BN(b.lpShort)).toString() || '0'
          );
          break;
        case 'percentChange24h':
          aValue = parseFloat(a.percentChange24h || '0');
          bValue = parseFloat(b.percentChange24h || '0');
          break;
        case 'netRate':
          aValue = parseFloat(a.netRate || '0');
          bValue = parseFloat(b.netRate || '0');
          break;
        default:
          return 0;
      }
      return sortFieldList[sortField] === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    });
  }, [
    sortedTokens,
    activeTab,
    searchTerm,
    sortField,
    // sortDirection,
    sortFieldList,
    favorites,
  ]);
  const tabs = [
    { key: 'all' as TabType, label: 'All Markets' },
    { key: 'favorites' as TabType, label: 'Favorites' },
    // { key: 'layer1' as TabType, label: 'Layer1&2' },
    { key: 'forex' as TabType, label: 'Forex' },
    { key: 'commodity' as TabType, label: 'Commodity' },
    { key: 'stock' as TabType, label: 'Stock' },
    // { key: 'meme' as TabType, label: 'Meme' },
    // { key: 'defi' as TabType, label: 'DeFi' },
    { key: 'crypto' as TabType, label: 'Crypto' },
  ];
  if (!isOpen) return null;

  return (
    <div
      className="header-panel-overlay"
      style={{
        paddingTop: isMobile ? `${headerHeight}px` : `${topHeight}px`,
        paddingLeft: `${leftWidth}px`,
      }}
      onClick={onClose}
    >
      <div
        className="header-panel"
        onClick={(e) => e.stopPropagation()}
        style={isMobile ? { height: `${topHeight}px` } : undefined}
      >
        {isMobile && (
          <div
            style={{
              padding: '1.6rem 1.6rem 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div className="panel-title">
              <Trans>Market</Trans>
            </div>
            <div className="panel-close" onClick={onClose}>
              <img src={closeIcons} alt="close" width="20" height="20" />
            </div>
          </div>
        )}
        <div className="panel-search">
          <div className="search-container">
            <div className="search-input-wrapper">
              <SearchIconComponent className="search-icon" />
              <input
                type="text"
                placeholder={t`Search markets`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <div
                  className="search-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm('');
                  }}
                >
                  <img src={closeIcons} alt="clear" width="14" height="14" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="panel-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* style={{ maxHeight: '44.5rem' }} */}
        <div
          className="panel-table"
          style={{ maxHeight: isMobile ? 'auto' : '44.5rem' }}
        >
          <Table>
            <thead>
              <TableTheadTr>
                <TableTh>{/* empty */}</TableTh>
                <TableTh style={{ width: isMobile ? 'auto' : '21rem' }}>
                  <span className="sortable">
                    <Trans>MARKET</Trans>
                    {/* {getSortIcon('symbol')} */}
                  </span>
                </TableTh>
                <TableTh>
                  <span
                    onClick={() => handleSort('price')}
                    className={`sortable ${sortField === 'price' && sortFieldList[sortField] !== 'default' ? 'select' : ''}`}
                  >
                    <Trans>LAST PRICE</Trans> {getSortIcon('price')}
                  </span>
                </TableTh>
                <TableTh style={{ width: '10.5rem' }}>
                  <span
                    onClick={() => handleSort('percentChange24h')}
                    className={`sortable ${sortField === 'percentChange24h' && sortFieldList[sortField] !== 'default' ? 'select' : ''}`}
                  >
                    <Trans>24H%</Trans> {getSortIcon('percentChange24h')}
                  </span>
                </TableTh>
                <TableTh
                  style={{
                    paddingLeft: isMobile && '0',
                    paddingRight: isMobile && '0',
                  }}
                >
                  <span
                    onClick={() => handleSort('volume24h')}
                    className={`sortable ${sortField === 'volume24h' && sortFieldList[sortField] !== 'default' ? 'select' : ''}`}
                  >
                    <Trans>24H VOL.</Trans> {getSortIcon('volume24h')}
                  </span>
                </TableTh>
                <TableTh style={{ width: '13.5rem' }}>
                  <span
                    onClick={() => handleSort('openInterest')}
                    className={`sortable ${sortField === 'openInterest' && sortFieldList[sortField] !== 'default' ? 'select' : ''}`}
                  >
                    <Trans>OPEN INTEREST</Trans> {getSortIcon('openInterest')}
                  </span>
                </TableTh>
                <TableTh style={{ textAlign: 'left', width: '13.5rem' }}>
                  <span
                    onClick={() => handleSort('availableLiquidity')}
                    className={`sortable ${sortField === 'availableLiquidity' && sortFieldList[sortField] !== 'default' ? 'select' : ''}`}
                  >
                    <Trans>AVAILABLE LIQ.</Trans>{' '}
                    {getSortIcon('availableLiquidity')}
                  </span>
                </TableTh>
              </TableTheadTr>
            </thead>
            <tbody>
              {filteredAndSortedTokens.map((token) => {
                const isFavorite = favorites.has(
                  token.symbol || token.indexToken
                );
                const isMarketOpen = !marketsOpenInfo.find(
                  (market) => market?.indexToken === token.indexToken
                )?.closed;
                return (
                  <TableTr
                    key={token.indexToken}
                    onClick={() => handleSelectToken(token)}
                  >
                    <TableTd>
                      <button
                        className="favorite-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(token.symbol || token.indexToken);
                        }}
                      >
                        <IconStar
                          className={isFavorite ? 'star-filled' : 'star-empty'}
                        />
                      </button>
                    </TableTd>
                    <TableTd>
                      <img
                        className="token-icon"
                        src={getIconUrlPath(
                          GMX_SOLANA_TOKENS_RAW[token.indexToken]?.symbol,
                          24
                        )}
                        alt={GMX_SOLANA_TOKENS_RAW[token.indexToken]?.symbol}
                        width={20}
                      />
                      &nbsp;
                      <span className="token-symbol">
                        {formatMarketName(token.indexToken)}
                        <span className="leverage-badge">
                          {new BN(token?.maxLeverage)
                            .div(new BN(10).pow(new BN(20)))
                            .toString()}
                          x
                        </span>
                      </span>
                      <div
                        className="inline-flex items-center justify-end"
                        style={{
                          position: 'relative',
                          top: '0.2rem',
                          marginLeft: '0.5rem',
                        }}
                      >
                        <div
                          className={`relative h-[1rem] w-[1rem] rounded-full ${isMarketOpen ? 'bg-[#19382A]' : 'bg-[#323232]'}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <div
                            className={`absolute h-[0.7rem] w-[0.7rem] rounded-full ${isMarketOpen ? 'bg-[#31C366]' : 'bg-[#FF5454]'}`}
                            style={{
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                            }}
                          ></div>
                        </div>
                      </div>
                    </TableTd>
                    <TableTd>
                      <div className="price-container">
                        <span className="price">
                          {formatPriceUsd(
                            new BN(
                              tokenPriceMap?.get(token.indexToken)?.price || '0'
                            ),
                            {
                              isDisplayDecimals:
                                GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(
                                  token.indexToken
                                ),
                            }
                          )}
                        </span>
                        {isMobile && (
                          <span
                            className={`${Number(token?.percentChange24h) > 0 ? 'positive' : Number(token?.percentChange24h) < 0 ? 'negative' : ''}`}
                          >
                            {formatPercentage(
                              Number(token?.percentChange24h),
                              2,
                              {
                                signed: true,
                              }
                            )}
                          </span>
                        )}
                      </div>
                    </TableTd>
                    <TableTd
                      className={`${Number(token?.percentChange24h) > 0 ? 'positive' : Number(token?.percentChange24h) < 0 ? 'negative' : ''}`}
                    >
                      {formatPercentage(Number(token?.percentChange24h), 2, {
                        signed: true,
                      })}
                    </TableTd>
                    <TableTd>
                      {formatUsdToKMB(new BN(token?.volume24h), {
                        displayDecimals: 1,
                      })}
                    </TableTd>
                    <TableTd>
                      <div className="value-container">
                        {/* <div className="value-item">
                          <img src={upIcons} alt="up" />
                          <span>
                            {formatUsdToKMB(
                              new BN(token?.LongOpenInterest) ?? BN_ZERO,
                              { displayDecimals: 1 }
                            )}
                          </span>
                        </div>
                        <div className="value-item">
                          <img src={downIcons} alt="down" />
                          <span>
                            {formatUsdToKMB(
                              new BN(token?.shortOpenInterest) ?? BN_ZERO,
                              { displayDecimals: 1 }
                            )}
                          </span>
                        </div> */}
                        <div className="value-item">
                          <span>
                            {formatUsdToKMB(
                              new BN(token?.LongOpenInterest || 0).add(
                                new BN(token?.shortOpenInterest || 0)
                              ),
                              { displayDecimals: 1 }
                            )}
                          </span>
                        </div>
                      </div>
                    </TableTd>
                    <TableTd>
                      <div className="value-container">
                        <div className="value-item">
                          {/* <span style={{ paddingLeft: '2.8rem' }}> */}
                          <span>
                            {formatUsdToKMB(
                              new BN(token?.lpLong)?.add(
                                new BN(token?.lpShort)
                              ),
                              { displayDecimals: 1 }
                            )}
                          </span>
                        </div>
                      </div>
                    </TableTd>
                  </TableTr>
                );
              })}
              {filteredAndSortedTokens.length === 0 && (
                <TableTr hoverable={false} bordered={false}>
                  <TableTd colSpan={8} style={{ textAlign: 'center' }}>
                    <div className="text-body-medium text-[#A3A3A3]">
                      <Trans>No markets matched</Trans>
                    </div>
                  </TableTd>
                </TableTr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default HeaderPanel;
