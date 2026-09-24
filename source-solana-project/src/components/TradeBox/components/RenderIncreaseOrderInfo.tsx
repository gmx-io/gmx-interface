import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import { ExecutionPriceRow } from '@/components/TradeBox/TradeBoxRows/ExecutionPriceRow';
import { ValueTransition } from '@/components/Common/ValueTransition/ValueTransition';
import { BN_ZERO } from '@/config/constants';
import { OrderType } from '@/selectors/order/types';
import { selectSavedAllowedSlippage } from '@/selectors/setting/baseSelectors';
import { selectTradeboxExecutionPrice } from '@/selectors/tradebox/selectTradeboxExecutionPrice';
import { selectTradeboxIncreasePositionAmounts } from '@/selectors/tradebox/selectTradeboxIncreasePositionAmounts';
import { selectTradeboxMarkPriceDecimals } from '@/selectors/tradebox/selectTradeboxMarkPriceDecimals';
import { selectTradeboxNextPositionValues } from '@/selectors/tradebox/selectTradeboxNextPositionValues';
import { selectTradeboxSelectedPosition } from '@/selectors/tradebox/selectTradeboxSelectedPosition';
import { selectTradeboxTradeFees } from '@/selectors/tradebox/selectTradeboxTradeFees';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import { formatLiquidationPrice } from '@/utils/legacy/format';
import { applySlippageToPrice } from '@/utils/tradebox/applySlippageToPrice';
import { useAppStore } from '@/zustand/useAppStore';
import { t } from '@lingui/macro';

export function RenderIncreaseOrderInfo() {
  const increaseAmounts = useAppStore(selectTradeboxIncreasePositionAmounts);
  const tradeFlags = useAppStore(selectTradeboxTradeFlags);
  const { isMarket, isLong, isLimit } = tradeFlags;
  const allowedSlippage = useAppStore(selectSavedAllowedSlippage);
  const selectedPosition = useAppStore(selectTradeboxSelectedPosition);
  const fees = useAppStore(selectTradeboxTradeFees);
  const markPriceDecimals = useAppStore(selectTradeboxMarkPriceDecimals);
  const executionPrice = useAppStore(selectTradeboxExecutionPrice);
  const nextPositionValues = useAppStore(selectTradeboxNextPositionValues);

  const acceptablePrice =
    isMarket && increaseAmounts?.acceptablePrice
      ? applySlippageToPrice(
          allowedSlippage,
          increaseAmounts.acceptablePrice,
          true,
          isLong
        )
      : increaseAmounts?.acceptablePrice;

  return (
    <>
      <ExecutionPriceRow
        tradeFlags={tradeFlags}
        displayDecimals={markPriceDecimals}
        fees={fees}
        acceptablePrice={acceptablePrice}
        executionPrice={executionPrice ?? undefined}
        orderType={isLimit ? OrderType.LimitIncrease : OrderType.MarketIncrease}
      />
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
              increaseAmounts?.sizeDeltaUsd &&
              increaseAmounts.sizeDeltaUsd.gt(BN_ZERO)
                ? formatLiquidationPrice(nextPositionValues?.nextLiqPrice, {
                    displayDecimals: markPriceDecimals,
                  })
                : selectedPosition
                  ? undefined
                  : '-'
            }
          />
        }
      />
    </>
  );
}
