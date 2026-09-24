import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import { LimitPriceRow } from '@/components/TradeBox/TradeBoxRows/LimitPriceRow';
import { MinReceiveRow } from '@/components/TradeBox/TradeBoxRows/MinReceiveRow';
import { BN_ZERO, USD_DECIMALS } from '@/config/constants';
import { selectTradeboxFromToken } from '@/selectors/tradebox/selectTradeboxFromToken';
import { selectTradeboxIsWrapOrUnwrap } from '@/selectors/tradebox/selectTradeboxIsWrapOrUnwrap';
import { selectTradeboxMarkPriceDecimals } from '@/selectors/tradebox/selectTradeboxMarkPriceDecimals';
import { selectTradeboxMaxLiquidityPath } from '@/selectors/tradebox/selectTradeboxMaxLiquidityPath';
import { selectTradeboxToToken } from '@/selectors/tradebox/selectTradeboxToToken';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import {
  convertUsdToTokenAmount,
  formatAmount,
  formatPriceUsd,
  formatTokenAmount,
  formatUsd,
  getPriceDecimals,
} from '@/utils/legacy';
import { getTokensRatioByPrices } from '@/utils/token/getTokensRatioByPrices';
import { useAppStore } from '@/zustand/useAppStore';
import { t, Trans } from '@lingui/macro';
import { useMemo } from 'react';

export function SwapCard() {
  const markPriceDecimals = useAppStore(selectTradeboxMarkPriceDecimals);
  const { maxLiquidity } = useAppStore(selectTradeboxMaxLiquidityPath);
  const fromToken = useAppStore(selectTradeboxFromToken);
  const toToken = useAppStore(selectTradeboxToToken);
  const isWrapOrUnwrap = useAppStore(selectTradeboxIsWrapOrUnwrap);
  const { isLimit } = useAppStore(selectTradeboxTradeFlags);
  const maxLiquidityAmount =
    convertUsdToTokenAmount(
      maxLiquidity,
      toToken?.decimals,
      toToken?.prices?.maxPrice
    ) ?? BN_ZERO;

  const ratioStr = useMemo(() => {
    if (!fromToken || !toToken) return '...';

    const markRatio = getTokensRatioByPrices({
      fromToken,
      toToken,
      fromPrice: fromToken.prices.minPrice,
      toPrice: toToken.prices.maxPrice,
    });

    const smallest = markRatio.smallestToken;
    const largest = markRatio.largestToken;

    const ratioDecimals = getPriceDecimals(markRatio.ratio);

    return `${formatAmount(markRatio.ratio, USD_DECIMALS, ratioDecimals)} ${smallest.symbol} / ${
      largest.symbol
    }`;
  }, [fromToken, toToken]);

  const maxOutValue = useMemo(
    () => [
      formatTokenAmount(
        maxLiquidityAmount,
        toToken?.decimals,
        toToken?.symbol,
        {
          useCommas: true,
          displayDecimals: 0,
          maxThreshold: '10000000',
          minThreshold: '1',
        }
      ),
      `(${formatUsd(maxLiquidity, { displayDecimals: 0 })})`,
    ],
    [maxLiquidityAmount, maxLiquidity, toToken?.decimals, toToken?.symbol]
  );

  return (
    <div className="Exchange-swap-market-box App-box App-box-border">
      <div className="App-card-title">
        <Trans>Swap</Trans>
      </div>
      <div>
        {!isWrapOrUnwrap && <MinReceiveRow />}
        {isLimit && <LimitPriceRow displayDecimals={markPriceDecimals} />}
        <ExchangeInfoRow
          label={t`${fromToken?.symbol} Price`}
          value={formatPriceUsd(fromToken?.prices?.minPrice) || '...'}
        />

        <ExchangeInfoRow
          label={t`${toToken?.symbol} Price`}
          value={formatPriceUsd(toToken?.prices?.maxPrice) || '...'}
        />

        <ExchangeInfoRow
          label={t`Available Liquidity`}
          value={`${maxOutValue[0]} ${maxOutValue[1]}`}
        />

        <ExchangeInfoRow label={t`Price`} value={ratioStr} />
      </div>
    </div>
  );
}
