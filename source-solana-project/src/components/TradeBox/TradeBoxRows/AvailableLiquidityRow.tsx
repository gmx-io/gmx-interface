import Tooltip from '@/components/Common/Tooltip/Tooltip';
import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import { useAppStore } from '@/zustand/useAppStore';
import { t } from '@lingui/macro';
import { selectTradeboxIncreasePositionAmounts } from '@/selectors/tradebox/selectTradeboxIncreasePositionAmounts';
import { selectTradeboxLiquidityInfo } from '@/selectors/tradebox/selectTradeboxLiquidityInfo';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import { selectTradeboxSwapAmounts } from '@/selectors/tradebox/selectTradeboxSwapAmounts';
import { selectTradeboxToToken } from '@/selectors/tradebox/selectTradeboxToToken';
import { formatUsd } from '@/utils/legacy/format';
import { formatTokenAmount } from '@/utils/legacy/format';

export function AvailableLiquidityRow() {
  const tradeFlags = useAppStore(selectTradeboxTradeFlags);
  const swapAmounts = useAppStore(selectTradeboxSwapAmounts);
  const increaseAmounts = useAppStore(selectTradeboxIncreasePositionAmounts);
  const toToken = useAppStore(selectTradeboxToToken);
  const { isLimit, isSwap, isIncrease } = tradeFlags;

  const { isLiquidityRisk, availableLiquidityUsd, availableLiquidityAmount } =
    useAppStore(selectTradeboxLiquidityInfo);

  if (!isLimit) {
    return null;
  }

  let tooltipContent = '';

  if (isSwap && swapAmounts) {
    tooltipContent = isLiquidityRisk
      ? t`There may not be sufficient liquidity to execute your order when the Min. Receive are met.`
      : t`The order will be executed if there is sufficient liquidity and the execution price guarantees that you will receive the minimum receive amount.`;
  }

  if (isIncrease && increaseAmounts) {
    tooltipContent = isLiquidityRisk
      ? t`There may not be sufficient liquidity to execute your order when the price conditions are met.`
      : t`The order will only execute if the price conditions are met and there is sufficient liquidity.`;
  }

  return (
    <ExchangeInfoRow label={t`Available Liquidity`}>
      <Tooltip
        position="bottom-end"
        handleClassName={isLiquidityRisk ? 'negative' : ''}
        handle={
          isSwap
            ? formatTokenAmount(
                availableLiquidityAmount,
                toToken?.decimals,
                toToken?.symbol
              )
            : formatUsd(availableLiquidityUsd)
        }
        renderContent={() => tooltipContent}
      />
    </ExchangeInfoRow>
  );
}
