import { ValueTransition } from '@/components/Common/ValueTransition/ValueTransition';
import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import { useAppStore } from '@/zustand/useAppStore';
import { t } from '@lingui/macro';
import { formatUsd } from '@/utils/legacy/format';
import { selectTradeboxMarkPriceDecimals } from '@/selectors/tradebox/selectTradeboxMarkPriceDecimals';
import { selectTradeboxMarkPrice } from '@/selectors/tradebox/selectTradeboxMarkPrice';
import { selectTradeboxNextPositionValues } from '@/selectors/tradebox/selectTradeboxNextPositionValues';
import { selectTradeboxSelectedPosition } from '@/selectors/tradebox/selectTradeboxSelectedPosition';
import { selectTradeboxAdvancedOptions } from '@/selectors/tradebox/baseSelectors';

export function EntryPriceRow() {
  const advancedDisplay = useAppStore(selectTradeboxAdvancedOptions);
  const selectedPosition = useAppStore(selectTradeboxSelectedPosition);
  const nextPositionValues = useAppStore(selectTradeboxNextPositionValues);
  const markPrice = useAppStore(selectTradeboxMarkPrice);
  const markPriceDecimals = useAppStore(selectTradeboxMarkPriceDecimals);

  if (!advancedDisplay || !selectedPosition) {
    return null;
  }

  return (
    <ExchangeInfoRow
      label={t`Entry Price`}
      value={
        nextPositionValues?.nextEntryPrice || selectedPosition?.entryPrice ? (
          <ValueTransition
            from={formatUsd(selectedPosition?.entryPrice, {
              displayDecimals: markPriceDecimals,
            })}
            to={formatUsd(nextPositionValues?.nextEntryPrice, {
              displayDecimals: markPriceDecimals,
            })}
          />
        ) : (
          formatUsd(markPrice, {
            displayDecimals: markPriceDecimals,
          })
        )
      }
    />
  );
}
