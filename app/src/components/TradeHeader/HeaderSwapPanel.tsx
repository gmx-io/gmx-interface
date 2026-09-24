import React, { useState, useMemo, useEffect } from 'react';

import {
  formatUsd,
  formatParseUsdToBN,
  formatPercentage,
  formatPriceUsd,
} from '@/utils/legacy/format';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { t, Trans } from '@lingui/macro';
import { useShallow } from 'zustand/react/shallow';

// import { sortedMarketInfosFn } from '@/components/TradeBoxNew/Hooks/useIndexTokensData';
import { TableScrollFadeContainer } from '@/components/Common/Table/TableScrollFade/TableScrollFade';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';

import { getIconUrlPath } from '@/utils/lib/icon';
import closeIcons from '@/img/header/close.svg';
import SearchIconComponent from '@/img/search.svg?react';
import IconClose from '@/img/header/close.svg?react';
import IconStar from '@/img/header/star.svg?react';
import IconSort from '@/img/header/sort.svg?react';
import IconSortDown from '@/img/header/sort-down.svg?react';
import IconSortUp from '@/img/header/sort-up.svg?react';
import { useMedia } from 'react-use';
import './HeaderSwapPanel.scss';
import { useBodyScrollLock } from '@/hooks/utilsHooks/useBodyScrollLock';
interface Token {
  tokenAddress: string;
  tokenName: string;
  amount: string;
  value: string;
  lpAmount?: string;
  maxPrice?: string;
  minPrice?: string;
  percentChange24h?: string;
  decimals?: number;
  unitPrice: string | number;
  price: BN;
}

interface HeaderSwapPanelProps {
  isOpen: boolean;
  onClose: () => void;
  payerSwapTokens: Token[];
}

type SortField = 'price' | 'volume24h' | '';
type TabType = 'all' | 'favorites' | 'layer1' | 'layer2' | 'meme' | 'defi';
type SortOrder = 'default' | 'asc' | 'desc';

const FAVORITES_KEY = 'trade_header_favorites';

const HeaderSwapPanel: React.FC<HeaderSwapPanelProps> = ({
  isOpen,
  onClose,
  payerSwapTokens,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [sortField, setSortField] = useState<SortField>('');
  const [sortFieldList, setSortFieldList] = useState<Record<string, SortOrder>>(
    { price: 'default', volume24h: 'default' }
  );
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const setSelectSwapReceiveToken = useAppStore(
    useShallow((state) => state.swap.setSelectSwapReceiveToken)
  );
  const settings = useAppStore((state) => state.settings);
  const { isCollapsed } = settings;
  const isMobile = useMedia('(max-width: 768px)');
  const [topHeight, setTopHeight] = useState(0);
  const [leftWidth, setLeftWidth] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(48);
  const { tokenPriceMap } = useAppStore(
    useShallow((state) => ({
      tokenPriceMap: state.tickersState.tokenPriceMap,
    }))
  );

  const tabs = [
    { key: 'all' as TabType, label: 'All' },
    { key: 'favorites' as TabType, label: 'Favorites' },
    // { key: 'layer1' as TabType, label: 'Layer1&2' },
    // { key: 'layer2' as TabType, label: 'RWA' },
    // { key: 'meme' as TabType, label: 'Meme' },
    // { key: 'defi' as TabType, label: 'DeFi' },
  ];

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

  useEffect(() => {
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
          const headerContainer = document.querySelector('.App-header-container');
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

      const reset: Partial<Record<string, SortOrder>> =
        field === 'price'
          ? { volume24h: 'default' }
          : field === 'volume24h'
            ? { price: 'default' }
            : {};

      return {
        ...prev,
        ...reset,
        [field]: nextValue,
      };
    });

    setSortField(field);
  };

  const getTokensByCategory = (tokens: Token[], category: TabType): Token[] => {
    switch (category) {
      case 'favorites':
        return tokens.filter((token) => favorites.has(token.tokenName));
      case 'layer1':
        return tokens.filter((token) => {
          const symbol = token.tokenName.toLowerCase();
          return [
            'eth',
            'btc',
            'sol',
            'ada',
            'dot',
            'avax',
            'atom',
            'near',
            'arb'
          ].includes(symbol);
        });
      case 'layer2':
        return tokens.filter((token) => {
          const symbol = token.tokenName.toLowerCase();
          return ['arb', 'op', 'matic', 'imx', 'strk', 'near'].includes(symbol);
        });
      case 'meme':
        return tokens.filter((token) => {
          const symbol = token.tokenName.toLowerCase();
          return [
            'doge',
            'shib',
            'pepe',
            'bonk',
            'wif',
            'bome',
            'fartcoin',
            'mew',
          ].includes(symbol);
        });
      case 'defi':
        return tokens.filter((token) => {
          const symbol = token.tokenName.toLowerCase();
          return [
            'uni',
            'aave',
            'comp',
            'crv',
            'mkr',
            'snx',
            'ldo',
            'pendle',
            'jup',
            'aster',
            'ena',
            'hype',
            'xpl',
          ].includes(symbol);
        });
      default:
        return tokens;
    }
  };

  const filteredAndSortedTokens = useMemo(() => {
    // const lpAmountSortValue = payerSwapTokens.sort((a, b) => {
    //   return a.lpAmount?.localeCompare(b.lpAmount || '');
    // });
    let filtered = getTokensByCategory(payerSwapTokens, activeTab);

    if (searchTerm) {
      filtered = filtered.filter((token) => {
        const symbol = token.tokenName.toLowerCase();
        return symbol.includes(searchTerm.toLowerCase());
      });
    }

    return filtered.sort((a, b) => {
      if (activeTab === 'all') {
        const aIsFavorite = favorites.has(a.tokenName);
        const bIsFavorite = favorites.has(b.tokenName);

        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;
      }

      if (sortFieldList[sortField] === 'default') {
        return 0;
      }

      let aValue: number, bValue: number;
      switch (sortField) {
        case 'price':
          aValue = parseFloat(
            formatUsd(
              formatParseUsdToBN('1', a?.decimals).mul(new BN(a?.price || 0)),
              { showDollarSign: false, showUseCommas: false }
            ) || '0'
          );
          bValue = parseFloat(
            formatUsd(
              formatParseUsdToBN('1', b?.decimals).mul(new BN(b?.price || 0)),
              { showDollarSign: false, showUseCommas: false }
            ) || '0'
          );
          break;
        case 'volume24h':
          aValue = parseFloat(a.percentChange24h || '0');
          bValue = parseFloat(b.percentChange24h || '0');
          break;
        default:
          return 0;
      }

      return sortFieldList[sortField] === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    });
  }, [
    payerSwapTokens,
    activeTab,
    searchTerm,
    sortField,
    favorites,
    sortFieldList,
  ]);

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
    if (token && Object.keys(token).length) {
      setSelectSwapReceiveToken(token);
    }
    onClose();
  };
  if (!isOpen) return null;
  return (
    <div
      className="header-swap-panel-overlay"
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
              display: 'flex',
              justifyContent: 'space-between',
              padding: '1.2rem 1.6rem 0 1.6rem',
            }}
          >
            <div>
              <Trans>Swaps Market</Trans>
            </div>
            <div className="panel-close" onClick={onClose}>
              <img src={closeIcons} alt="Close" width="20" height="20" />
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
                  <IconClose />
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

        <div className="panel-table">
          <Table cellSpacing="0" cellPadding="0">
            <thead>
              <TableTheadTr>
                <TableTh>{/* empty */}</TableTh>
                <TableTh>
                  <span className="sortable">
                    <Trans>MARKET</Trans>
                  </span>
                </TableTh>
                <TableTh>
                  <span
                    onClick={() => handleSort('price')}
                    className={`sortable ${sortField === 'price' && sortFieldList[sortField] !== 'default' ? 'select' : ''}`}
                  >
                    <Trans>LAST PRICE</Trans>
                    {getSortIcon('price')}
                  </span>
                </TableTh>
                <TableTh>
                  <span
                    onClick={() => handleSort('volume24h')}
                    className={`sortable ${sortField === 'volume24h' && sortFieldList[sortField] !== 'default' ? 'select' : ''}`}
                  >
                    <Trans>24H</Trans>
                    {getSortIcon('volume24h')}
                  </span>
                </TableTh>
              </TableTheadTr>
            </thead>
            <tbody>
              {filteredAndSortedTokens.map((token) => {
                const isFavorite = favorites.has(token.tokenName);
                return (
                  <TableTr
                    key={token.tokenName}
                    onClick={() => handleSelectToken(token)}
                  >
                    <TableTd>
                      <button
                        className="favorite-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(token?.tokenName);
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
                        src={getIconUrlPath(token?.tokenName === 'WGMX' ? 'GMX' : token?.tokenName, 24)}
                        alt={token?.tokenName}
                        width={20}
                      />
                      &nbsp;
                      <span className="token-symbol">{token?.tokenName === 'WGMX' ? 'GMX' : token?.tokenName}</span>
                    </TableTd>
                    <TableTd style={{ textAlign: 'right' }}>
                      <span className="price">
                        {formatPriceUsd(
                          new BN(
                            tokenPriceMap?.get(token.tokenAddress)?.price || '0'
                          )
                        )}
                      </span>
                    </TableTd>
                    <TableTd
                      className={`${Number(token?.percentChange24h) > 0
                          ? 'positive'
                          : Number(token?.percentChange24h) < 0
                            ? 'negative'
                            : ''
                        }`}
                      style={{ textAlign: 'right' }}
                    >
                      {formatPercentage(Number(token?.percentChange24h), 2, {
                        signed: true,
                      })}
                    </TableTd>
                  </TableTr>
                );
              })}
              {filteredAndSortedTokens.length === 0 && (
                <TableTr hoverable={false} bordered={false}>
                  <TableTd colSpan={4} style={{ textAlign: 'center' }}>
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

export default HeaderSwapPanel;
