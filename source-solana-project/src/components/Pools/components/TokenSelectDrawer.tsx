/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getGmw330Enabled, getGmw113Enabled } from '@/config/featureFlagEnable';
import React, { useState, useMemo, useEffect, useRef } from 'react';

import {
  formatParseUsdToBN,
  formatPriceUsd,
  formatAmount,
  formatUsd,
} from '@/utils/legacy/format';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import TokenSvgOld from '@/img/pools/Token.svg';
import TokenSvg from '@/img/pools/Token-new.svg';
import { formatGmxSymbol } from '@/components/TradeBoxNew/utils/formatGmxSymbol';
import { ButtonRowScrollFadeContainer } from '@/components/Common/Table/TableScrollFade/TableScrollFade';
import { getIconUrlPath } from '@/utils/lib/icon';
import SearchIconComponent from '@/img/search.svg?react';
import IconClose from '@/img/header/close.svg?react';
import IconStar from '@/img/header/star.svg?react';
import { getNormalizedTokenSymbolGMX } from '@/utils/token/getNormalizedTokenSymbolGMX';
import { useBodyScrollLock } from '@/hooks/utilsHooks/useBodyScrollLock';
import './TokenSelectDrawer.scss';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import { getGlvDisplayNameByTokenAddress } from '@/utils/glv/getGlvDisplayName';
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
  marketToken?: string;
  indexToken?: string;
  longToken?: string;
  shortToken?: string;
  marketDecimals?: number;
  glvToken?: string;
  valueBN?: BN;
  supply?: string;
  showName?: string[];
}

type TabType =
  | 'all'
  | 'favorites'
  | 'stock'
  | 'commodity'
  | 'forex'
  | 'crypto';

interface HeaderSwapPanelProps {
  isOpen: boolean;
  selectType: string;
  title: string;
  payerSwapTokens: Token[];
  sortedTokens?: any[];
  onSelectToken?: (token) => void;
  onClose?: () => void;
  isShift?: boolean;
  glvListData?: any[];
  isGlv?: boolean;
}

const FAVORITES_KEY = 'pools_gm_favorites';

const TokenSelectDrawer: React.FC<HeaderSwapPanelProps> = ({
  isOpen,
  isGlv,
  selectType,
  title,
  payerSwapTokens,
  sortedTokens,
  onClose,
  onSelectToken,
  isShift,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const drawerContentRef = useRef<HTMLDivElement>(null);

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
    { key: 'forex' as TabType, label: 'Forex' },
    { key: 'commodity' as TabType, label: 'Commodity' },
    { key: 'stock' as TabType, label: 'Stock' },
    { key: 'crypto' as TabType, label: 'Crypto' },
    // { key: 'layer1' as TabType, label: 'Layer1&2' },
    // { key: 'meme' as TabType, label: 'Meme' },
    // { key: 'defi' as TabType, label: 'DeFi' },
    // { key: 'other' as TabType, label: 'Other' },
  ];
  useBodyScrollLock(true);

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
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(Array.from(newFavorites))
    );
  };

  const toggleFavorite = (marketToken: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(marketToken)) {
      newFavorites.delete(marketToken);
    } else {
      newFavorites.add(marketToken);
    }
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
  };

  const getSymbol = (token: Token) => {
    const symbol = token.tokenName || formatGmxSymbol(token?.indexToken || '');

    return getGmw330Enabled()
      ? (symbol || '').toLowerCase()
      : symbol.toLowerCase();
  };

  const getTokensByCategory = (tokens: Token[], category: TabType): Token[] => {
    const stockTokens = [
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
    ];
    const commodityTokens = [
      'xag',
      'xau',
      'wti',
      'brent',
      'xcu',
      'xpt',
      'xpd'
    ];
    const forexTokens = [
      'eur',
      'gbp',
      'aud',
      'nzd',
      'usdjpy',
      'usdcad',
      'usdchf',
      'usdmxn',
    ];

    const cryptoTokens = [
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
      'arb',
      'op',
      'matic',
      'imx',
      'strk',
      'near',
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
      'uni',
      'aave',
      'comp',
      'crv',
      'mkr',
      'snx',
      'ldo',
      'pendle',
      'jup',
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

    switch (category) {
      case 'favorites':
        return tokens.filter((token) =>
          favorites.has(token?.marketToken || token.tokenAddress)
        );
      case 'stock':
        return tokens.filter((token) => stockTokens.includes(getSymbol(token)));
      case 'commodity':
        return tokens.filter((token) => commodityTokens.includes(getSymbol(token)));
      case 'forex':
        return tokens.filter((token) => forexTokens.includes(getSymbol(token)));
      case 'crypto':
        return tokens.filter((token) => cryptoTokens.includes(getSymbol(token)));
      default:
        return tokens;
    }
  };

  const filteredAndSortedTokens = useMemo(() => {
    let filtered = [];
    if (selectType === 'market') {
      filtered = getTokensByCategory(sortedTokens, activeTab);
    } else if (['pay', 'receive'].includes(selectType)) {
      filtered = getTokensByCategory(payerSwapTokens, activeTab);
    }

    if (searchTerm) {
      filtered = filtered.filter((token) => {
        return getSymbol(token).includes(searchTerm.toLowerCase());
      });
    }
    return filtered;
  }, [payerSwapTokens, activeTab, searchTerm, favorites]);

  const handleSelectToken = (token: Token) => {
    if (token && Object.keys(token).length) {
      onSelectToken(token);
    }
    onClose();
  };

  const Empty = ({ description }: { description: string }) => {
    return (
      <div className="my-[10px] mb-[15px] flex h-full items-center justify-center text-[14px] text-[#A3A3A3]">
        <span className="text-body-medium">
          {description || t`No data available`}
        </span>
      </div>
    );
  };

  if (!isOpen) return null;
  return (
    <div className="select-token-panel-overlay" onClick={onClose}>
      <div ref={drawerContentRef} className="select-content" onClick={(e) => e.stopPropagation()}>
        <div>
          <div className="select-title">
            <span>{getTranslatedTitle(title)}</span>
            <span></span>
            <IconClose
              fill="currentColor"
              className="search-close"
              onClick={() => onClose()}
            />
          </div>
          <div className="select-search">
            <div className="search-input-wrapper">
              <SearchIconComponent fill="" className="search-icon" />
              <input
                type="text"
                placeholder={t`Search assets`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          {selectType === 'market' && isGlv && (
            <>
              <ButtonRowScrollFadeContainer>
                <div className="select-tabs">
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
              </ButtonRowScrollFadeContainer>
            </>
          )}
          {selectType === 'market' && isShift && (
            <>
              <ButtonRowScrollFadeContainer>
                <div className="select-tabs">
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
              </ButtonRowScrollFadeContainer>
            </>
          )}
        </div>
        <div className="select-table">
          <div className="table-body">
            {filteredAndSortedTokens.map((token, index) => {
              const isFavorite = favorites.has(
                token?.marketToken || token.tokenAddress
              );

              const showNameStr = token?.showName?.[0];
              const longTokenSymbol = showNameStr?.split('-')[0]?.trim();
              const shortTokenSymbol = showNameStr?.split('-')[1]?.trim();
              return (
                <>
                  <div
                    key={index}
                    className="table-row"
                    onClick={() => handleSelectToken(token)}
                  >
                    <div className="market-cell table-cell">
                      {token?.type !== 'pool' && !token?.glvToken && (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <img
                            className="token-icon"
                            src={getIconUrlPath(
                              token?.tokenName === 'WGMX'
                                ? 'GMX'
                                : token?.tokenName ||
                                formatGmxSymbol(token?.indexToken || ''),
                              24
                            )}
                            alt={
                              token?.tokenName === 'WGMX'
                                ? 'GMX'
                                : token?.tokenName ||
                                formatGmxSymbol(token?.indexToken || '')
                            }
                            width={40}
                          />
                          {longTokenSymbol && shortTokenSymbol && (
                            <div className='ls-img'>
                              <img
                                src={getIconUrlPath(
                                  longTokenSymbol === "WGMX" ? "GMX" : longTokenSymbol,
                                  24
                                )}
                                alt=""
                                width={18}
                              />
                              <img
                                src={getIconUrlPath(
                                  shortTokenSymbol === "WGMX" ? "GMX" : shortTokenSymbol,
                                  24
                                )}
                                alt=""
                                width={18}
                              />
                            </div>
                          )}
                        </div>
                      )}
                      {token?.glvToken && (
                        <img
                          className="token-icon"
                          src={getGmw113Enabled() ? TokenSvg : TokenSvgOld}
                          alt={'glvToken'}
                          width={40}
                        />
                      )}

                      {token?.type === 'pool' && (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <img
                            className="token-icon"
                            src={getIconUrlPath(
                              formatGmxSymbol(token?.indexToken || ''),
                              24
                            )}
                            alt={
                              formatGmxSymbol(token?.indexToken || '')
                            }
                            width={40}
                          />

                          <div className='ls-img'>
                            <img
                              src={getIconUrlPath(
                                getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[token?.longToken]?.symbol),
                                24
                              )}
                              alt=""
                              width={18}
                            />
                            <img
                              src={getIconUrlPath(
                                getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[token?.shortToken]?.symbol),
                                24
                              )}
                              alt=""
                              width={18}
                            />
                          </div>
                        </div>
                      )}

                      <span className="token-symbol">
                        {token?.type === 'gm' && title === 'Pay' ? 'GM:' : ''}
                        {token?.type !== 'pool' && !token?.glvToken &&
                          (token?.isNotGm ? token?.tokenName === 'WGMX'
                            ? 'GMX'
                            : token?.tokenName : formatMarketName(token?.indexToken))}
                        {token?.glvToken && getGlvDisplayNameByTokenAddress(token.glvToken)}
                        {token?.type === 'gm' && (
                          <span
                            style={{
                              color: '#A3A3A3',
                              fontSize: '1.2rem',
                              marginLeft: '0.8rem',
                              fontWeight: '400',
                            }}
                          >
                            [{token?.showName}]
                          </span>
                        )}
                        {token?.glvToken && (
                          <span
                            style={{
                              color: '#A3A3A3',
                              fontSize: '1.2rem',
                              marginLeft: '0.8rem',
                            }}
                          >
                            [{token?.showName}]
                          </span>
                        )}

                        {token?.type === 'pool' && (
                          <>
                            <span>
                              {formatMarketName(token?.indexToken)}
                            </span>
                            <span className="token-symbol" style={{ color: '#A3A3A3', fontSize: '1.3rem' }}>
                              [{getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[token?.longToken]?.symbol)}-
                              {GMX_SOLANA_TOKENS_RAW[token?.shortToken]?.symbol}]
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="right-cell">
                      {['pay', 'receive'].includes(selectType) && (
                        <>
                          <div className="price-cell table-cell">
                            {new BN(token?.amount || '0').isZero() ? (
                              <span className="amount">-</span>
                            ) : (
                              <>
                                <span className="amount">
                                  {formatAmount(
                                    new BN(token?.amount || '0'),
                                    token?.decimals || token?.marketDecimals,
                                    4
                                  )}
                                </span>
                                <span className="price">
                                  {formatPriceUsd(
                                    formatParseUsdToBN(
                                      formatAmount(
                                        new BN(token?.amount || '0'),
                                        token?.decimals
                                      ).toString() || '0',
                                      token?.decimals
                                    ).mul(new BN(token?.price || 0)),
                                    { fallbackToZero: true }
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                        </>
                      )}
                      {selectType === 'market' && (
                        <>
                          {
                            token?.valueBN?.gt(new BN(0)) ?
                              <div>
                                <p className="amount" style={{ whiteSpace: 'nowrap' }}>
                                  {formatAmount(
                                    new BN(token?.amount || '0'),
                                    token?.decimals || token?.marketDecimals,
                                    2
                                  )} GM
                                </p>
                                <p className="price" style={{ marginTop: '0.1rem', textAlign: 'right', color: '#A3A3A3', fontSize: '1.2rem' }}>
                                  {formatUsd(token?.valueBN || new BN(0))}
                                </p>
                              </div>
                              : (isGlv ? null : <span style={{ color: '#fff !important' }}>-</span>)
                          }

                          <button
                            className="favorite-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(
                                token?.marketToken || token.tokenAddress
                              );
                            }}
                          >
                            <IconStar
                              className={
                                isFavorite ? 'star-filled' : 'star-empty'
                              }
                            />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className=' table-cell' style={{ padding: '0 2rem', fontSize: '1.2rem', color: '#A3A3A3', paddingBottom: '1rem' }}>
                    {
                      token?.glvToken &&
                      <span>
                        {t`Shifting From GM to GLV is similar to buying GLV with a GM token. You will be redirected to the buy GLV tab when selected.`}
                      </span>
                    }
                  </div>
                </>
              );
            })}

            {filteredAndSortedTokens.length === 0 && (
              <Empty description={t`No markets matched`} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenSelectDrawer;
