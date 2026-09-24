import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import { ONE_BPS, ONE_USD } from '@/config/constants';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import { selectTradeboxCollateralSpreadInfo } from '@/selectors/tradebox/selectTradeboxCollateralSpreadInfo';
import { useAppStore } from '@/zustand/useAppStore';
import { t } from '@lingui/macro';
import { applyFactor } from '@/utils/legacy/factor';
import { formatPercentage } from '@/utils/legacy/format';

export function CollateralSpreadRow() {
  const tradeFlags = useAppStore(selectTradeboxTradeFlags);
  const { isMarket, isSwap } = tradeFlags;

  const collateralSpreadInfo = useAppStore(selectTradeboxCollateralSpreadInfo);
  const collateralSpreadPercent =
    collateralSpreadInfo && collateralSpreadInfo.spread !== undefined
      ? applyFactor(collateralSpreadInfo.spread, ONE_USD)
          .div(ONE_BPS)
          .toNumber()
      : undefined;
  const showCollateralSpread = !isSwap && isMarket;

  if (!showCollateralSpread) {
    return null;
  }

  return (
    <ExchangeInfoRow
      label={t`Collateral Spread`}
      isWarning={collateralSpreadInfo?.isHigh}
    >
      {collateralSpreadPercent !== undefined
        ? formatPercentage(collateralSpreadPercent, 2, { fallbackToZero: true })
        : '-'}
    </ExchangeInfoRow>
  );
}
