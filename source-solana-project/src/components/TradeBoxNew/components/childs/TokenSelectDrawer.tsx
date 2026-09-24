import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  formatParseUsdToBN,
  formatPriceUsd,
  formatAmount,
} from '@/utils/legacy/format';
import { BN } from '@coral-xyz/anchor';
import { t, Trans } from '@lingui/macro';
import { formatGmxSymbol, formatDisplayGmxSymbol } from '@/components/TradeBoxNew/utils/formatGmxSymbol';
// import { sortedMarketInfosFn } from '@/components/TradeBoxNew/Hooks/useIndexTokensData';
import { TableScrollFadeContainer } from '@/components/Common/Table/TableScrollFade/TableScrollFade';

import { getIconUrlPath } from '@/utils/lib/icon';
import SearchIconComponent from '@/img/search.svg?react';
import IconClose from '@/img/header/close.svg?react';
import IconStar from '@/img/header/star.svg?react';
import { useBodyScrollLock } from '@/hooks/utilsHooks/useBodyScrollLock';
import './TokenSelectDrawer.scss';

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
  unitPrice: string | number,
  price: BN,
}

type TabType = 'all' | 'favorites' | 'stock' | 'commodity' | 'forex' | 'crypto';
type SelectType = 'pay' | 'market' | 'receive';
type Title = 'Pay' | 'Long' | 'Short' | 'Receive'

interface HeaderSwapPanelProps {
  isOpen: boolean;
  selectType: string;
  title: string;
  payerSwapTokens: Token[];
  sortedTokens?: any[];
  onSelectToken?: (token) => void;
  onClose?: () => void;
}

const FAVORITES_KEY = 'trade_header_favorites';

const TokenSelectDrawer: React.FC<HeaderSwapPanelProps> = ({
  isOpen,
  selectType,
  title,
  payerSwapTokens,
  sortedTokens,
  onClose,
  onSelectToken
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const drawerContentRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef({ x: 0, y: 0 });


  const getTranslatedTitle = (originalTitle: string): string => {
    if (originalTitle === 'Pay') return t`Pay`;
    if (originalTitle === 'Receive') return t`Receive`;
    if (originalTitle === 'Long') return t`Long`;
    if (originalTitle === 'Short') return t`Short`;
    return originalTitle;
  };

  const tabs = [
    { key: 'all' as TabType, label: 'All Markets' },
    { key: 'favorites' as TabType, label: 'Favorites' },
    // { key: 'layer1' as TabType, label: 'Layer1' },
    // { key: 'layer2' as TabType, label: 'Layer2' },
    { key: 'forex' as TabType, label: 'Forex' },
    { key: 'commodity' as TabType, label: 'Commodity' },
    { key: 'stock' as TabType, label: 'Stock' },
    { key: 'crypto' as TabType, label: 'Crypto' },
    // { key: 'meme' as TabType, label: 'Meme' },
    // { key: 'defi' as TabType, label: 'DeFi' },
  ];
  useBodyScrollLock(isOpen);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return;
    }

    const target = e.target as HTMLElement;
    const scrollContainer =
      target.closest<HTMLElement>('.select-table');

    if (!scrollContainer) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const canScroll = scrollHeight > clientHeight;
    const isScrollingDown = deltaY < 0;
    const isScrollingUp = deltaY > 0;
    const isAtTop = scrollTop <= 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

    if (!canScroll || (isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
      e.preventDefault();
    }

    e.stopPropagation();
  };

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
    if (!isOpen) return;

    const activeElement = document.activeElement;
    if (activeElement && activeElement instanceof HTMLInputElement) {
      activeElement.blur();
    }

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;

      if (drawerContentRef.current && !drawerContentRef.current.contains(target)) {
        e.preventDefault();
        e.stopPropagation();
        if (target instanceof HTMLInputElement) {
          target.blur();
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn, true);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
    };
  }, [isOpen]);

  const saveFavorites = (newFavorites: Set<string>) => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(newFavorites)));
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

  const getTokensByCategory = (tokens: Token[], category: TabType): Token[] => {
    switch (category) {
      case 'favorites':
        return tokens.filter(token => favorites.has(token.tokenName || formatGmxSymbol(token?.indexToken || '')));
      case 'crypto':
        return tokens.filter(token => {
          const symbol = (token.tokenName || formatGmxSymbol(token?.indexToken || '')).toLowerCase();
          return ['eth','btc','sol','xlm','sui','ada','dot','avax','trx','xrp','ltc','bnb','ton','bch','atom','near','arb','op','matic','imx','strk','doge','shib','pepe','wif','bome','fartcoin','mew','pump','bonk','trump','melania','uni','comp','crv','mkr','snx','ldo','pendle','jup','aave','wlfi','gmx','link','aster','ena','hype','xpl','ape','zec','lit','vvv','xmr','ondo','tao','wld'].includes(symbol);
        });
      // case 'layer2':
      //   return tokens.filter(token => {
      //     const symbol = (token.tokenName || formatGmxSymbol(token?.indexToken || '')).toLowerCase();
      //     return ['arb', 'op', 'matic', 'imx', 'strk', 'near'].includes(symbol);
      //   });
      case 'stock':
        return tokens.filter(token => {
          const symbol = (token.tokenName || formatGmxSymbol(token?.indexToken || '')).toLowerCase();
          return ['qqq', 'msft', 'googl', 'tsla', 'amzn', 'aapl', 'nvda', 'spy', 'meta', 'mstr', 'spcx'].includes(symbol);
        });
      case 'commodity':
        return tokens.filter(token => {
          const symbol = (token.tokenName || formatGmxSymbol(token?.indexToken || '')).toLowerCase();
          return ['xag', 'xau', 'wti', 'brent', 'xcu', 'xpt', 'xpd'].includes(symbol);
        });
      case 'forex':
        return tokens.filter(token => {
          const symbol = (token.tokenName || formatGmxSymbol(token?.indexToken || '')).toLowerCase();
          return ['eur', 'gbp', 'aud', 'nzd', 'usdjpy', 'usdcad', 'usdchf', 'usdmxn'].includes(symbol);
        });
      // case 'meme':
      //   return tokens.filter(token => {
      //     const symbol = (token.tokenName || formatGmxSymbol(token?.indexToken || '')).toLowerCase();
      //     return ['doge', 'shib', 'pepe', 'bonk', 'wif', 'bome', 'fartcoin', 'mew'].includes(symbol);
      //   });
      // case 'defi':
      //   return tokens.filter(token => {
      //     const symbol = (token.tokenName || formatGmxSymbol(token?.indexToken || '')).toLowerCase();
      //     return ['uni', 'aave', 'comp', 'crv', 'mkr', 'snx', 'ldo', 'pendle', 'jup', 'aster', 'ena', 'hype', 'xpl'].includes(symbol);
      //   });
      default:
        return tokens;
    }
  };

  const filteredAndSortedTokens = useMemo(() => {
    let filtered = [];
    if (selectType === 'market') {
      filtered = getTokensByCategory(sortedTokens, activeTab);
    } else if (['pay', 'receive'].includes(selectType)) {
      // const lpAmountSortValue = payerSwapTokens.sort((a, b) => {
      //   console.log('a.value', a.value)
      //   console.log('b.value', b.value)
      //   return a.value?.localeCompare(b.value || '')
      // })
      filtered = getTokensByCategory(payerSwapTokens, activeTab);
    }

    if (searchTerm) {
      filtered = filtered.filter(token => {
        const symbol = (token.tokenName || formatGmxSymbol(token?.indexToken || '')).toLowerCase();
        return symbol.includes(searchTerm.toLowerCase());
      });
    }
    return filtered;
  }, [payerSwapTokens, activeTab, searchTerm, favorites]);

  const handleSelectToken = (token: Token) => {
    if (token && Object.keys(token).length) {
      onSelectToken(token)
    }
    onClose();
  };

  const Empty = ({ description }: { description: string }) => {
    return (
      <div className="flex items-center justify-center h-full my-[10px] mb-[15px] text-[#A3A3A3] text-[14px]">
        <span className="text-body-medium">{description || t`No data available`}</span>
      </div>
    )
  }

  if (!isOpen) return null;

  return (
    <div
      className="select-token-panel-overlay"
      onClick={onClose}
    >
      <div
        ref={drawerContentRef}
        className="select-content"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div>
          <div className="select-title">
            <span>{getTranslatedTitle(title)}</span>
            <IconClose fill="currentColor" className='search-close' onClick={() => onClose()} />
          </div>
          <div className="select-search">
            <div className="search-input-wrapper">
              <SearchIconComponent fill="" className="search-icon" />
              <input
                type="text"
                placeholder={selectType === 'market' ? t`Search markets` : t`Search assets`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          {
            selectType === 'market' && <>
              <TableScrollFadeContainer>
                <div className="select-tabs">
                  {tabs.map(tab => (
                    <button
                      key={tab.key}
                      className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </TableScrollFadeContainer>
            </>
          }
        </div>
        <div className="select-table">
          <div className="table-body">
            {filteredAndSortedTokens.map((token) => {
              const isFavorite = favorites.has(token.tokenName || formatGmxSymbol(token?.indexToken || ''));
              return (
                <div
                  key={token.tokenName || formatGmxSymbol(token?.indexToken || '')}
                  className="table-row"
                  onClick={() => handleSelectToken(token)}
                >
                  <div className="table-cell market-cell">
                    <img
                      className="token-icon"
                      src={getIconUrlPath(token?.tokenName === 'WGMX' ? 'GMX' : token?.tokenName || formatGmxSymbol(token?.indexToken || ''), 24)}
                      alt={token?.tokenName === 'WGMX' ? 'GMX' : token?.tokenName || formatGmxSymbol(token?.indexToken || '')}
                      width={40}
                    />
                    <span className="token-symbol">
                      {token?.tokenName === 'WGMX' ? 'GMX' : token?.tokenName || formatDisplayGmxSymbol(token?.indexToken || '')}
                    </span>
                  </div>
                  <div className='right-cell'>
                    {
                      ['pay', 'receive'].includes(selectType) && <>
                        <div className="table-cell price-cell">
                          <span className="amount">{formatAmount(new BN(token?.amount || '0'), token?.decimals)}</span>
                          <span className='price'>{formatPriceUsd(formatParseUsdToBN(formatAmount(new BN(token?.amount || '0'), token?.decimals).toString() || "0", token?.decimals).mul(new BN(token?.price || 0)), { fallbackToZero: true })}</span>
                        </div>
                      </>
                    }
                    {
                      selectType === 'market' && <>
                        <button
                          className='favorite-btn'
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(token?.tokenName || formatGmxSymbol(token?.indexToken || ''));
                          }}
                        >
                          <IconStar
                            className={isFavorite ? 'star-filled' : 'star-empty'}
                          />
                        </button>
                      </>
                    }
                  </div>
                </div>
              );
            })}

            {
              filteredAndSortedTokens.length === 0 &&
              <Empty description={t`No markets matched`} />
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenSelectDrawer;
