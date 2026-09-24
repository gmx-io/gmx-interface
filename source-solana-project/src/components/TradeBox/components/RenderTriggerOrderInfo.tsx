import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import { ExecutionPriceRow } from '@/components/TradeBox/TradeBoxRows/ExecutionPriceRow';
import { ValueTransition } from '@/components/Common/ValueTransition/ValueTransition';
import { BN_ZERO } from '@/config/constants';
import { selectTradeboxAcceptablePrice } from '@/selectors/tradebox/selectTradeboxAcceptablePrice';
import { selectTradeboxDecreasePositionAmounts } from '@/selectors/tradebox/selectTradeboxDecreasePositionAmounts';
import { selectTradeboxExecutionPrice } from '@/selectors/tradebox/selectTradeboxExecutionPrice';
import { selectTradeboxMarkPriceDecimals } from '@/selectors/tradebox/selectTradeboxMarkPriceDecimals';
import { selectTradeboxNextPositionValues } from '@/selectors/tradebox/selectTradeboxNextPositionValues';
import { selectTradeboxSelectedPosition } from '@/selectors/tradebox/selectTradeboxSelectedPosition';
import { selectTradeboxTradeFees } from '@/selectors/tradebox/selectTradeboxTradeFees';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import { formatLiquidationPrice, formatUsd } from '@/utils/legacy/format';
import { useAppStore } from '@/zustand/useAppStore';
import { t } from '@lingui/macro';

export function RenderTriggerOrderInfo() {
  const decreaseAmounts = useAppStore(selectTradeboxDecreasePositionAmounts);
  const markPriceDecimals = useAppStore(selectTradeboxMarkPriceDecimals);
  const tradeFlags = useAppStore(selectTradeboxTradeFlags);
  const executionPrice = useAppStore(selectTradeboxExecutionPrice);
  const nextPositionValues = useAppStore(selectTradeboxNextPositionValues);
  const selectedPosition = useAppStore(selectTradeboxSelectedPosition);
  const fees = useAppStore(selectTradeboxTradeFees);
  const acceptablePrice = useAppStore(selectTradeboxAcceptablePrice);
  const triggerOrderType = decreaseAmounts?.triggerOrderType;

  return (
    <>
      <ExchangeInfoRow
        label={t`Trigger Price`}
        value={`${decreaseAmounts?.triggerThresholdType || ''} ${
          formatUsd(decreaseAmounts?.triggerPrice, {
            displayDecimals: markPriceDecimals,
          }) || '-'
        }`}
      />

      <ExecutionPriceRow
        tradeFlags={tradeFlags}
        displayDecimals={markPriceDecimals}
        fees={fees}
        executionPrice={executionPrice ?? undefined}
        triggerOrderType={triggerOrderType}
        orderType={triggerOrderType}
        acceptablePrice={acceptablePrice}
      />

      {selectedPosition && (
        <ExchangeInfoRow
          label={t`Liquidation Price`}
          value={
            <ValueTransition
              from={
                selectedPosition
                  ? formatLiquidationPrice(selectedPosition?.liquidationPrice, {
                      displayDecimals: markPriceDecimals,
                    })
                  : undefined
              }
              to={
                decreaseAmounts?.isFullClose
                  ? '-'
                  : decreaseAmounts?.sizeDeltaUsd &&
                      decreaseAmounts.sizeDeltaUsd.gt(BN_ZERO)
                    ? formatLiquidationPrice(nextPositionValues?.nextLiqPrice, {
                        displayDecimals: markPriceDecimals,
                      })
                    : undefined
              }
            />
          }
        />
      )}
    </>
  );
}
