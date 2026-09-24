import { useEffect, useState, useRef, useCallback } from 'react';
import { getGmw215Enabled, getGmw456Enabled } from '@/config/featureFlagEnable';
import { Popover } from '@headlessui/react';
import { useStoreProgram } from '@/contexts/anchor';
import { useAppStore } from '@/zustand/useAppStore';
import { formatLeverage } from '../../utils/formatLeverage';
import { BN } from '@coral-xyz/anchor';
import PoolPanel from './tokensPanel/PoolPanel';
import CollateralPanel from './tokensPanel/CollateralPanel';
import { formatGmxSymbol } from '@/components/TradeBoxNew/utils/formatGmxSymbol';
import ReceivePanel from '@/components/ExchangeNew/ExchangeList/PositionList/components/MarketDecrease/panel/index';
import { t } from '@lingui/macro';
import { useShallow } from 'zustand/react/shallow';
import IconChevronDown from '@/img/trade/chevron-down.svg?react';
import IconChevronUp from '@/img/trade/chevron-up.svg?react';
import DownIcon from '@/img/pools/down.svg?react';
import cx from 'classnames';

const TokensSelectCom = ({
  type,
  showLabel = true,
  changeToken,
  applyBackground,
  wrapperClassName = '',
  popoverButtonClassName = '',
  popoverButtonIconClassName = '',
}: {
  type?: string;
  showLabel?: boolean;
  changeToken?: (token: any) => void;
  applyBackground?: boolean;
  wrapperClassName?: string;
  popoverButtonClassName?: string;
  popoverButtonIconClassName?: string;
}) => {
  const USDT_TOKEN_ADDRESS = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
  const isGmw215Enabled = getGmw215Enabled();
  const {
    leverage,
    graphObj,
    marketDirection,
    tradeMoney,
    priorityFees,
    payTokenNum,
    slippage,
    marketType,
    limitPrice,
  } = useAppStore(useShallow((state) => state.TradeboxNew));
  const {
    marketInfo,
    marketInfos,
    setMarketInfo,
    marketBase64Map,
    setMarketImpactList,
    setHasPoolChange,
  } = useAppStore(useShallow((state) => state.markets));
  const { indexToken, hasIndexTokenChange, setHasIndexTokenChange } =
    useAppStore(useShallow((state) => state.indexTokens));
  const {
    collateralToken,
    collateralTokens,
    setCollateralToken,
    setHasCollateralChange,
    collateralExchangeRates,
    hasCollateralChange,
  } = useAppStore(useShallow((state) => state.collateralTokens));
  const {
    payerSwapTokenInfo,
    payerInfo,
    payerSwapList,
    hasPayTokenChange,
    setPayerSwapTokenInfo,
    setHasPayTokenChange,
  } = useAppStore(useShallow((state) => state.payerSwapTokens));
  const { tokenPriceMap } = useAppStore(
    useShallow((state) => ({
      tokenPriceMap: state.tickersState.tokenPriceMap,
    }))
  );
  const SETTING_VALUE: BN = new BN(50000).mul(new BN(10).pow(new BN(20)));
  const { positionMap } = useAppStore(
    useShallow((state) => state.positionState)
  );
  const [collateralData, setCollateralData] = useState<any[]>([]);
  const [marketData, setMarketData] = useState<any>([]);
  const [selectPayTokenName, setSelectPayTokenName] = useState<string>();
  const [popoverOffset, setPopoverOffset] = useState<number>(0);
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverOpenRef = useRef<boolean>(false);
  const storeProgram = useStoreProgram();


  const getPadding = (el: Element | null) => {
    if (!el) return { right: 0 };
    const style = window.getComputedStyle(el);
    return {
      right: parseFloat(style.paddingRight) || 0,
    };
  };

  const getScrollbarWidth = () => {
    const bottomPopContainer = document.querySelector('.bottom-nav-pop');

    if (!bottomPopContainer) {
      return 0;
    }

    const hasScrollbar =
      bottomPopContainer.scrollHeight > bottomPopContainer.clientHeight;

    if (!hasScrollbar) {
      return 0;
    }
    return bottomPopContainer.offsetWidth - bottomPopContainer.clientWidth;
  };
  const calculateOffset = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const gapRight = window.innerWidth - rect.right;

    if (window.innerWidth <= 768) {
      setIsSmallScreen(true);
      setPopoverOffset(rect.left);
      return;
    }

    setIsSmallScreen(false);

    if (window.innerWidth < 1025) {
      setPopoverOffset(0);
      return;
    }

    setPopoverOffset(145);
  }, []);

  useEffect(() => {
    calculateOffset();

    window.addEventListener('resize', calculateOffset);

    return () => {
      window.removeEventListener('resize', calculateOffset);
    };
  }, [calculateOffset]);

  useEffect(() => {
    if (popoverOpenRef.current) {
      calculateOffset();
      const timer = setTimeout(calculateOffset, 10);
      return () => clearTimeout(timer);
    }
  }, [calculateOffset]);

  // show payToken
  useEffect(() => {
    if (!payerInfo.connected) {
      const defaultPayToken = payerSwapList.find(
        (item) => item.tokenName?.toUpperCase() === 'USDC'
      );
      if (defaultPayToken || payerSwapList[0]) {
        setPayerSwapTokenInfo(defaultPayToken || payerSwapList[0]);
      }
      setHasPayTokenChange(false);
      return;
    }
    if (payerSwapList.length) {
      const isUsdtSingleMarket =
        marketInfo?.longToken === USDT_TOKEN_ADDRESS &&
        marketInfo?.shortToken === USDT_TOKEN_ADDRESS;
      const defaultPayToken =
        isUsdtSingleMarket
          ? payerSwapList.find((item) => item.tokenAddress === USDT_TOKEN_ADDRESS) || payerSwapList[0]
          : payerSwapList[0];

      if (isUsdtSingleMarket) {
        setSelectPayTokenName(defaultPayToken?.tokenName);
        setPayerSwapTokenInfo(defaultPayToken);
        return;
      }

      if (payerInfo.connected && !hasPayTokenChange) {
        setSelectPayTokenName(defaultPayToken?.tokenName);
        setTimeout(() => {
          setPayerSwapTokenInfo(defaultPayToken);
        }, 0);
        return;
      }
      if (payerSwapTokenInfo?.tokenAddress) {
        const payTokenInfo = payerSwapList.find(
          (item) => item.tokenAddress === payerSwapTokenInfo.tokenAddress
        );
        if (payTokenInfo) {
          setSelectPayTokenName(payTokenInfo.tokenName);
          setPayerSwapTokenInfo(payTokenInfo);
        }
      } else {
        setSelectPayTokenName(defaultPayToken?.tokenName);
        setTimeout(() => {
          setPayerSwapTokenInfo(defaultPayToken);
        }, 0);
      }
    }
  }, [marketInfo?.longToken, marketInfo?.shortToken, payerSwapList, payerInfo.connected, setHasPayTokenChange, setPayerSwapTokenInfo, hasPayTokenChange, payerSwapTokenInfo.tokenAddress]);

  // sort marketInfos
  useEffect(() => {
    (() => {
      if (marketInfos && Array.isArray(marketInfos)) {
        const sortedMarketInfos = sortByLq(marketInfos);
        if (sortedMarketInfos.length > 0) {
          if (hasIndexTokenChange) {
            if (getGmw456Enabled()) {
              const matchingPool = sortedMarketInfos.find(
                (m) => m.marketToken === marketInfo?.marketToken
              );
              setMarketInfo(matchingPool ?? sortedMarketInfos[0]);
            } else {
              setMarketInfo(sortedMarketInfos[0]);
            }
            setHasIndexTokenChange(false);
            setHasPoolChange(true);
          } else {
            if (!marketInfo?.marketToken) {
              setMarketInfo(sortedMarketInfos[0]);
            }
          }
          setMarketImpactList([...sortedMarketInfos]); 
          setMarketData([...sortedMarketInfos]);
        }
      }
    })();
  }, [marketInfos, payerInfo.connected, collateralToken, tradeMoney]);

  // sort collateralTokens
  useEffect(() => {
    (() => {
      if (collateralTokens.length) {
        let processedTokens = [];
        if (!payerInfo.connected) {
          if (marketInfo) {
            const poolTokens = new Set([
              marketInfo.longToken,
              marketInfo.shortToken,
            ]);
            let matchingTokens = [];
            const nonMatchingTokens = [];
            collateralTokens.forEach((token) => {
              if (!poolTokens.has(token)) {
                nonMatchingTokens.push(token);
              }
            });
            if (marketDirection === 'Long') {
              matchingTokens = Array.from(
                new Set([marketInfo.longToken, marketInfo.shortToken])
              );
            } else {
              matchingTokens = Array.from(
                new Set([marketInfo.shortToken, marketInfo.longToken])
              );
            }
            const sortByExchangeRateNonMatchingTokens = sortByExchangeRate(nonMatchingTokens);
            const newSortByExchangeRateMatchingTokens = matchingTokens.map(
              (item) => {
                return {
                  isGrey: false,
                  token: item,
                };
              }
            );
            const newSortByExchangeRateNonMatchingTokens =
              sortByExchangeRateNonMatchingTokens.map((item) => {
                return {
                  isGrey: true,
                  token: item,
                };
              });
            processedTokens = [
              ...newSortByExchangeRateMatchingTokens,
              ...newSortByExchangeRateNonMatchingTokens,
            ];
            setCollateralData(processedTokens);
            if (!hasCollateralChange) {
              setCollateralToken(processedTokens[0]?.token);
            }
          }
        } else {
          if (marketInfo) {
            const poolTokens = new Set([
              marketInfo.longToken,
              marketInfo.shortToken,
            ]);
            const matchingTokens = [];
            const nonMatchingTokens = [];
            collateralTokens.forEach((token) => {
              if (poolTokens.has(token)) {
                matchingTokens.push(token);
              } else {
                nonMatchingTokens.push(token);
              }
            });
            const sortByExchangeRateMatchingTokens = sortByExchangeRate(matchingTokens);
            const sortByExchangeRateNonMatchingTokens = sortByExchangeRate(nonMatchingTokens);
            const newSortByExchangeRateMatchingTokens =
              sortByExchangeRateMatchingTokens?.map((item) => {
                return {
                  isGrey: false,
                  token: item,
                };
              });
            const newSortByExchangeRateNonMatchingTokens =
              sortByExchangeRateNonMatchingTokens?.map((item) => {
                return {
                  isGrey: true,
                  token: item,
                };
              });
            processedTokens = [
              ...newSortByExchangeRateMatchingTokens,
              ...newSortByExchangeRateNonMatchingTokens,
            ];
            setCollateralData(processedTokens);
            if (!hasCollateralChange) {
              setCollateralToken(processedTokens[0]?.token);
            }
          }
        }
      }
    })();
  }, [collateralTokens, payerInfo.connected, marketInfo]);

  useEffect(() => {
    if (!payerInfo.connected) {
      setHasCollateralChange(false);
    }
  }, [payerInfo.connected]);

  // marketInfos sort
  function sortByLq(marketInfos: any[]) {
    if (!marketInfos.length) {
      return [];
    }
    return [...marketInfos].sort((a, b) => {
      const aLp = new BN(
        marketDirection === 'Long' ? a?.lpLong : (a?.lpShort ?? '0')
      );
      const bLp = new BN(
        marketDirection === 'Long' ? b?.lpLong : (b?.lpShort ?? '0')
      );
      return bLp.cmp(aLp);
    });
  }

  // collateral tokens sort
  function sortByExchangeRate(tokens: string[]) {
    if (!tokens.length) {
      return [];
    }
    // console.log('collateralExchangeRates', collateralExchangeRates)
    return [...tokens].sort((a, b) => {
      const aExchangeRate = collateralExchangeRates.get(a) || new BN(0);
      const bExchangeRate = collateralExchangeRates.get(b) || new BN(0);
      const rateCompare = bExchangeRate.cmp(aExchangeRate);
      if (rateCompare !== 0) {
        return rateCompare;
      }

      if (a < b) {
        return 1;
      }
      if (a > b) {
        return -1;
      }
      return 0;
    });
  }
  return (
    <Popover className="relative w-full">
      {({ open, close }) => {
        if (open && !popoverOpenRef.current) {
          popoverOpenRef.current = true;
          setTimeout(() => {
            calculateOffset();
            setTimeout(calculateOffset, 10);
          }, 0);
        } else if (!open && popoverOpenRef.current) {
          popoverOpenRef.current = false;
        }

        return (
          <>
            <div
              ref={containerRef}
              className={`ExchangeRowCom flexAlignCenter ${applyBackground ? `commonBoxBg ${open ? 'active' : ''}` : ''} ${wrapperClassName} ${isGmw215Enabled ? 'tokens-select-gmw215' : ''}`}
              style={{ display: 'flex', alignItems: 'center', width: '100%' }}
            >
              {showLabel && (
                <span
                  className={`text-secondary text-[1.3rem] ${isGmw215Enabled ? 'tokens-select-label' : ''}`}
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <span className={isGmw215Enabled ? 'tokens-select-label-text min-w-[50px]' : 'min-w-[50px]'} style={isGmw215Enabled ? undefined : { color: '#A3A3A3' }}>
                    {type !== 'Receive' ? t`${type}` : null}
                  </span>
                </span>
              )}

              <Popover.Button
                as="div"
                className={cx(
                  'text-[1.2rem] hover:text-primary-500/80 flexAlignCenter cursor-pointer',
                  isGmw215Enabled && 'tokens-select-gmw215-value w-full',
                  popoverButtonClassName
                )}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                {isGmw215Enabled ? (
                  <>
                    <span
                      className={`flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap block ${['Collateral', t`Collateral`].includes(type) ? 'text-right' : ''}`}
                    >
                      {['Pool', t`Pool`].includes(type) &&
                        (!marketInfo?.longToken
                          ? t`Best Pool`
                          : `${formatGmxSymbol(marketInfo?.longToken)}-${formatGmxSymbol(marketInfo?.shortToken)}`)}
                      {['Collateral', t`Collateral`].includes(type) &&
                        formatGmxSymbol(collateralToken)}
                      {type === 'mtp' && selectPayTokenName}
                      {type === 'size' && formatGmxSymbol(indexToken)}
                    </span>
                    <span className="shrink-0 ml-2">
                      <DownIcon
                        className={cx(
                          'h-[1.2rem] w-[1.2rem]',
                          open && 'rotate-180',
                          popoverButtonIconClassName
                        )}
                      />
                    </span>
                  </>
                ) : (
                  <>
                    {['Pool', t`Pool`].includes(type) && (
                      <span>
                        {!marketInfo?.longToken
                          ? t`Best Pool`
                          : `${formatGmxSymbol(marketInfo?.longToken)}-${formatGmxSymbol(marketInfo?.shortToken)}`}
                      </span>
                    )}
                    {['Collateral', t`Collateral`].includes(type) && (
                      <span>{formatGmxSymbol(collateralToken)}</span>
                    )}
                    {type === 'mtp' && <span>{selectPayTokenName}</span>}
                    {type === 'size' && <span>{formatGmxSymbol(indexToken)}</span>}
                    {open ? <IconChevronUp /> : <IconChevronDown />}
                  </>
                )}
              </Popover.Button>
            </div>

            <Popover.Panel
              ref={popoverRef}
              className={`popover-customize-item absolute right-0 z-10 mt-2 ${['Pool', t`Pool`].includes(type) && isSmallScreen
                ? 'box-border'
                : 'w-max'
                } scrollbar-hide max-h-[200px] overflow-y-auto`}
              style={(() => {
                const isPoolType = ['Pool', t`Pool`].includes(type);
                const isCollateralType = [
                  'Collateral',
                  t`Collateral`,
                ].includes(type);
                const isReceive = type === 'Receive';
                if (isPoolType && isSmallScreen) {
                  const scrollbarWidth = getScrollbarWidth();
                  return {
                    left: `-${popoverOffset}px`,
                    width:
                      scrollbarWidth > 0
                        ? `calc(100vw - ${scrollbarWidth}px)`
                        : '100vw',
                  };
                }

                if (isCollateralType) {
                  return {};
                }
                if (isReceive) {
                  return {};
                }

                if (!isSmallScreen && popoverOffset !== 0) {
                  return { right: `-${popoverOffset}px` };
                }

                return {};
              })()}
            >
              {['Pool', t`Pool`].includes(type) && (
                <PoolPanel
                  onSelect={(pool) => {
                    close();
                  }}
                  marketData={marketData}
                />
              )}
              {['Collateral', t`Collateral`].includes(type) && (
                <CollateralPanel
                  onSelect={(item) => {
                    close();
                  }}
                  collateralData={collateralData}
                />
              )}
              {type === 'Receive' && (
                <ReceivePanel
                  onSelect={(token) => {
                    changeToken(token);
                    close();
                  }}
                />
              )}
            </Popover.Panel>
          </>
        );
      }}
    </Popover>
  );
};
export default TokensSelectCom;
