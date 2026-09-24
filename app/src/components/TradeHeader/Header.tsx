import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
} from 'react';
import { useAppStore } from '@/zustand/useAppStore';
import { GMX_SOLANA_TOKENS_RAW, GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS } from '@/config/program';
import { formatGmxSymbol } from '@/components/TradeBoxNew/utils/formatGmxSymbol';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import {
  formatPercentage,
  formatPriceUsd,
  formatRatePercentage,
  formatUsd,
  formatUsdToKMB,
} from '@/utils/legacy/format';
import { BN } from '@coral-xyz/anchor';
import { BN_ZERO } from '@/config/constants';
import HeaderPanel from './HeaderPanel';
import HeaderSwapPanel from './HeaderSwapPanel';
import { useIndexTokensData } from '@/components/TradeBoxNew/Hooks/useIndexTokensData';
import { getIconUrlPath } from '@/utils/lib/icon';
import { t, Trans } from '@lingui/macro';
import './Header.scss';
import './MarketAdaptMobile.scss';
import upIcons from '@/img/header/up.svg';
import downIcons from '@/img/header/down.svg';
import IconChevronDown from '@/img/trade/chevron-down.svg?react';
// import Tooltip from '@/components/Common/Tooltip/Tooltip';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import { useShallow } from 'zustand/react/shallow';
import { useEffectOnce } from 'react-use';
import cx from 'classnames';
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi';
import { useMedia } from 'react-use';
import { selectGtUserDetailsAmount } from '@/selectors/gt/gtUserDetailsSelectors';
import { marketInfo } from '@/zustand/slices/marketSlice'

interface PayerSwapItem {
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

const MIN_FADE_AREA = 24; //px
const MAX_SCROLL_LEFT_TO_END_AREA = 20; //px
const MIN_SCROLL_END_SPACE = 5; // px

type MarketRateKey =
  | 'longFundingFeeRateHour'
  | 'longBorrowingFeeRateHour'
  | 'longNetRatePerHour'
  | 'shortFundingFeeRateHour'
  | 'shortBorrowingFeeRateHour'
  | 'shortNetRatePerHour';

const toBNOrZero = (value?: string | number | BN | null) => {
  if (value === undefined || value === null || value === '') {
    return BN_ZERO;
  }

  return value instanceof BN ? value : new BN(value);
};

const TradeHeader: React.FC = () => {
  useIndexTokensData();
  const isScreen1024 = useMedia('(max-width: 1024px)');
  const isMobile = useMedia('(max-width: 768px)');
  const settings = useAppStore((state) => state.settings);
  const { isCollapsed } = settings;

  const payerSwapList = useAppStore(
    (state) => state.payerSwapTokens.payerSwapList as PayerSwapItem[]
  );
  const [payerSwapTokens, setPayerSwapTokens] =
    useState<PayerSwapItem[]>(payerSwapList);

  useEffect(() => {
    setPayerSwapTokens(payerSwapList);
  }, [payerSwapList]);

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isPriceDetailOpen, setIsPriceDetailOpen] = useState(false);
  const { indexToken, indexTokenData, sortedIndexTokens } = useAppStore(
    (state) => state.indexTokens
  );

  const { marketDirection } = useAppStore((state) => state.TradeboxNew);

  const { marketInfo: selectMarketInfo, marketsMap } = useAppStore((state) => state.markets);
  const [marketInfo, setMarketInfo] = useState<marketInfo>();

  useEffect(() => {
    if (marketsMap?.size && Object.keys(selectMarketInfo).length) {
      const nextMarketInfo = marketsMap.get(selectMarketInfo?.marketToken);

      if (nextMarketInfo) {
        setMarketInfo(nextMarketInfo);
      }
    }
  }, [marketsMap, selectMarketInfo])

  const marketRates = useMemo(() => {
    const rates = (marketInfo ?? {}) as Partial<Record<MarketRateKey, string | number | BN | null>>;

    return {
      longFundingFeeRateHour: toBNOrZero(rates.longFundingFeeRateHour),
      longBorrowingFeeRateHour: toBNOrZero(rates.longBorrowingFeeRateHour),
      longNetRatePerHour: toBNOrZero(rates.longNetRatePerHour),
      shortFundingFeeRateHour: toBNOrZero(rates.shortFundingFeeRateHour),
      shortBorrowingFeeRateHour: toBNOrZero(rates.shortBorrowingFeeRateHour),
      shortNetRatePerHour: toBNOrZero(rates.shortNetRatePerHour),
    };
  }, [marketInfo]);

  const selectSwapReceiveToken = useAppStore(
    (state) => state.swap.selectSwapReceiveToken
  );

  const { tokenPriceMap } = useAppStore(
    useShallow((state) => ({
      tokenPriceMap: state.tickersState.tokenPriceMap,
    }))
  );
  const getChangeClass = (rate: string | undefined) => {
    if (!rate) return '';
    return parseFloat(rate) >= 0 ? 'positive' : 'negative';
  };

  const formatTokenPrice = (priceValue) => {
    if (!priceValue || !selectSwapReceiveToken?.tokenAddress) return '$0.00';
    const decimals =
      GMX_SOLANA_TOKENS_RAW[selectSwapReceiveToken.tokenAddress]?.decimals || 0;
    const priceBN = new BN(priceValue).mul(new BN(10).pow(new BN(decimals)));
    return formatPriceUsd(priceBN);
  };

  const userAmount = useAppStore(selectGtUserDetailsAmount);

  const scrollableRef = useRef<HTMLDivElement | null>(null);

  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollRight, setScrollRight] = useState(0);
  const [maxFadeArea, setMaxFadeArea] = useState(75);
  const setScrolls = useCallback(() => {
    const scrollable = scrollableRef.current;
    if (!scrollable) {
      return;
    }

    const exchangeNode = document.querySelector('.Exchange');
    const chartNode = document.querySelector('.Exchange-left');
    const marketNode = document.querySelector('.market-selector');
    const exchangeRightNode = document.querySelector(
      '.App-header-container-other'
    );

    if (chartNode && exchangeRightNode && marketNode && scrollable) {
      // const exchangeWidth = exchangeNode.clientWidth
      // const exchangeWidth = exchangeNode.clientWidth

      const chartWidth = chartNode.clientWidth;
      const marketWidth = marketNode.clientWidth;
      const exchangeRightWidth = exchangeRightNode.clientWidth;


      if (!isScreen1024) {
        const exchangeWidth = exchangeNode.clientWidth;
        scrollable.style.width = `${exchangeWidth - exchangeRightWidth - marketWidth - 24}px`;
      } else {
        scrollable.style.width = `${chartWidth - marketWidth - 8}px`;
      }



      if (scrollable.scrollWidth > scrollable.clientWidth) {
        setScrollLeft(scrollable.scrollLeft);
        const right =
          scrollable.scrollWidth -
          scrollable.clientWidth -
          scrollable.scrollLeft;
        setScrollRight(right < MIN_SCROLL_END_SPACE ? 0 : right);
        setMaxFadeArea(scrollable.clientWidth / 10);
      } else {
        setScrollLeft(0);
        setScrollRight(0);
      }
    }
  }, [scrollableRef, isCollapsed, marketDirection, userAmount]);

  useEffectOnce(() => {
    setScrolls();

    window.addEventListener('resize', setScrolls);
    scrollableRef.current?.addEventListener('scroll', setScrolls);

    return () => {
      window.removeEventListener('resize', setScrolls);
      scrollableRef.current?.removeEventListener('scroll', setScrolls);
    };
  });

  useEffect(() => {
    if (indexToken) {
      setScrolls();
    }
  }, [indexToken, setScrolls, isCollapsed, userAmount]);

  const leftStyles = useMemo(() => {
    return {
      width: `${Math.max(MIN_FADE_AREA, Math.min(scrollLeft + 8, maxFadeArea))}px`,
    };
  }, [scrollLeft, maxFadeArea]);

  const rightStyles = useMemo(() => {
    return {
      width: `${Math.max(MIN_FADE_AREA, Math.min(scrollRight + 8, maxFadeArea))}px`,
    };
  }, [scrollRight, maxFadeArea]);

  const scrollTo = useCallback(
    (dir: 1 | -1) => {
      if (!scrollableRef.current) {
        return;
      }

      let nextNonVisibleElement: Element | undefined;

      const { left: containerLeft, width: containerWidth } =
        scrollableRef.current.getBoundingClientRect();
      const containerRight = containerLeft + containerWidth;

      for (const child of scrollableRef.current.children) {
        const {
          left: childLeft,
          right: childRight,
          width: childWidth,
        } = child.getBoundingClientRect();
        const childVisibleLeft = Math.max(childLeft, containerLeft);
        const childVisibleRight = Math.min(childRight, containerRight);
        const isVisible = childVisibleRight - childVisibleLeft === childWidth;

        if (dir === 1 && childLeft <= containerLeft) {
          nextNonVisibleElement = child;
          break;
        } else if (dir === -1 && childRight <= containerRight && !isVisible) {
          nextNonVisibleElement = child;
        }
      }

      if (!nextNonVisibleElement) {
        return;
      }

      let proposedScrollLeft =
        dir * nextNonVisibleElement.getBoundingClientRect().width;
      const nextLeftScroll =
        scrollableRef.current.scrollLeft + proposedScrollLeft;

      if (
        (dir === 1 &&
          containerWidth - nextLeftScroll < MAX_SCROLL_LEFT_TO_END_AREA) ||
        (dir === -1 && nextLeftScroll < MAX_SCROLL_LEFT_TO_END_AREA)
      ) {
        proposedScrollLeft = dir * containerWidth;
      }

      scrollableRef.current.scrollBy({
        left: proposedScrollLeft,
        behavior: 'smooth',
      });
      setScrolls();
    },
    [scrollableRef, setScrolls]
  );

  const scrollToLeft = useCallback(() => scrollTo(-1), [scrollTo]);
  const scrollToRight = useCallback(() => scrollTo(1), [scrollTo]);

  if (isMobile) {
    const currentToken =
      marketDirection === 'Swap' ? selectSwapReceiveToken : indexTokenData;
    const currentTokenAddress =
      marketDirection === 'Swap'
        ? selectSwapReceiveToken?.tokenAddress
        : indexToken;
    const tokenPrice = tokenPriceMap.get(currentTokenAddress);
    const price = tokenPrice?.price ? new BN(tokenPrice.price) : new BN(0);
    const percentChange = currentToken?.percentChange24h
      ? Number(currentToken.percentChange24h)
      : 0;
    const isPositive = percentChange >= 0;

    return (
      <>
        <div className="market-adapt-mobile__container">
          <div
            className="market-adapt-mobile"
            style={{
              borderBottom: isPriceDetailOpen && '0.1rem solid #535353',
            }}
          >
            <div
              className="market-adapt-mobile__left"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                requestAnimationFrame(() => {
                  setIsPanelOpen(true);
                });
              }}
              style={{ cursor: 'pointer' }}
            >
              <img
                className="market-adapt-mobile__icon"
                src={getIconUrlPath(
                  marketDirection === 'Swap'
                    ? selectSwapReceiveToken?.tokenName === 'WGMX' ? 'GMX' : selectSwapReceiveToken?.tokenName
                    : formatGmxSymbol(indexToken),
                  40
                )}
                alt={
                  marketDirection === 'Swap'
                    ? selectSwapReceiveToken?.tokenName === 'WGMX' ? 'GMX' : selectSwapReceiveToken?.tokenName
                    : formatGmxSymbol(indexToken)
                }
              />
              <div className="market-adapt-mobile__info">
                <div className="market-adapt-mobile__pair">
                  <span className="market-adapt-mobile__pair-name">
                    {marketDirection === 'Swap'
                      ? `${formatMarketName(selectSwapReceiveToken?.tokenAddress)}`
                      : `${formatMarketName(indexToken)}`}
                  </span>
                  <IconChevronDown
                    className={`market-adapt-mobile__chevron ${isPanelOpen ? 'market-adapt-mobile__chevron--open' : ''}`}
                    width={16}
                    height={16}
                  />
                </div>
                <div className="market-adapt-mobile__label text-secondary">
                  {marketDirection === 'Swap'
                    ? `[${selectSwapReceiveToken?.tokenName === 'WGMX' ? 'GMX' : selectSwapReceiveToken?.tokenName}-USDC]`
                    : marketInfo?.longToken
                      ? `[${marketInfo?.longToken === marketInfo?.shortToken
                        ? formatGmxSymbol(marketInfo?.longToken) +
                        '-' +
                        formatGmxSymbol(marketInfo?.shortToken)
                        : formatGmxSymbol(marketInfo?.longToken) +
                        '-' +
                        formatGmxSymbol(marketInfo?.shortToken)
                      }]`
                      : '...'}
                </div>
              </div>
            </div>

            <div
              className="market-adapt-mobile__right"
              onClick={() => setIsPriceDetailOpen(!isPriceDetailOpen)}
              style={{ cursor: 'pointer' }}
            >
              <div className="market-adapt-mobile__price-container">
                <span className="market-adapt-mobile__price">
                  {formatPriceUsd(price, {
                    displayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(marketInfo?.indexToken) ? 5 : 2,
                    isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(marketInfo?.indexToken)
                  })}
                </span>
                <IconChevronDown
                  className={`market-adapt-mobile__chevron ${isPriceDetailOpen ? 'market-adapt-mobile__chevron--open' : ''}`}
                  width={16}
                  height={16}
                />
              </div>
              <div
                className={`market-adapt-mobile__change ${isPositive
                  ? 'market-adapt-mobile__change--positive'
                  : 'market-adapt-mobile__change--negative'
                  }`}
              >
                {formatPercentage(percentChange, 2, { signed: true })}
              </div>
            </div>
          </div>
          {isPriceDetailOpen && (
            <div className="market-adapt-mobile__detail-panel">
              {marketDirection === 'Swap' ? (
                <>
                  <div className="market-adapt-mobile__detail-row">
                    <span className="market-adapt-mobile__detail-label">
                      24H High
                    </span>
                    <span className="market-adapt-mobile__detail-value">
                      {formatTokenPrice(
                        (selectSwapReceiveToken as any)?.maxUnitPrice24h
                      )}
                    </span>
                  </div>
                  <div className="market-adapt-mobile__detail-row">
                    <span className="market-adapt-mobile__detail-label">
                      24H Low
                    </span>
                    <span className="market-adapt-mobile__detail-value">
                      {formatTokenPrice(
                        (selectSwapReceiveToken as any)?.minUnitPrice24h
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="market-adapt-mobile__detail-row">
                    <span className="market-adapt-mobile__detail-label">
                      24H VOLUME
                    </span>
                    <span className="market-adapt-mobile__detail-value">
                      {formatUsdToKMB(new BN(marketInfo?.volume24h || '0'), { displayDecimals: 1 })}
                    </span>
                  </div>
                  <div className="market-adapt-mobile__detail-row">
                    <div className="market-adapt-mobile__detail-label-with-ratio">
                      <span className="market-adapt-mobile__detail-label">
                        OPEN INTEREST{' '}
                      </span>
                      <span className="market-adapt-mobile__detail-ratio">
                        <span className="market-adapt-mobile__detail-label">
                          (
                        </span>
                        <span className="market-adapt-mobile__detail-label">
                          {formatPercentage(
                            Number(marketInfo?.openInterestForLongRate) ?? 0,
                            0,
                            { fallbackToZero: true }
                          )}
                        </span>
                        <span style={{ margin: '0 2px', color: '#6b7280' }}>
                          /
                        </span>
                        <span className="market-adapt-mobile__detail-label">
                          {formatPercentage(
                            Number(marketInfo?.openInterestForShortRate) ?? 0,
                            0,
                            { fallbackToZero: true }
                          )}
                        </span>
                        <span className="market-adapt-mobile__detail-label">
                          )
                        </span>
                      </span>
                    </div>
                    <div className="market-adapt-mobile__detail-value-with-icons">
                      <div className="market-adapt-mobile__value-item">
                        <img
                          src={upIcons}
                          alt="up"
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span className="market-adapt-mobile__detail-value">
                          {formatUsdToKMB(
                            new BN(marketInfo?.openInterestForLong || '0'),
                            { displayDecimals: 1 }
                          )}
                        </span>
                      </div>
                      <span style={{ color: '#535353' }}>/</span>
                      <div className="market-adapt-mobile__value-item">
                        <img
                          src={downIcons}
                          alt="down"
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span className="market-adapt-mobile__detail-value">
                          {formatUsdToKMB(
                            new BN(marketInfo?.openInterestForShort || '0'),
                            { displayDecimals: 1 }
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="market-adapt-mobile__detail-row">
                    <span className="market-adapt-mobile__detail-label">
                      AVAILABLE LIQUIDITY
                    </span>
                    <div className="market-adapt-mobile__detail-value-with-icons">
                      <span className="market-adapt-mobile__detail-value">
                        {formatUsdToKMB(new BN(marketInfo?.lpLong || '0'), { displayDecimals: 1 })}
                      </span>
                      <span style={{ color: '#535353' }}>/</span>
                      <span className="market-adapt-mobile__detail-value">
                        {formatUsdToKMB(new BN(marketInfo?.lpShort || '0'), { displayDecimals: 1 })}
                      </span>
                    </div>
                  </div>
                  <div className="market-adapt-mobile__detail-row">
                    <span className="market-adapt-mobile__detail-label">
                      NET RATE 1H
                    </span>
                    <div className="market-adapt-mobile__detail-value-with-icons">
                      <div className="market-adapt-mobile__value-item">
                        <img
                          src={upIcons}
                          alt="up"
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span className="market-adapt-mobile__detail-value">
                          {formatRatePercentage(
                            marketRates.longNetRatePerHour,
                            4,
                            { signed: true }
                          )}
                        </span>
                      </div>
                      <span style={{ color: '#535353' }}>/</span>
                      <div className="market-adapt-mobile__value-item">
                        <img
                          src={downIcons}
                          alt="down"
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span className="market-adapt-mobile__detail-value">
                          {formatRatePercentage(
                            marketRates.shortNetRatePerHour,
                            4,
                            { signed: true }
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {marketDirection === 'Swap' ? (
          <HeaderSwapPanel
            isOpen={isPanelOpen}
            onClose={() => setIsPanelOpen(false)}
            payerSwapTokens={payerSwapTokens}
          />
        ) : (
          <HeaderPanel
            isOpen={isPanelOpen}
            onClose={() => setIsPanelOpen(false)}
            sortedTokens={sortedIndexTokens}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="trade-header">
        <div className="market-selector" onClick={() => setIsPanelOpen(true)}>
          <div className="token-info">
            {marketDirection === 'Swap' && (
              <>
                <div className="bold rounded-[0.4rem] bg-[#FA7B4E33] px-[0.7rem] py-[0.3rem] text-[1.4rem] font-medium text-[#FA7B4E]">
                  Swap
                </div>
              </>
            )}
            <img
              className="z-20 w-[2rem]"
              src={getIconUrlPath(
                marketDirection === 'Swap'
                  ? selectSwapReceiveToken?.tokenName === 'WGMX' ? 'GMX' : selectSwapReceiveToken?.tokenName
                  : formatGmxSymbol(indexToken),
                24
              )}
              alt={
                marketDirection === 'Swap'
                  ? selectSwapReceiveToken?.tokenName === 'WGMX' ? 'GMX' : selectSwapReceiveToken?.tokenName
                  : formatGmxSymbol(indexToken)
              }
              width={20}
            />
            {marketDirection === 'Swap' ? (
              <>
                <div>{formatMarketName(selectSwapReceiveToken?.tokenAddress)}</div>
              </>
            ) : (
              <>
                <div className="token-details">
                  <div className="token-symbol">
                    {formatMarketName(indexToken)}
                    {marketInfo?.longToken ? (
                      <>
                        <span>
                          [
                          {marketInfo?.longToken === marketInfo?.shortToken
                            ? formatGmxSymbol(marketInfo?.longToken) +
                            '-' +
                            formatGmxSymbol(marketInfo?.shortToken)
                            : formatGmxSymbol(marketInfo?.longToken) +
                            '-' +
                            formatGmxSymbol(marketInfo?.shortToken)}
                          ]
                        </span>
                      </>
                    ) : (
                      <>...</>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          {/* <svg
            className={`dropdown-arrow ${isPanelOpen ? 'open' : ''}`}
            viewBox="0 0 24 24"
          >
            <path d="M7 10l5 5 5-5z" />
          </svg> */}
          <IconChevronDown
            className={`dropdown-arrow ${isPanelOpen ? 'open' : ''}`}
          />
        </div>

        <div className="relative flex overflow-hidden">
          <div className="pointer-events-none absolute z-40 flex h-full w-full flex-row justify-between">
            <div
              className={cx('Chart-top-scrollable-fade-left', {
                '!pointer-events-none opacity-0': scrollLeft <= 0,
                'opacity-100': scrollLeft > 0,
              })}
              style={leftStyles}
              onClick={scrollToLeft}
            >
              {
                <BiChevronLeft
                  className="text-typography-secondary"
                  size={24}
                />
              }
            </div>
            <div
              className={cx('Chart-top-scrollable-fade-right', {
                '!pointer-events-none opacity-0': scrollRight <= 0,
                'opacity-100': scrollRight > 0,
              })}
              style={rightStyles}
              onClick={scrollToRight}
            >
              {
                <BiChevronRight
                  className="text-typography-secondary"
                  size={24}
                />
              }
            </div>
          </div>
          <div
            className={cx('scrollbar-hide flex gap-20 overflow-x-auto')}
            ref={scrollableRef}
          >
            {marketDirection === 'Swap' ? (
              <>
                <div className="market-stats">
                  <div className="stat-item">
                    <div className="stat-value price">
                      {formatPriceUsd(
                        new BN(
                          tokenPriceMap.get(
                            selectSwapReceiveToken?.tokenAddress
                          )?.price || 0
                        ),
                        {
                          displayDecimals: 12,
                        }
                      )}
                    </div>
                    <div
                      className={`stat-change ${getChangeClass(selectSwapReceiveToken?.percentChange24h)}`}
                    >
                      {formatPercentage(
                        Number(selectSwapReceiveToken?.percentChange24h),
                        2,
                        {
                          signed: false,
                        }
                      )}
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">
                      <Trans>24H High</Trans>
                    </div>
                    <div className="stat-value" style={{ color: '#ffffff' }}>
                      {formatTokenPrice(
                        selectSwapReceiveToken?.maxUnitPrice24h
                      )}
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">
                      <Trans>24H Low</Trans>
                    </div>
                    <div className="stat-value" style={{ color: '#ffffff' }}>
                      {formatTokenPrice(
                        selectSwapReceiveToken?.minUnitPrice24h
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="market-stats">
                  <div className="stat-item">
                    <div className="stat-value price">
                      {formatPriceUsd(
                        new BN(
                          tokenPriceMap.get(indexToken)?.price ||
                          indexTokenData?.price
                        ),
                        {
                          isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(indexToken)
                        }
                      )}
                    </div>
                    <div
                      className={`stat-change ${getChangeClass(indexTokenData?.percentChange24h)}`}
                    >
                      {formatPercentage(
                        Number(indexTokenData?.percentChange24h),
                        2,
                        {
                          signed: true,
                        }
                      )}
                    </div>
                  </div>

                  <div className="stat-item">
                    <div className="stat-label">
                      <Trans>24H Volume</Trans>
                    </div>
                    <div className="stat-value" style={{ color: '#ffffff' }}>
                      {formatUsdToKMB(new BN(marketInfo?.volume24h || '0'), { displayDecimals: 1 })}
                    </div>
                  </div>

                  <div className="stat-item">
                    <div className="stat-label">
                      <Trans>Open Interest</Trans> &nbsp;(
                      <span className="positive">
                        {formatPercentage(
                          Number(marketInfo?.openInterestForLongRate) ?? 0,
                          0,
                          {
                            fallbackToZero: true,
                          }
                        )}
                      </span>
                      <span style={{ margin: '0 2px', color: '#6b7280' }}>
                        /
                      </span>
                      <span className="negative">
                        {formatPercentage(
                          Number(marketInfo?.openInterestForShortRate) ?? 0,
                          0,
                          {
                            fallbackToZero: true,
                          }
                        )}
                      </span>
                      )
                    </div>
                    <div className="stat-value">
                      <img
                        src={upIcons}
                        alt="up"
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span>
                        {formatUsdToKMB(
                          new BN(marketInfo?.openInterestForLong || '0'),
                          { displayDecimals: 1 }
                        )}
                      </span>
                      <span style={{ color: '#6b7280' }}>/</span>
                      <img
                        src={downIcons}
                        alt="down"
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span>
                        {formatUsdToKMB(
                          new BN(marketInfo?.openInterestForShort || '0'),
                          { displayDecimals: 1 }
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="stat-item">
                    <div className="stat-label">
                      <Trans>Available Liquidity</Trans>
                    </div>
                    <div className="stat-value">
                      <TooltipWithPortal
                        disableHandleStyle={true}
                        handle={
                          <div
                            style={{
                              alignItems: 'center',
                              textDecoration: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {formatUsdToKMB(
                              new BN(marketInfo?.lpLong) ?? BN_ZERO,
                              { displayDecimals: 1 }
                            )}
                          </div>
                        }
                        position="bottom-start"
                        renderContent={() => (
                          <>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div style={{ color: '#A3A3A3' }}>
                                <Trans>
                                  Long{' '}
                                  {GMX_SOLANA_TOKENS_RAW[indexToken]?.displaySymbol}{' '}
                                  Reserve:
                                </Trans>
                              </div>
                              <div>
                                {formatUsd(
                                  new BN(
                                    marketInfo?.reservedValueForLong || '0'
                                  )
                                )}{' '}
                                /{' '}
                                {formatUsd(
                                  new BN(
                                    marketInfo?.maxReserveValueForLong || '0'
                                  )
                                )}
                              </div>
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div style={{ color: '#A3A3A3' }}>
                                <Trans>
                                  Long{' '}
                                  {GMX_SOLANA_TOKENS_RAW[indexToken]?.displaySymbol}{' '}
                                  Open:
                                </Trans>
                              </div>
                              <div>
                                {formatUsd(
                                  new BN(marketInfo?.openInterestForLong || '0')
                                )}{' '}
                                /{' '}
                                {formatUsd(
                                  new BN(
                                    marketInfo?.maxOpenInterestForLong || '0'
                                  )
                                )}
                              </div>
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div style={{ color: '#A3A3A3' }}>
                                <Trans>Interest:</Trans>
                              </div>
                            </div>
                            <br />

                            <span>
                              {t`The long reserve accounts for the PnL of open positions, while the open interest does not. The available liquidity will be the lesser of the difference between the maximum value and the current value for both the reserve and open interest.`}
                            </span>
                          </>
                        )}
                      />
                      <span style={{ color: '#6b7280' }}>/</span>
                      <TooltipWithPortal
                        disableHandleStyle={true}
                        handle={
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              textDecoration: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {formatUsdToKMB(
                              new BN(marketInfo?.lpShort) ?? BN_ZERO,
                              { displayDecimals: 1 }
                            )}
                          </div>
                        }
                        position="bottom-start"
                        renderContent={() => (
                          <>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div style={{ color: '#A3A3A3' }}>
                                <Trans>
                                  Short{' '}
                                  {GMX_SOLANA_TOKENS_RAW[indexToken]?.displaySymbol}{' '}
                                  Reserve:
                                </Trans>
                              </div>
                              <div>
                                {formatUsd(
                                  new BN(
                                    marketInfo?.reservedValueForShort || '0'
                                  )
                                )}{' '}
                                /{' '}
                                {formatUsd(
                                  new BN(
                                    marketInfo?.maxReserveValueForShort || '0'
                                  )
                                )}
                              </div>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div style={{ color: '#A3A3A3' }}>
                                <Trans>
                                  Short{' '}
                                  {GMX_SOLANA_TOKENS_RAW[indexToken]?.displaySymbol}{' '}
                                  Open:
                                </Trans>
                              </div>
                              <div>
                                {formatUsd(
                                  new BN(
                                    marketInfo?.openInterestForShort || '0'
                                  )
                                )}{' '}
                                /{' '}
                                {formatUsd(
                                  new BN(
                                    marketInfo?.maxOpenInterestForShort || '0'
                                  )
                                )}
                              </div>
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div style={{ color: '#A3A3A3' }}>
                                <Trans>Interest:</Trans>
                              </div>
                            </div>
                            <br />

                            <span>
                              {t`The available liquidity will be the lesser of the difference between the maximum value and the current value for both the reserve and open interest.`}
                            </span>
                          </>
                        )}
                      />
                    </div>
                  </div>

                  <div className="stat-item">
                    <div className="stat-label">
                      <TooltipWithPortal
                        disableHandleStyle={true}
                        handle={
                          <span
                            className="cursor-pointer"
                            style={{
                              textDecoration: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <Trans>Net Rate 1H</Trans>
                          </span>
                        }
                        position="bottom-start"
                        renderContent={() => (
                          <>
                            <div
                              style={{ textTransform: 'none', color: '#fff' }}
                            >
                              <p>
                                <Trans>
                                  Net rate combines funding and borrowing fees
                                  but excludes open, swap or impact fees.
                                </Trans>
                              </p>
                              <br />
                              <p>
                                <Trans>
                                  Funding fees help to balance longs and shorts
                                  and are exchanged between both sides.
                                </Trans>
                              </p>
                              <br />
                              <p>
                                <Trans>
                                  Borrowing fees help ensure available
                                  liquidity.
                                </Trans>
                              </p>
                            </div>
                          </>
                        )}
                      />
                    </div>
                    <div className={`stat-value `}>
                      <TooltipWithPortal
                        disableHandleStyle={true}
                        handle={
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'flex-end',
                              textDecoration: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <img
                              src={upIcons}
                              alt="up"
                              style={{ width: '16px', height: '16px' }}
                            />
                            <span style={{ textDecoration: 'none' }}>
                              {formatRatePercentage(
                                marketRates.longNetRatePerHour,
                                4,
                                {
                                  signed: true,
                                }
                              )}
                            </span>
                            &nbsp;<span style={{ color: '#6b7280' }}>/</span>
                            &nbsp;
                            <img
                              src={downIcons}
                              alt="down"
                              style={{ width: '16px', height: '16px' }}
                            />
                            <span style={{ textDecoration: 'none' }}>
                              {formatRatePercentage(
                                marketRates.shortNetRatePerHour,
                                4,
                                {
                                  signed: true,
                                }
                              )}
                            </span>
                          </div>
                        }
                        position="bottom-start"
                        renderContent={() => (
                          <>
                            <p style={{ color: '#A3A3A3' }}>
                              <Trans>Long Positions Net Rate:</Trans>
                            </p>
                            <p>
                              8h:{' '}
                              <span
                                className={
                                  marketRates.longNetRatePerHour.gt(BN_ZERO)
                                    ? 'positive'
                                    : 'negative'
                                }
                              >
                                {formatRatePercentage(
                                  marketRates.longNetRatePerHour.mul(new BN(8))
                                )}
                              </span>{' '}
                              &nbsp; 24h:{' '}
                              <span
                                className={
                                  marketRates.longNetRatePerHour.gt(BN_ZERO)
                                    ? 'positive'
                                    : 'negative'
                                }
                              >
                                {formatRatePercentage(
                                  marketRates.longNetRatePerHour.mul(new BN(24))
                                )}
                              </span>
                              &nbsp; 365d:{' '}
                              <span
                                className={
                                  marketRates.longNetRatePerHour.gt(BN_ZERO)
                                    ? 'positive'
                                    : 'negative'
                                }
                              >
                                {formatRatePercentage(
                                  marketRates.longNetRatePerHour.mul(new BN(365).mul(new BN(24)))
                                )}
                              </span>
                            </p>
                            <br />
                            <p>
                              {
                                marketRates.longFundingFeeRateHour.gt(BN_ZERO)
                                  ? t`Long positions receive a funding fee of`
                                  : t`Long positions pay a funding fee of`
                              }
                              {' '}
                              <span
                                className={
                                  marketRates.longFundingFeeRateHour.gt(BN_ZERO)
                                    ? 'positive'
                                    : 'negative'
                                }
                              >
                                {formatRatePercentage(
                                  marketRates.longFundingFeeRateHour
                                )}
                              </span>{' '}
                              {
                                marketRates.longBorrowingFeeRateHour.eq(BN_ZERO) ? t`per hour and do not pay a borrowing fee.` : t`per hour and pay a borrowing fee of`
                              }{' '}
                              {
                                marketRates.longBorrowingFeeRateHour.eq(BN_ZERO) ? null :
                                  <>
                                    <span
                                      className={
                                        marketRates.longBorrowingFeeRateHour.gt(BN_ZERO)
                                          ? 'positive'
                                          : 'negative'
                                      }
                                    >
                                      {formatRatePercentage(
                                        marketRates.longBorrowingFeeRateHour
                                      )}
                                    </span>{' '}
                                    {t`per hour.`}
                                  </>
                              }
                            </p>
                            {/* <br />
                            <p><a
                                href={`https://community.chaoslabs.xyz/gmx-solana/risk/markets/${marketInfo?.marketToken}/pool`}
                                target="_blank"
                                style={{ cursor: 'pointer', color: 'inherit', textDecoration: 'none' }} rel="noopener noreferrer"
                              >
                                <Trans>→ View Fee Rates on Chaos Labs</Trans>
                              </a></p> */}

                            <br />
                            <br />
                            <p style={{ color: '#A3A3A3' }}>
                              <Trans>Short Positions Net Rate:</Trans>
                            </p>
                            <p>
                              8h:{' '}
                              <span
                                className={
                                  marketRates.shortNetRatePerHour.gt(BN_ZERO)
                                    ? 'positive'
                                    : 'negative'
                                }
                              >
                                {formatRatePercentage(
                                  marketRates.shortNetRatePerHour.mul(new BN(8))
                                )}
                              </span>
                              &nbsp; 24h:{' '}
                              <span
                                className={
                                  marketRates.shortNetRatePerHour.gt(BN_ZERO)
                                    ? 'positive'
                                    : 'negative'
                                }
                              >
                                {formatRatePercentage(
                                  marketRates.shortNetRatePerHour.mul(new BN(24))
                                )}
                              </span>
                              &nbsp; 365d:{' '}
                              <span
                                className={
                                  marketRates.shortNetRatePerHour.gt(BN_ZERO)
                                    ? 'positive'
                                    : 'negative'
                                }
                              >
                                {formatRatePercentage(
                                  marketRates.shortNetRatePerHour.mul(new BN(365).mul(new BN(24)))
                                )}
                              </span>
                            </p>
                            <br />
                            <p>
                              {marketRates.shortFundingFeeRateHour.gt(BN_ZERO)
                                ? t`Short positions receive a funding fee of`
                                : t`Short positions pay a funding fee of`
                              }
                              {' '}
                              <span
                                className={
                                  marketRates.shortFundingFeeRateHour.gt(BN_ZERO)
                                    ? 'positive'
                                    : 'negative'
                                }
                              >
                                {formatRatePercentage(
                                  marketRates.shortFundingFeeRateHour
                                )}
                              </span>{' '}
                              {
                                marketRates.shortBorrowingFeeRateHour.eq(BN_ZERO) ? t`per hour and do not pay a borrowing fee.` : t`per hour and pay a borrowing fee of`
                              }{' '}
                              {
                                !marketRates.shortBorrowingFeeRateHour.eq(BN_ZERO) ?
                                  <>
                                    <span
                                      className={
                                        marketRates.shortBorrowingFeeRateHour.gt(BN_ZERO)
                                          ? 'positive'
                                          : 'negative'
                                      }
                                    >
                                      {formatRatePercentage(
                                        marketRates.shortBorrowingFeeRateHour
                                      )}
                                    </span>{' '}
                                    {t`per hour.`}
                                  </> : null
                              }
                            </p>
                            {/* <br />
                            <p><a
                                href={`https://community.chaoslabs.xyz/gmx-solana/risk/markets/${marketInfo?.marketToken}/pool`}
                                target="_blank"
                                style={{ color: 'inherit', textDecoration: 'none' }} rel="noopener noreferrer"
                              >
                                <Trans>→ View Fee Rates on Chaos Labs</Trans>
                              </a></p> */}
                          </>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {marketDirection === 'Swap' ? (
        <HeaderSwapPanel
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          payerSwapTokens={payerSwapTokens}
        />
      ) : (
        <HeaderPanel
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          sortedTokens={sortedIndexTokens}
        />
      )}
    </>
  );
};

export default TradeHeader;
