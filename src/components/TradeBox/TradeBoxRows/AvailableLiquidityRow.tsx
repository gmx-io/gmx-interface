import { t } from "@lingui/macro";

import {
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxSwapAmounts,
  selectTradeboxToToken,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeboxLiquidityInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxLiquidityInfo";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatTokenAmount, formatUsd } from "lib/numbers";

import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import Tooltip from "components/Tooltip/Tooltip";

export function AvailableLiquidityRow() {
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const swapAmounts = useSelector(selectTradeboxSwapAmounts);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const toToken = useSelector(selectTradeboxToToken);
  const { isLimit, isSwap, isIncrease, isTwap } = tradeFlags;

  const { isLiquidityRisk, availableLiquidityUsd, availableLiquidityAmount } = useSelector(selectTradeboxLiquidityInfo);

  if (!isLimit && !isTwap) {
    return null;
  }

  let tooltipContent = "";

  if (isSwap && swapAmounts) {
    tooltipContent = isLiquidityRisk
      ? t`Warning: May not execute due to low liquidity at your min. receive price`
      : t`Executes when liquidity and price conditions are met`;
  }

  if (isIncrease && increaseAmounts) {
    tooltipContent = isLiquidityRisk
      ? t`Warning: May not execute due to low liquidity at your trigger price`
      : t`Executes when price and liquidity conditions are met`;
  }

  return (
    <SyntheticsInfoRow label={t`Available liquidity`}>
      <Tooltip
        position="bottom-end"
        handleClassName={isLiquidityRisk ? "negative numbers" : "numbers"}
        handle={
          isSwap
            ? formatTokenAmount(availableLiquidityAmount, toToken?.decimals, toToken?.symbol, {
                isStable: toToken?.isStable,
              })
            : formatUsd(availableLiquidityUsd)
        }
        renderContent={() => tooltipContent}
      />
    </SyntheticsInfoRow>
  );
}
