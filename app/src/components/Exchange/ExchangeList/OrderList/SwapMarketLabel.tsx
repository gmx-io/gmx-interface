import TokenIcon from '@/components/Common/TokenIcon/TokenIcon';
import cx from 'classnames';

export function SwapMarketLabel({
  fromSymbol,
  toSymbol,
  bordered,
}: {
  fromSymbol: string | undefined;
  toSymbol: string | undefined;
  bordered?: boolean;
}) {
  return (
    <span
      className={cx('inline-flex items-center', {
        'cursor-help border-b border-dashed border-gray-400 decoration-gray-400 decoration-dashed decoration-1':
          bordered,
      })}
    >
      {fromSymbol ? (
        <TokenIcon
          symbol={fromSymbol === 'WGMX' ? 'GMX' : fromSymbol}
          displaySize={20}
          className="relative z-10 min-h-20 min-w-20"
        />
      ) : (
        '...'
      )}
      {toSymbol ? (
        <TokenIcon
          symbol={toSymbol === 'WGMX' ? 'GMX' : toSymbol}
          displaySize={20}
          className="ml-3 mr-5 min-h-20 min-w-20"
        />
      ) : (
        '...'
      )}
      {fromSymbol === 'WGMX' ? 'GMX' : fromSymbol}/{toSymbol === 'WGMX' ? 'GMX' : toSymbol}
    </span>
  );
}
