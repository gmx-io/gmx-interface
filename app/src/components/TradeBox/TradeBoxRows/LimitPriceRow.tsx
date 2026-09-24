import Tooltip from '@/components/Common/Tooltip/Tooltip';
import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import { USD_DECIMALS } from '@/config/constants';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { useMemo } from 'react';
import { formatTokensRatio, formatUsd } from '@/utils/legacy/format';
import { selectTradeboxTriggerPriceInputValue } from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxTradeRatios } from '@/selectors/tradebox/selectTradeboxTradeRatios';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import { selectTradeboxFromToken } from '@/selectors/tradebox/selectTradeboxFromToken';
import { selectTradeboxToToken } from '@/selectors/tradebox/selectTradeboxToToken';
import { parseValue } from '@/utils/legacy/parse';

export function LimitPriceRow({
  displayDecimals,
}: {
  displayDecimals: number;
}) {
  const { isLimit, isSwap, isIncrease } = useAppStore(selectTradeboxTradeFlags);
  const triggerPrice = useAppStore(selectTradeboxTriggerPriceInputValue);
  const fromToken = useAppStore(selectTradeboxFromToken);
  const toToken = useAppStore(selectTradeboxToToken);
  const { triggerRatio } = useAppStore(selectTradeboxTradeRatios);

  const value = useMemo(() => {
    if (!isLimit) return null;

    if (isSwap) {
      const formattedRatio =
        formatTokensRatio(fromToken, toToken, triggerRatio) || '-';
      return (
        <Tooltip
          position="bottom-end"
          handle={formattedRatio}
          renderContent={() =>
            t`The execution price for the limit order updates in real-time on the orders tab after order creation to guarantee that you receive the minimum receive amount.`
          }
        />
      );
    }
    if (isIncrease) {
      const parsedValue = parseValue(triggerPrice, USD_DECIMALS);
      if (parsedValue === undefined) return '-';
      return (
        formatUsd(new BN(parsedValue), {
          displayDecimals,
        }) || '-'
      );
    }

    return null;
  }, [
    isLimit,
    isSwap,
    isIncrease,
    fromToken,
    toToken,
    triggerRatio,
    triggerPrice,
    displayDecimals,
  ]);

  if (!value) return null;

  return <ExchangeInfoRow label={t`Limit Price`} value={value} />;
}
