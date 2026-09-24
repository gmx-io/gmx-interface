import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import { BN_ZERO, ONE_USD, USD_DECIMALS } from '@/config/constants';
import { selectTradeboxFromToken } from '@/selectors/tradebox/selectTradeboxFromToken';
import { selectTradeboxMarketInfo } from '@/selectors/tradebox/selectTradeboxMarketInfo';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import { formatAmount } from '@/utils/legacy/format';
import { getSpread } from '@/utils/token/getSpread';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { useMemo } from 'react';
import { useAppStore } from '@/zustand/useAppStore';
import { selectTradeboxToToken } from '@/selectors/tradebox/selectTradeboxToToken';

export function SwapSpreadRow() {
  const tradeFlags = useAppStore(selectTradeboxTradeFlags);
  const fromToken = useAppStore(selectTradeboxFromToken);
  const toToken = useAppStore(selectTradeboxToToken);
  const marketInfo = useAppStore(selectTradeboxMarketInfo);

  const indexToken = marketInfo?.indexToken;

  const { isMarket, isSwap, isLong, isIncrease } = tradeFlags;

  const swapSpreadInfo = useMemo(() => {
    let spread = BN_ZERO;

    if (isSwap && fromToken && toToken) {
      const fromSpread = getSpread(fromToken.prices);
      const toSpread = getSpread(toToken.prices);

      spread = fromSpread.add(toSpread);
    } else if (isIncrease && fromToken && indexToken) {
      const fromSpread = getSpread(fromToken.prices);
      const toSpread = getSpread(indexToken.prices);

      spread = fromSpread.add(toSpread);

      if (isLong) {
        spread = fromSpread;
      }
    }

    const isHigh = spread.gt(ONE_USD); // 100%

    const showSpread = isMarket;

    return { spread, showSpread, isHigh };
  }, [isSwap, fromToken, toToken, isIncrease, indexToken, isMarket, isLong]);

  if (!isSwap) {
    return null;
  }

  return (
    swapSpreadInfo.showSpread &&
    swapSpreadInfo.spread !== undefined && (
      <ExchangeInfoRow label={t`Spread`} isWarning={swapSpreadInfo.isHigh}>
        {formatAmount(
          swapSpreadInfo.spread.mul(new BN(100)),
          USD_DECIMALS,
          2,
          true
        )}
        %
      </ExchangeInfoRow>
    )
  );
}
