import {
  TableTd,
  TableTh,
  TableTheadTr,
} from '@/components/Common/Table/Table';
import TokenIcon from '@/components/Common/TokenIcon/TokenIcon';
import {
  SELECTOR_BASE_MOBILE_THRESHOLD,
  SelectorBase,
  SelectorBaseDesktopRow,
  SelectorBaseMobileList,
  useSelectorClose,
} from '@/components/Common/SelectorBase/SelectorBase';
import { CHART_PERIODS } from '@/config/constants';
import { MarketTokenStat } from '@/selectors/stats/types';
import { MarketLiquidityAndFeeStat } from '@/selectors/tradebox/types';
import { TradeType } from '@/selectors/trade/types';
import { formatRatePercentage, formatUsd } from '@/utils/legacy/format';
import { getMarketPoolName } from '@/utils/market/getMarketPoolName';
import { numberToState } from '@/utils/lib/shared';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import cx from 'classnames';
import { useMedia } from 'react-use';

type Props = {
  selectedPoolName: string | undefined;
  options: MarketTokenStat[] | undefined;
  positionStats: {
    [marketTokenAddress: string]: MarketLiquidityAndFeeStat;
  };
  tradeType: TradeType;
  onSelect: (marketAddress: string) => void;
  className?: string;
};

export function MarketPoolSelector(props: Props) {
  const isMobile = useMedia(`(max-width: ${SELECTOR_BASE_MOBILE_THRESHOLD}px)`);
  const disabled = props.options?.length === 1;

  if (props.tradeType === undefined) {
    return null;
  }

  return (
    <SelectorBase
      label={props.selectedPoolName}
      modalLabel={t`Select Pool`}
      disabled={disabled}
      qa="market-pool-selector"
      chevronStyle="compact"
      chevronSize={20}
      handleClassName={props.className}
    >
      <div className={`${isMobile ? 'px-5 pt-0' : 'px-10 pt-0'}`}>
        {/* Search input could be added here if needed */}
      </div>
      {isMobile ? (
        <MarketPoolSelectorMobile {...props} />
      ) : (
        <MarketPoolSelectorDesktop {...props} />
      )}
    </SelectorBase>
  );
}

function MarketPoolSelectorDesktop(props: Props) {
  const close = useSelectorClose();
  const isLong = props.tradeType === TradeType.Long;

  return (
    <table
      className="text-body-medium w-full"
      data-qa="market-pool-selector-table"
    >
      <thead>
        <TableTheadTr>
          <TableTh className="text-body-medium">{t`Pool`}</TableTh>
          <TableTh className="text-body-medium">
            {isLong ? t`Long Liq.` : t`Short Liq.`}
          </TableTh>
          <TableTh className="text-body-medium">{t`Net Rate`}</TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {props.options?.map((option) => (
          <MarketPoolSelectorItemDesktop
            key={option.marketInfo.marketTokenAddress.toBase58()}
            marketStat={option}
            tradeType={props.tradeType}
            isEnoughLiquidity={
              props.positionStats[
                option.marketInfo.marketTokenAddress.toBase58()
              ].isEnoughLiquidity
            }
            liquidity={
              props.positionStats[
                option.marketInfo.marketTokenAddress.toBase58()
              ].liquidity
            }
            onSelect={() => {
              props.onSelect(option.marketInfo.marketTokenAddress.toBase58());
              close();
            }}
          />
        ))}
      </tbody>
    </table>
  );
}

function MarketPoolSelectorItemDesktop({
  marketStat,
  tradeType,
  isEnoughLiquidity,
  liquidity,
  onSelect,
}: {
  marketStat: MarketTokenStat;
  tradeType: TradeType;
  isEnoughLiquidity: boolean;
  liquidity: BN;
  onSelect: () => void;
}) {
  const isLong = tradeType === TradeType.Long;
  const longTokenSymbol = marketStat.marketInfo.longToken.symbol;
  const shortTokenSymbol = marketStat.marketInfo.shortToken.symbol;
  const poolName = getMarketPoolName(marketStat.marketInfo);
  const formattedLiquidity = formatUsd(liquidity);
  const formattedNetRate = formatRatePercentage(
    isLong
      ? marketStat.longNetRatePerSecond.mul(new BN(CHART_PERIODS['1h']))
      : marketStat.shortNetRatePerSecond.mul(new BN(CHART_PERIODS['1h']))
  );
  const netRateState = numberToState(
    isLong
      ? marketStat.longNetRatePerSecond.mul(new BN(CHART_PERIODS['1h']))
      : marketStat.shortNetRatePerSecond.mul(new BN(CHART_PERIODS['1h']))
  );

  return (
    <SelectorBaseDesktopRow
      onClick={onSelect}
      className="hover:bg-dark-blue-100 active:bg-dark-blue-200"
      data-qa={`market-pool-selector-row-${poolName}`}
    >
      <TableTd className="text-body-medium flex items-center gap-2">
        <div className="flex">
          <TokenIcon
            symbol={longTokenSymbol}
            displaySize={20}
            importSize={40}
            className="relative z-10 overflow-hidden rounded-full"
          />
          {shortTokenSymbol && (
            <TokenIcon
              symbol={shortTokenSymbol}
              displaySize={20}
              importSize={40}
              className="relative -ml-2 overflow-hidden rounded-full"
            />
          )}
        </div>
        <div>{poolName}</div>
      </TableTd>
      <TableTd
        className={cx('text-body-medium', {
          'text-red-500': !isEnoughLiquidity,
        })}
      >
        {formattedLiquidity}
      </TableTd>
      <TableTd
        className={cx('text-body-medium', {
          'text-red-500': netRateState === 'error',
          'text-green-500': netRateState === 'success',
        })}
      >
        {formattedNetRate} / 1h
      </TableTd>
    </SelectorBaseDesktopRow>
  );
}

function MarketPoolSelectorMobile(props: Props) {
  const close = useSelectorClose();
  const isLong = props.tradeType === TradeType.Long;

  const getFormattedPoolName = (marketInfo: MarketTokenStat['marketInfo']) => {
    const poolName = getMarketPoolName(marketInfo);
    return `[${poolName}]`;
  };

  return (
    <SelectorBaseMobileList>
      <div className="text-body-medium mt-5 grid h-[30px] grid-cols-[2fr_1fr_2fr] items-center gap-2 px-5 text-slate-300">
        <div className="text-left">{t`Pool`}</div>
        <div className="text-left">{isLong ? t`Long Liq.` : t`Short Liq.`}</div>
        <div className="text-right">{t`Net Rate`}</div>
      </div>
      {props.options?.map((option) => (
        <div
          key={option.marketInfo.marketTokenAddress.toBase58()}
          className="text-body-medium hover:bg-dark-blue-100 active:bg-dark-blue-200 rounded-4 grid cursor-pointer grid-cols-[2fr_1fr_2fr] items-center gap-2 p-5"
          onClick={() => {
            props.onSelect(option.marketInfo.marketTokenAddress.toBase58());
            close();
          }}
          data-qa={`market-pool-selector-row-${getMarketPoolName(option.marketInfo)}`}
        >
          <div className="text-left">
            {getFormattedPoolName(option.marketInfo)}
          </div>
          <div
            className={cx({
              'text-red-500':
                !props.positionStats[
                  option.marketInfo.marketTokenAddress.toBase58()
                ].isEnoughLiquidity,
            })}
          >
            {formatUsd(
              props.positionStats[
                option.marketInfo.marketTokenAddress.toBase58()
              ].liquidity
            )}
          </div>
          <div
            className={cx('text-right', {
              'text-red-500':
                numberToState(
                  isLong
                    ? option.longNetRatePerSecond.mul(
                      new BN(CHART_PERIODS['1h'])
                    )
                    : option.shortNetRatePerSecond.mul(
                      new BN(CHART_PERIODS['1h'])
                    )
                ) === 'error',
              'text-green-500':
                numberToState(
                  isLong
                    ? option.longNetRatePerSecond.mul(
                      new BN(CHART_PERIODS['1h'])
                    )
                    : option.shortNetRatePerSecond.mul(
                      new BN(CHART_PERIODS['1h'])
                    )
                ) === 'success',
            })}
          >
            {formatRatePercentage(
              isLong
                ? option.longNetRatePerSecond.mul(new BN(CHART_PERIODS['1h']))
                : option.shortNetRatePerSecond.mul(new BN(CHART_PERIODS['1h']))
            )}{' '}
            / 1h
          </div>
        </div>
      ))}
    </SelectorBaseMobileList>
  );
}
