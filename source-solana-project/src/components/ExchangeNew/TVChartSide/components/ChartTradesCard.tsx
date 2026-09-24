import './ChartTradesCard.scss';
import { getGmw214Enabled } from '@/config/featureFlagEnable';
import { LoadingDots } from '@/components/Common/Loader/LoadingDots';
import {
  TradeItem,
  useMarketTradesData,
} from '@/hooks/statsHooks/useMarketTradesData';
import { formatPriceUsd, formatUsd } from '@/utils/legacy/format';
import { useAppStore } from '@/zustand/useAppStore';
import { Trans } from '@lingui/macro';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getUnit } from '@/utils/legacy/common';
import { GMX_SOLANA_TOKENS_RAW, GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS } from '@/config/program';

// old:
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import { useState } from 'react';
import { formatAmount } from '@/utils/legacy/format';

type TokenInfo = {
  symbol: string;
  decimals: number;
  [key: string]: any;
};

const getTradeColorClass = (trade: TradeItem) => {
  if (
    (trade.isLong && trade.isIncrease) ||
    (!trade.isLong && !trade.isIncrease)
  ) {
    return 'text-[#31C366]';
  }
  return 'text-[#FF5454]';
};

function ChartTradesCard() {
  const { trades, isLoading } = useMarketTradesData();

  const { MarketsMap } = useAppStore(
    useShallow((state) => ({
      MarketsMap: state.markets.marketsMap,
    }))
  );

  const sortedTrades = useMemo(() => {
    if (!trades || !trades.length) return [];

    return [...trades]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 50); // Show only the 50 most recent trades
  }, [trades]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="ChartTradesCardNew">
      <div className="flex items-center shrink-0 h-[38px] pt-3 px-[20px] pb-2 text-[#A3A3A3] gap-x-[8px]">
        <div className="flex items-center overflow-hidden whitespace-nowrap text-ellipsis flex-1 shrink-0 justify-start text-[11px] font-medium">
          <Trans>PRICE</Trans>
        </div>
        <div className="flex items-center overflow-hidden whitespace-nowrap text-ellipsis flex-1 text-[11px] font-medium">
          <span className="mr-[3px]"><Trans>SIZE</Trans>{` (USD)`}</span>
        </div>
        <div className="flex items-center overflow-hidden whitespace-nowrap text-ellipsis flex-1 justify-end text-[11px] font-medium">
          <span className="mr-[3px]"><Trans>TIME</Trans></span>
        </div>
      </div>

      <div className='ChartTradesCard-content'>
        {isLoading && (
          <div className='flex justify-center items-center h-full'>
            <LoadingDots size={16} />
          </div>
        )}

        {!isLoading && sortedTrades.length === 0 && (
          <div className='flex justify-center items-center h-full text-[#A3A3A3] font-medium'>
            <Trans>No trades available</Trans>
          </div>
        )}

        {!isLoading &&
          sortedTrades.map((trade: TradeItem) => {
            const marketTokenStr = trade.marketToken.toString();
            const marketInfo = MarketsMap.get(marketTokenStr);
            if (!marketInfo) return null;

            const marketIndexToken = GMX_SOLANA_TOKENS_RAW[marketInfo?.indexToken] as TokenInfo;

            return (
              <div className='text-[#A3A3A3] hover:text-white hover:bg-white/[0.04] text-[13px] flex px-[20px] font-medium gap-x-[8px]' key={trade.id}>
                <div className={`py-[6px] flex-1 tabular-nums ${getTradeColorClass(trade)}  tracking-[0.04em]`}>
                  {formatPriceUsd(
                    trade.executionPrice.mul(
                      getUnit(marketIndexToken?.decimals)
                    ),
                    {
                      displayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(marketInfo?.indexToken) ? 5 : GMX_SOLANA_TOKENS_RAW[marketInfo?.indexToken].decimals,
                      isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(marketInfo?.indexToken)
                    }
                  ).replace('$', '')}
                </div>
                <div className="py-[6px] flex-1 tabular-nums">
                  {formatUsd(trade.size, { displayPlus: false }).replace('$', '')}
                </div>
                <div className="py-[6px] flex-1 text-right tabular-nums">
                  {formatTime(trade.timestamp)}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function OldChartTradesCard() {
  const { trades, isLoading } = useMarketTradesData();

  const [tabType, setTabType] = useState<'size' | 'usdc'>('usdc');

  const { MarketsMap } = useAppStore(
    useShallow((state) => ({
      MarketsMap: state.markets.marketsMap,
    }))
  );

  const sortedTrades = useMemo(() => {
    if (!trades || !trades.length) return [];

    return [...trades]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 50); // Show only the 50 most recent trades
  }, [trades]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="ChartTradesCard">
      <div className="ChartTradesCard-content">
        <Table className="ChartTradesCard-table">
          <thead>
            <TableTheadTr bordered={false}>
              <TableTh padding="none" className="text-body-small px-10 title !text-[#A3A3A3] tracking-[0.08em]">
                <Trans>Price</Trans>
              </TableTh>
              <TableTh padding="none" className="text-body-small px-10 title">
                <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                  <span
                    className={`ChartTradesCard-table-item tracking-[0.08em]`}
                  >
                    <Trans>Size</Trans>
                  </span>
                  <span
                    className={`ChartTradesCard-table-item ChartTradesCard-table-active tracking-[-0.012em]`}
                    onClick={() => {
                      setTabType(tabType === 'size' ? 'usdc' : 'size');
                    }}
                  >
                    {
                      tabType === 'usdc' ? (
                        <Trans>USD</Trans>
                      ) : (
                        <Trans>Asset</Trans>
                      )
                    }
                  </span>
                </div>
              </TableTh>
              <TableTh
                padding="none"
                className="text-body-small px-10 title !text-[#A3A3A3] tracking-[0.08em]"
                style={{ textAlign: 'right' }}
              >
                <Trans>Time</Trans>
              </TableTh>
            </TableTheadTr>
          </thead>
          <tbody>
            {isLoading && (
              <TableTr hoverable={false} bordered={false}>
                <TableTd
                  colSpan={3}
                  className="ChartTradesCard-loading text-center"
                >
                  <LoadingDots size={16} />
                </TableTd>
              </TableTr>
            )}

            {!isLoading && sortedTrades.length === 0 && (
              <TableTr className="ChartTradesCard-empty-row">
                <TableTd
                  colSpan={3}
                  className="ChartTradesCard-empty text-body-small"
                  style={{ textAlign: 'center', color: '#A3A3A3', fontSize: '1.3rem', fontWeight: 500 }}
                >
                  <Trans>No trades available</Trans>
                </TableTd>
              </TableTr>
            )}

            {!isLoading &&
              sortedTrades.map((trade: TradeItem) => {
                const marketTokenStr = trade.marketToken.toString();
                const marketInfo = MarketsMap.get(marketTokenStr);
                if (!marketInfo) return null;

                const marketIndexToken = GMX_SOLANA_TOKENS_RAW[marketInfo?.indexToken] as TokenInfo;

                const amount = trade.size.div(trade.executionPrice);
                const sizeTokenAmount = formatAmount(amount, marketIndexToken?.decimals, 4);
                return (
                  <TableTr key={trade.id} hoverable={true} bordered={false}>
                    <TableTd padding="none" className="py-8">
                      <div className={`ChartTradesCard ${getTradeColorClass(trade)}  tracking-[0.04em]`}>
                        {formatPriceUsd(
                          trade.executionPrice.mul(
                            getUnit(marketIndexToken?.decimals)
                          ),
                          {
                            displayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(marketInfo?.indexToken) ? 5 : GMX_SOLANA_TOKENS_RAW[marketInfo?.indexToken].decimals,
                            isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(marketInfo?.indexToken)
                          }
                        )}
                      </div>
                    </TableTd>
                    <TableTd padding="none" className="py-8" style={{ paddingLeft: '6px' }}>
                      {
                        tabType === 'size' ? (
                          <span
                            className='tracking-[0.04em]'
                          >
                            {sizeTokenAmount}
                            {/* {formatAmount(trade.amount, marketIndexToken?.decimals, 4)} */}
                          </span>
                        ) : (
                          <span
                            className={`tracking-[0.04em]`}
                          >
                            {formatUsd(trade.size, { displayPlus: false })}
                          </span>
                        )
                      }
                    </TableTd>
                    <TableTd padding="none" className="py-8 text-right">
                      <div className="ChartTradesCard-time gap-4 justify-end">
                        <span className="text-body-medium">
                          {formatTime(trade.timestamp)}
                        </span>
                      </div>
                    </TableTd>
                  </TableTr>
                );
              })}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

export default getGmw214Enabled() ? ChartTradesCard : OldChartTradesCard;
