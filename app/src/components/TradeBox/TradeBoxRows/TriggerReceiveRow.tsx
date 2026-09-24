import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import { selectTradeboxDecreasePositionAmounts } from '@/selectors/tradebox/selectTradeboxDecreasePositionAmounts';
import { selectTradeboxReceiveToken } from '@/selectors/tradebox/selectTradeboxReceiveToken';
import { selectTradeboxSwapAmountsForReceiveToken } from '@/selectors/tradebox/selectTradeboxSwapAmountsForReceiveToken';
import { formatTokenAmountWithUsd } from '@/utils/legacy/format';
import { useAppStore } from '@/zustand/useAppStore';
import { t } from '@lingui/macro';

export function TriggerReceiveRow() {
  const receiveToken = useAppStore(selectTradeboxReceiveToken);
  const decreaseAmounts = useAppStore(selectTradeboxDecreasePositionAmounts);
  const swapAmountsForReceiveToken = useAppStore(
    selectTradeboxSwapAmountsForReceiveToken
  );

  const receiveUsd =
    swapAmountsForReceiveToken?.usdOut || decreaseAmounts?.receiveUsd;
  const receiveTokenAmount =
    swapAmountsForReceiveToken?.amountOut ||
    decreaseAmounts?.receiveTokenAmount;

  if (!receiveToken || receiveUsd === undefined) {
    return null;
  }

  return (
    <ExchangeInfoRow
      label={t`Receive`}
      className="Exchange-info-row PositionSeller-receive-row"
      value={
        <span className="PositionSelector-selected-receive-token">
          {formatTokenAmountWithUsd(
            receiveTokenAmount,
            receiveUsd,
            receiveToken.symbol,
            receiveToken.decimals,
            {
              fallbackToZero: true,
            }
          )}
        </span>
      }
    />
  );
}
