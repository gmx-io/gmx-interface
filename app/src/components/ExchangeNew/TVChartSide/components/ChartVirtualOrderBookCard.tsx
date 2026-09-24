import './ChartVirtualOrderBookCard.scss';
import { LoadingDots } from '@/components/Common/Loader/LoadingDots';
import { BN_ZERO } from '@/config/constants';
import { getGmw395Enabled } from '@/config/featureFlagEnable';
import { MarketInfo } from '@/selectors/market/types';
import { selectTradeboxMarketTokenAddress } from '@/selectors/tradebox/selectTradeboxMarketTokenAddress';
import { getPriceImpactForPosition } from '@/utils/fee/getPriceImpactForPosition';
import { formatBNToKMB, formatPriceUsd } from '@/utils/legacy/format';
import { getNextPositionExecutionPrice } from '@/utils/position/getNextPositionExecutionPrice';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Trans } from '@lingui/macro';
import { GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS } from '@/config/program'

const PERCENTAGES = [0.001, 0.003, 0.006, 0.01, 0.03, 0.1, 0.3, 0.6, 1.0];
const BREAKPOINT_1280 = 1280;
const MOBILE_BREAKPOINT = 768;
const DESKTOP_COLUMN_TEMPLATE = 'minmax(0, 1fr) 64px minmax(0, calc((100% - 16px) / 3))';

interface OrderBookRow {
  price: BN;
  formattedPrice: string;
  size: BN;
  total: BN;
  percentage: number;
}

function isPublicKeyLike(value: unknown): value is { toBase58: () => string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toBase58?: unknown }).toBase58 === 'function'
  );
}

function isBNLike(value: unknown): value is BN {
  return BN.isBN(value);
}

function isValidVobMarketInfo(
  marketInfo: Partial<MarketInfo>
): marketInfo is MarketInfo {
  return (
    isPublicKeyLike(marketInfo.indexTokenAddress) &&
    isBNLike(marketInfo.openInterestForLongLongTokenAmount) &&
    isBNLike(marketInfo.openInterestForLongShortTokenAmount) &&
    isBNLike(marketInfo.openInterestForShortLongTokenAmount) &&
    isBNLike(marketInfo.openInterestForShortShortTokenAmount) &&
    isBNLike(marketInfo.positionImpactPositiveFactor) &&
    isBNLike(marketInfo.positionImpactNegativeFactor) &&
    isBNLike(marketInfo.positionImpactExponent)
  );
}

function getBN(value: string) {
  try {
    if (value === undefined || value === null) return undefined;
    return new BN(value);
  } catch {
    return undefined;
  }
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT
  );
  useEffect(() => {
    const handleResize = () =>
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}

function useIs1280() {
  const [is1280, setIs1280] = useState(
    typeof window !== 'undefined' && window.innerWidth <= BREAKPOINT_1280
  );
  useEffect(() => {
    const handleResize = () => setIs1280(window.innerWidth <= BREAKPOINT_1280);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return is1280;
}

function formatCompact(value: BN): string {
  return formatBNToKMB(value, 20, 1).toUpperCase().replace('$', '');
}

export const ChartVirtualOrderBookCard = memo(
  function ChartVirtualOrderBookCard() {
    const isGmw395Enabled = getGmw395Enabled();

    // websocket market data
    const { marketInfos } = useAppStore(useShallow((state) => state.markets));
    const { tokenPriceMap } = useAppStore(
      useShallow((state) => ({
        tokenPriceMap: state.tickersState.tokenPriceMap,
      }))
    );
    const marketTokenAddress = useAppStore(selectTradeboxMarketTokenAddress);

    // on chain market data
    const { marketsOnChain, marketsState, marketsStatus } = useAppStore(
      useShallow((state) => ({
        marketsOnChain: state.markets.marketsOnChain,
        marketsState: state.markets.marketsState,
        marketsStatus: state.markets.marketsStatus,
      }))
    );

    // build type:MarketInfo from on chain data
    const marketInfo = useMemo((): MarketInfo | undefined => {
      if (!marketTokenAddress) return undefined;
      const meta = marketsOnChain[marketTokenAddress];
      const state = marketsState[marketTokenAddress];
      if (!meta || !state) return undefined;
      const status = marketsStatus[marketTokenAddress];
      const nextMarketInfo = {
        ...meta,
        ...state,
        ...status,
        name: '',
        poolValueMax: BN_ZERO,
        poolValueMin: BN_ZERO,
        indexToken: {} as MarketInfo['indexToken'],
        longToken: {} as MarketInfo['longToken'],
        shortToken: {} as MarketInfo['shortToken'],
      };
      return isValidVobMarketInfo(nextMarketInfo) ? nextMarketInfo : undefined;
    }, [marketTokenAddress, marketsOnChain, marketsState, marketsStatus]);

    // Get index token address from WebSocket marketInfos for price lookup
    const socketMarketData = useMemo(() => {
      return marketInfos.find((info) => info.marketToken === marketTokenAddress);
    }, [marketInfos, marketTokenAddress]);

    // get marketPrice from WebSocket tokenPriceMap
    const marketPrice = useMemo(() => {
      const indexTokenAddr = socketMarketData?.indexToken;
      if (!indexTokenAddr || !tokenPriceMap) return undefined;
      const ticker = tokenPriceMap.get(indexTokenAddr);
      if (!ticker?.price || !ticker.unitPrice) return undefined;
      const rawPrice = ticker.price;
      if (rawPrice === '0' || rawPrice === 0) return undefined;
      const scale = new BN(10).pow(
        new BN(rawPrice.toString().length - ticker.unitPrice.toString().length)
      );
      return {
        maxPrice: new BN(ticker.maxUnitPrice).mul(scale),
        minPrice: new BN(ticker.minUnitPrice).mul(scale),
        price: new BN(rawPrice),
      };
    }, [socketMarketData, tokenPriceMap]);

    const { setMarketDirection, setVobSizeUsd } = useAppStore(
      useShallow((state) => ({
        setMarketDirection: state.TradeboxNew.setMarketDirection,
        setVobSizeUsd: state.TradeboxNew.setVobSizeUsd,
      }))
    );

    const isMobile = useIsMobile();
    const is1280 = useIs1280();
    const [flashKey, setFlashKey] = useState<string | null>(null);
    const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerFlash = useCallback((key: string) => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      setFlashKey(key);
      flashTimerRef.current = setTimeout(() => setFlashKey(null), 600);
    }, []);

    useEffect(() => {
      return () => {
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      };
    }, []);

    const latestOrderBookData = useMemo(() => {
      if (!marketPrice || !marketInfo || !marketTokenAddress || !socketMarketData) return null;

      const _marketInfo = marketInfo;
      const lpLong = getBN(socketMarketData.lpLong);
      const lpShort = getBN(socketMarketData.lpShort);

      if (!lpLong || !lpShort) return null;

      const buildRows = (liquidity: BN, isLong: boolean): OrderBookRow[] => {
        if (liquidity.isZero()) return [];

        const rows: OrderBookRow[] = [];
        // PERCENTAGES is ascending: index 0 = smallest (0.1%), index 9 = largest (100%)
        const totals = PERCENTAGES.map((pct) => {
          const numerator = new BN(Math.round(pct * 100000));
          return liquidity.mul(numerator).div(new BN(100000));
        });

        for (let i = 0; i < PERCENTAGES.length; i++) {
          const totalUsd = totals[i];
          if (totalUsd.isZero()) continue;

          const priceImpactUsd = getPriceImpactForPosition(
            _marketInfo,
            totalUsd,
            isLong
          );
          const executionPrice = getNextPositionExecutionPrice({
            triggerPrice: isLong ? marketPrice.maxPrice : marketPrice.minPrice,
            priceImpactUsd,
            sizeDeltaUsd: totalUsd,
            isLong,
            isIncrease: true,
          });

          if (!executionPrice) continue;

          const size = i === 0 ? totals[0] : totals[i].sub(totals[i - 1]);

          rows.push({
            price: executionPrice,
            formattedPrice:
              executionPrice ? formatPriceUsd(
                executionPrice,
                {
                  isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(_marketInfo.indexTokenAddress.toBase58())
                }
              ).replace('$', '') : '',
            size,
            total: totalUsd,
            percentage: PERCENTAGES[i],
          });
        }
        return rows;
      };

      const askRows = buildRows(lpLong, true);
      const bidRows = buildRows(lpShort, false);

      // ask1 and bid1 are the smallest-size rows (index 0 in ascending array)
      const ask1 = askRows.length > 0 ? askRows[0].price : null;
      const bid1 = bidRows.length > 0 ? bidRows[0].price : null;

      let midPrice: BN;
      if (ask1 && bid1) {
        midPrice = ask1.add(bid1).div(new BN(2));
      } else if (ask1) {
        midPrice = ask1;
      } else if (bid1) {
        midPrice = bid1;
      } else if (marketPrice && marketPrice.price) {
        midPrice = marketPrice.price;
      } else {
        midPrice = BN_ZERO;
      }

      const maxAskTotal =
        askRows.length > 0 ? askRows[askRows.length - 1].total : BN_ZERO;
      const maxBidTotal =
        bidRows.length > 0 ? bidRows[bidRows.length - 1].total : BN_ZERO;

      // Display asks top-to-bottom: largest total first (100% at top, 0.1% nearest mid)
      const displayAsks = [...askRows].reverse();

      return {
        asks: displayAsks,
        bids: bidRows,
        midPrice,
        marketPrice,
        maxAskTotal,
        maxBidTotal,
        hasLongLiquidity: !lpLong.isZero(),
        hasShortLiquidity: !lpShort.isZero(),
        indexTokenAddress: _marketInfo.indexTokenAddress.toBase58(),
      };
    }, [marketPrice, marketInfo, marketTokenAddress, socketMarketData]);

    const lastOrderBookDataRef = useRef<{
      marketTokenAddress: string;
      data: NonNullable<typeof latestOrderBookData>;
    } | null>(null);

    if (isGmw395Enabled && latestOrderBookData && marketTokenAddress) {
      lastOrderBookDataRef.current = {
        marketTokenAddress,
        data: latestOrderBookData,
      };
    }

    const orderBookData =
      latestOrderBookData ??
      (isGmw395Enabled &&
      lastOrderBookDataRef.current &&
      lastOrderBookDataRef.current.marketTokenAddress === marketTokenAddress
        ? lastOrderBookDataRef.current.data
        : null);

    const handleRowClick = useCallback(
      (sizeUsd: BN, isAsk: boolean, rowKey: string) => {
        setMarketDirection(isAsk ? 'Long' : 'Short');
        setVobSizeUsd(sizeUsd);
        triggerFlash(rowKey);
      },
      [setMarketDirection, setVobSizeUsd, triggerFlash]
    );

    const bgWidth = (total: BN, maxTotal: BN) => {
      if (maxTotal.isZero()) return '0%';
      const pct = total.mul(new BN(10000)).div(maxTotal).toNumber() / 100;
      return `${Math.min(pct, 100)}%`;
    };

    // ── Loading state ────────────────────────────────────────────────────────
    if (!orderBookData) {
      return (
        <div className="relative flex flex-col h-full overflow-hidden">
          <div className="absolute inset-0 flex flex-col overflow-hidden vob-scrollbar">
            <div className="flex items-center justify-center flex-1 py-8 px-4">
              <LoadingDots size={16} />
            </div>
          </div>
        </div>
      );
    }

    const {
      asks,
      bids,
      midPrice,
      marketPrice: oraclePrice,
      maxAskTotal,
      maxBidTotal,
      indexTokenAddress
    } = orderBookData;

    const midFormatted = midPrice ?
      formatPriceUsd(
        midPrice,
        {
          isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(indexTokenAddress)
        }
      ).replace('$', '') : '';

    const oracleFormatted = oraclePrice && oraclePrice.price ?
      formatPriceUsd(oraclePrice.price, {
        isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(indexTokenAddress)
      }).replace('$', '') : '';

    // ── 1280 layout ────────────────────────────────────────────────────────
    if (is1280 && !isMobile) {
      return (
        <div className="relative flex flex-col h-[58rem] overflow-hidden bg-[#181818]">
          <div className="absolute inset-0 flex flex-col overflow-hidden vob-scrollbar text-[#A3A3A3]">
            {/* Column header */}
            <div className="flex items-center shrink-0 h-[38px] pt-3 px-[20px] pb-2">
              <div className="flex flex-1 items-center overflow-hidden whitespace-nowrap text-ellipsis justify-start text-[11px] font-medium">
                <Trans>PRICE</Trans>
              </div>
              <div className="flex flex-1 items-center overflow-hidden whitespace-nowrap text-ellipsis justify-end text-[11px] font-medium">
                <span className="mr-[3px]"><Trans>SIZE</Trans></span>
                <span className="inline-block font-medium px-[4px] py-[2px]">{`(USD)`}</span>
              </div>
              <div className="flex flex-1 items-center overflow-hidden whitespace-nowrap text-ellipsis justify-end text-[11px] font-medium">
                <span className="mr-[3px]"><Trans>TOTAL</Trans></span>
                <span className="inline-block font-medium px-[4px] py-[2px]">{`(USD)`}</span>
              </div>
            </div>

            {/* Asks section — flex: 1, takes 50% of data area */}
            <div className="flex-1 tabular-nums flex flex-col min-h-0 overflow-hidden px-[6px] py-[3px] gap-[6px]">
              {orderBookData.hasLongLiquidity ? (
                asks.map((row, idx) => {
                  const rowKey = `ask-${idx}`;
                  const widthPct = bgWidth(row.total, maxAskTotal);
                  return (
                    <div
                      key={rowKey}
                      className={`flex-1 group flex items-center min-h-0 transition-colors text-[13px] font-medium rounded-[2px] px-[15px] hover:bg-white/[0.04] vob-row--ask ${flashKey === rowKey ? ' vob-row--flash' : ''}`}
                      style={{ cursor: 'pointer', '--bg-width': widthPct } as React.CSSProperties}
                      onClick={() => handleRowClick(row.total, true, rowKey)}
                    >
                      <div className="flex flex-1 items-center overflow-hidden whitespace-nowrap text-ellipsis justify-start text-[#FF5454]">
                        {row.formattedPrice}
                      </div>
                      <div className="flex flex-1 group-hover:text-white items-center overflow-hidden whitespace-nowrap text-ellipsis justify-end">
                        {formatCompact(row.size)}
                      </div>
                      <div className="flex group-hover:text-white items-center overflow-hidden whitespace-nowrap text-ellipsis flex-1 justify-end">
                        {formatCompact(row.total)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <Trans>No liquidity for longs</Trans>
                </div>
              )}
            </div>

            {/* Mid price row */}
            <div className="shrink-0 h-[29px] tabular-nums flex items-center border-t-[0.5px] border-b-[0.5px] border-[#53535380] px-[20px]">
              <span className="text-[18px] font-medium leading-[125%] tracking-[0.72px] mr-[14px]">{midFormatted}</span>
              <span className="text-[12px] font-medium">Oracle: {oracleFormatted}</span>
            </div>

            {/* Bids section — flex: 1, takes 50% of data area */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-[6px] py-[3px] gap-[6px] tabular-nums">
              {orderBookData.hasShortLiquidity ? (
                bids.map((row, idx) => {
                  const rowKey = `bid-${idx}`;
                  const widthPct = bgWidth(row.total, maxBidTotal);
                  return (
                    <div
                      key={rowKey}
                      className={`flex-1 flex items-center min-h-0 transition-colors text-[13px] font-medium rounded-[2px] px-[15px] hover:bg-white/[0.04] vob-row--bid${flashKey === rowKey ? ' vob-row--flash' : ''}`}
                      style={{ cursor: 'pointer', '--bg-width': widthPct } as React.CSSProperties}
                      onClick={() => handleRowClick(row.total, false, rowKey)}
                    >
                      <div className="flex flex-1 items-center overflow-hidden whitespace-nowrap text-ellipsis justify-start font-medium text-[#31C366]">
                        {row.formattedPrice}
                      </div>
                      <div className="flex flex-1 items-center overflow-hidden whitespace-nowrap text-ellipsis justify-end font-medium">
                        {formatCompact(row.size)}
                      </div>
                      <div className="flex items-center overflow-hidden whitespace-nowrap text-ellipsis flex-1 justify-end font-medium">
                        {formatCompact(row.total)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <Trans>No liquidity for shorts</Trans>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ── Mobile layout ────────────────────────────────────────────────────────
    // 4-column: [Total Ask] [Ask Price] [Bid Price] [Total Bid]
    if (isMobile) {
      return (
        <div className="text-[#A3A3A3]">
          <div className='h-[38px] text-[11px] flex items-center px-[20px] gap-x-[8px] font-medium'>
            <div className='flex-1 flex items-center justify-between'>
              <div className="flex items-center">
                <div className="mr-[3px]">
                  <Trans>TOTAL</Trans>{` (USD)`}
                </div>
              </div>
              <div className=""><Trans>PRICE</Trans></div>
            </div>
            <div className='flex-1 flex items-center justify-between'>
              <div className=""><Trans>PRICE</Trans></div>
              <div className="flex items-center">
                <div className="mr-[3px]">
                  <Trans>TOTAL</Trans>{` (USD)`}
                </div>
              </div>
            </div>
          </div>

          <div className='relative flex-1 text-[13px]'>
            <table className="w-full flex flex-col gap-y-[6px]">
              {PERCENTAGES.slice()
                .reverse()
                .map((_pct, idx) => {
                  const askRow = asks[idx];
                  const bidRowIdx = PERCENTAGES.length - 1 - idx;
                  const bidRow = bids[bidRowIdx];
                  const rowKey = `mobile-${idx}`;
                  const askWidthPct = askRow ? bgWidth(askRow.total, maxAskTotal) : '0%';
                  const bidWidthPct = bidRow ? bgWidth(bidRow.total, maxBidTotal) : '0%';
                  return (
                    <tr
                      key={rowKey}
                      className="flex items-center px-[6px] gap-x-[8px] tabular-nums"
                    >
                      <div onClick={() => askRow && handleRowClick(askRow.total, true, `ask-${bidRowIdx}`)} style={{ '--ask-bg-width': askWidthPct } as React.CSSProperties} className='vob-mob-ask-bg rounded-[2px] flex-1 h-[26px] flex items-center justify-between pl-[15px] pr-[2px]'>
                        <div
                          className="relative z-10 font-medium whitespace-nowrap overflow-hidden text-ellipsis"
                          style={{ cursor: askRow ? 'pointer' : 'default' }}
                        >
                          {askRow ? formatCompact(askRow.total) : null}
                        </div>
                        <div
                          className="relative z-10 font-medium whitespace-nowrap overflow-hidden text-ellipsis text-[#FF5454] "
                          style={{ cursor: askRow ? 'pointer' : 'default' }}
                        >
                          {askRow && askRow.formattedPrice}
                        </div>
                      </div>
                      <div onClick={() => bidRow && handleRowClick(bidRow.total, false, `bid-${bidRowIdx}`)} style={{ '--bid-bg-width': bidWidthPct } as React.CSSProperties} className='vob-mob-bid-bg rounded-[2px] flex-1 h-[26px] flex items-center justify-between pr-[15px] pl-[2px]'>
                        <div
                          className="relative z-10 font-medium whitespace-nowrap overflow-hidden text-ellipsis text-[#31C366] "
                          style={{ cursor: bidRow ? 'pointer' : 'default' }}
                        >
                          {bidRow && bidRow.formattedPrice}
                        </div>
                        <div
                          className="relative z-10 font-medium whitespace-nowrap overflow-hidden text-ellipsis text-right"
                          style={{ cursor: bidRow ? 'pointer' : 'default' }}
                        >
                          {bidRow ? formatCompact(bidRow.total) : null}
                        </div>
                      </div>
                    </tr>
                  );
                })}
            </table>
            {!orderBookData.hasLongLiquidity && (
              <div className="absolute top-0 bottom-0 left-0 w-1/2 flex items-center justify-center pointer-events-none">
                <Trans>No liquidity for longs</Trans>
              </div>
            )}
            {!orderBookData.hasShortLiquidity && (
              <div className="absolute top-0 bottom-0 right-0 w-1/2 flex items-center justify-center pointer-events-none">
                <Trans>No liquidity for shorts</Trans>
              </div>
            )}
          </div>

          <div className="px-[20px] py-[10px] flex items-center justify-center gap-x-[14px] border-t-[0.5px] border-[#53535380] tabular-nums">
            <div className="text-[18px] font-medium leading-[125%] tracking-[0.72px]">{midFormatted}</div>
            <div className="text-[12px] font-medium leading-[125%] tracking-[-0.144px] p-[2px]">Oracle: {oracleFormatted}</div>
          </div>

        </div >
      );
    }

    // ── Desktop layout (flex, height-responsive) ─────────────────────────────
    return (
      <div className="relative flex flex-col h-full overflow-hidden">
        <div className="absolute inset-0 flex flex-col overflow-hidden vob-scrollbar text-[#A3A3A3]">
          {/* Column header */}
          <div
            className="grid items-center shrink-0 h-[38px] pt-3 px-[20px] pb-2 gap-x-[8px]"
            style={{ gridTemplateColumns: DESKTOP_COLUMN_TEMPLATE }}
          >
            <div className="flex min-w-0 items-center overflow-hidden whitespace-nowrap text-ellipsis justify-start text-[11px] font-medium">
              <Trans>PRICE</Trans>
            </div>
            <div className="flex min-w-0 items-center overflow-hidden whitespace-nowrap text-ellipsis justify-end text-[11px] font-medium">
              <span className="mr-[3px]"><Trans>SIZE</Trans>{` (USD)`}</span>
            </div>
            <div className="flex min-w-0 items-center overflow-hidden whitespace-nowrap text-ellipsis justify-end text-[11px] font-medium">
              <span className="mr-[3px]"><Trans>TOTAL</Trans>{` (USD)`}</span>
            </div>
          </div>

          {/* Asks section — flex: 1, takes 50% of data area */}
          <div className="flex-1 tabular-nums flex flex-col min-h-0 overflow-hidden px-[5px] py-[3px] gap-[6px]">
            {orderBookData.hasLongLiquidity ? (
              asks.map((row, idx) => {
                const rowKey = `ask-${idx}`;
                const widthPct = bgWidth(row.total, maxAskTotal);
                return (
                  <div
                    key={rowKey}
                    className={`grid items-center min-h-0 group transition-colors text-[13px] font-medium rounded-[2px] gap-x-[8px] px-[15px] py-[3px] hover:bg-white/[0.04] vob-row--ask ${flashKey === rowKey ? ' vob-row--flash' : ''}`}
                    style={{
                      cursor: 'pointer',
                      gridTemplateColumns: DESKTOP_COLUMN_TEMPLATE,
                      '--bg-width': widthPct,
                    } as React.CSSProperties}
                    onClick={() => handleRowClick(row.total, true, rowKey)}
                  >
                    <div className="flex min-w-0 items-center overflow-hidden whitespace-nowrap text-ellipsis justify-start font-medium text-[#FF5454]">
                      {row.formattedPrice}
                    </div>
                    <div className="flex min-w-0 group-hover:text-white items-center overflow-hidden whitespace-nowrap text-ellipsis justify-end font-medium">
                      {formatCompact(row.size)}
                    </div>
                    <div className="flex min-w-0 group-hover:text-white items-center overflow-hidden whitespace-nowrap text-ellipsis justify-end font-medium">
                      {formatCompact(row.total)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <Trans>No liquidity for longs</Trans>
              </div>
            )}
          </div>

          {/* Mid price row */}
          <div className="shrink-0 h-[29px] flex items-center px-[20px] border-t-[0.5px] border-b-[0.5px] border-[#53535380] justify-between tabular-nums">
            <span className="text-[18px] font-medium leading-[125%] tracking-[0.72px]">{midFormatted}</span>
            <span className="text-[12px] font-medium">Oracle: {oracleFormatted}</span>
          </div>

          {/* Bids section — flex: 1, takes 50% of data area */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-[5px] py-[3px] gap-[6px]">
            {orderBookData.hasShortLiquidity ? (
              bids.map((row, idx) => {
                const rowKey = `bid-${idx}`;
                const widthPct = bgWidth(row.total, maxBidTotal);
                return (
                  <div
                    key={rowKey}
                    className={`flex-1 tabular-nums grid items-center min-h-0 transition-colors text-[13px] font-medium rounded-[2px] gap-x-[8px] px-[15px] hover:bg-white/[0.04] vob-row--bid${flashKey === rowKey ? ' vob-row--flash' : ''}`}
                    style={{
                      cursor: 'pointer',
                      gridTemplateColumns: DESKTOP_COLUMN_TEMPLATE,
                      '--bg-width': widthPct,
                    } as React.CSSProperties}
                    onClick={() => handleRowClick(row.total, false, rowKey)}
                  >
                    <div className="flex min-w-0 items-center overflow-hidden whitespace-nowrap text-ellipsis justify-start font-medium text-[#31C366]">
                      {row.formattedPrice}
                    </div>
                    <div className="flex min-w-0 items-center overflow-hidden whitespace-nowrap text-ellipsis justify-end font-medium">
                      {formatCompact(row.size)}
                    </div>
                    <div className="flex min-w-0 items-center overflow-hidden whitespace-nowrap text-ellipsis justify-end font-medium">
                      {formatCompact(row.total)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <Trans>No liquidity for shorts</Trans>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
