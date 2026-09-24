import './ChartSwapsCard.scss';
import { LoadingDots } from '@/components/Common/Loader/LoadingDots';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import {
  ChartSwapItem,
  useMarketSwapsData,
} from '@/hooks/statsHooks/useMarketSwapsData';
// import { selectMarketsInfo } from '@/selectors/market/selectMarketsInfo';
import { formatAmount } from '@/utils/legacy/format';
import { getIconUrlPath } from '@/utils/lib/icon';
import { useAppStore } from '@/zustand/useAppStore';
import { Trans } from '@lingui/macro';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import classNames from 'classnames';

type TokenInfo = {
  symbol: string;
  decimals: number;
  [key: string]: any;
};

const FROM_COLUMN_CLASS_NAME = 'w-[9rem] min-w-[9rem] max-w-[9rem]';
const TO_COLUMN_CLASS_NAME = 'w-[10rem] min-w-[10rem] max-w-[10rem]';
const TIME_COLUMN_CLASS_NAME = 'w-[6rem] min-w-[6rem] max-w-[6rem]';
const HEADER_CELL_CLASS_NAME = 'text-[11px] title px-10 !text-[#A3A3A3]';

type ChartSwapsCardProps = {
  isFullScreen?: boolean;
};

export function ChartSwapsCard({ isFullScreen = false }: ChartSwapsCardProps) {
  const { swaps, isLoading } = useMarketSwapsData();
  // const marketsInfo = useAppStore(selectMarketsInfo);
  const { MarketsMap } = useAppStore(
    useShallow((state) => ({
      // markets: state.TradeboxNew.markets,
      MarketsMap: state.markets.marketsMap,
    }))
  );

  const sortedSwaps = useMemo(() => {
    if (!swaps || !swaps.length) return [];

    return [...swaps]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 50); // Show only the 50 most recent swaps
  }, [swaps]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const fromColumnClassName = isFullScreen ? 'min-w-0' : FROM_COLUMN_CLASS_NAME;
  const toColumnClassName = isFullScreen ? 'min-w-0' : TO_COLUMN_CLASS_NAME;
  const timeColumnClassName = isFullScreen ? 'min-w-0' : TIME_COLUMN_CLASS_NAME;

  return (
    <div
      className={classNames('ChartSwapsCard', {
        'ChartSwapsCard--full': isFullScreen,
      })}
    >
      <div className="ChartSwapsCard-content">
        <Table className="ChartSwapsCard-table">
          <thead>
            <TableTheadTr bordered={false}>
              <TableTh
                padding="none"
                className={`${HEADER_CELL_CLASS_NAME} ${fromColumnClassName}`}
              >
                <Trans>from</Trans>
              </TableTh>
              <TableTh
                padding="none"
                className={`${HEADER_CELL_CLASS_NAME} ${toColumnClassName}`}
              >
                <Trans>to</Trans>
              </TableTh>
              <TableTh
                padding="none"
                className={`${HEADER_CELL_CLASS_NAME} ${timeColumnClassName}`}
                style={{ textAlign: 'right' }}
              >
                <Trans>time</Trans>
              </TableTh>
            </TableTheadTr>
          </thead>
          <tbody>
            {isLoading && (
              <TableTr hoverable={false} bordered={false}>
                <TableTd
                  colSpan={3}
                  className="ChartSwapsCard-loading text-center"
                >
                  <LoadingDots size={16} />
                </TableTd>
              </TableTr>
            )}

            {!isLoading && sortedSwaps.length === 0 && (
              <TableTr hoverable={false} bordered={false}>
                <TableTd
                  colSpan={3}
                  className="ChartSwapsCard-empty text-body-small"
                >
                  <Trans>No swaps available</Trans>
                </TableTd>
              </TableTr>
            )}

            {!isLoading &&
              sortedSwaps.map((swap: ChartSwapItem) => {
                const marketTokenStr = swap.marketToken.toString();
                const marketInfo = MarketsMap.get(marketTokenStr);
                if (!marketInfo) return null;

                const longTokenAddress = marketInfo.longToken.toString();
                const shortTokenAddress = marketInfo.shortToken.toString();

                if (
                  !(longTokenAddress in GMX_SOLANA_TOKENS_RAW) ||
                  !(shortTokenAddress in GMX_SOLANA_TOKENS_RAW)
                ) {
                  return null;
                }

                const tokenIn = swap.isTokenInLong
                  ? (GMX_SOLANA_TOKENS_RAW[longTokenAddress] as TokenInfo)
                  : (GMX_SOLANA_TOKENS_RAW[shortTokenAddress] as TokenInfo);

                const tokenOut = swap.isTokenInLong
                  ? (GMX_SOLANA_TOKENS_RAW[shortTokenAddress] as TokenInfo)
                  : (GMX_SOLANA_TOKENS_RAW[longTokenAddress] as TokenInfo);

                return (
                  <TableTr key={swap.id} hoverable={true} bordered={false}>
                    <TableTd
                      padding="none"
                      className={`${fromColumnClassName} h-[32px]`}
                    >
                      <div className="ChartSwapsCard-token">
                        <img
                          className="ChartSwapsCard-icon"
                          src={getIconUrlPath(
                            tokenIn.symbol === 'WGMX' ? 'GMX' : tokenIn.symbol,
                            40
                          )}
                          alt={tokenIn.symbol}
                          width="18"
                          height="18"
                        />
                        <span className="text-body-medium tracking-[-0.04em]">
                          {formatAmount(
                            swap.tokenInAmount,
                            tokenIn.decimals,
                            4,
                            true
                          )}
                        </span>
                      </div>
                    </TableTd>
                    <TableTd padding="none" className={`${toColumnClassName}`}>
                      <div className="ChartSwapsCard-token">
                        <img
                          className="ChartSwapsCard-icon"
                          src={getIconUrlPath(
                            tokenOut.symbol === 'WGMX'
                              ? 'GMX'
                              : tokenOut.symbol,
                            40
                          )}
                          alt={tokenOut.symbol}
                          width="18"
                          height="18"
                        />
                        <span className="text-body-medium tracking-[-0.04em]">
                          {formatAmount(
                            swap.tokenOutAmount,
                            tokenOut.decimals,
                            4,
                            true
                          )}
                        </span>
                      </div>
                    </TableTd>
                    <TableTd
                      padding="none"
                      className={`text-right ${timeColumnClassName}`}
                    >
                      <div className="ChartSwapsCard-time justify-end">
                        <span className="text-body-medium">
                          {formatTime(swap.timestamp)}
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
