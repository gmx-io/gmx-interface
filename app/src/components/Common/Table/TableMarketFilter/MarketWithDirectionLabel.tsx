import TokenIcon from '@/components/Common/TokenIcon/TokenIcon';
import { t } from '@lingui/macro';
import cx from 'classnames';
import { getNormalizedTokenSymbolGMX } from '@/utils/token/getNormalizedTokenSymbolGMX';
export function MarketWithDirectionLabel({
  indexName,
  isLong,
  tokenSymbol,
  // bordered,
  iconImportSize,
}: {
  indexName: string;
  isLong: boolean;
  tokenSymbol: string;
  // bordered?: boolean;
  iconImportSize?: 24 | 40;
  }) {
  // console.log('indexName', indexName);
  const marketName = getNormalizedTokenSymbolGMX(indexName.split('/')[0]) + '/' +(indexName.split('/')[1]);
  // console.log('marketName', marketName);
  return (
    <div className="leading-base inline flex items-center">
      <span className={cx(isLong ? 'text-green-500' : 'text-red-500')}>
        {isLong ? t`Long` : t`Short`}
      </span>
      <TokenIcon
        className="mx-5 min-h-20 min-w-20"
        displaySize={20}
        symbol={tokenSymbol === 'WGMX' ? 'GMX' : tokenSymbol}
        importSize={iconImportSize}
      />
      <span>{marketName}</span>
    </div>
  );
}
