import { t } from "@lingui/macro";

import {
  selectTradeboxToToken,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeboxLiquidityInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxLiquidityInfo";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getMaxPositionSizeExceededMessage } from "domain/synthetics/trade/utils/getMaxPositionSizeExceededMessage";
import { formatTokenAmount, formatUsd } from "lib/numbers";

import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import Tooltip from "components/Tooltip/Tooltip";

export function MaxSizeRow() {
  const { isIncrease, isLimit, isLong, isMarket, isSwap, isTwap } = useSelector(selectTradeboxTradeFlags);
  const toToken = useSelector(selectTradeboxToToken);
  const { shouldShowMaxSize, isSizeAboveMax, maxSizeUsd, maxSizeAmount } = useSelector(selectTradeboxLiquidityInfo);

  if (!shouldShowMaxSize || (!isIncrease && !isSwap)) {
    return null;
  }

  const positionSide = isLong ? t`long` : t`short`;
  const maxSize = formatUsd(maxSizeUsd);
  let label = t`Max ${positionSide} size`;
  let value = maxSize;
  let tooltipContent: string;

  if (isSwap) {
    label = t`Max swap size`;
    value = formatTokenAmount(maxSizeAmount, toToken?.decimals, toToken?.symbol, {
      isStable: toToken?.isStable,
    });
    if (isMarket || isTwap) {
      const maxSwapSize = value;
      tooltipContent = isSizeAboveMax
        ? t`Order won't execute: size exceeds the max swap size of ${maxSwapSize}. Reduce the swap size.`
        : t`The maximum swap size based on current liquidity. Updates live.`;
    } else {
      tooltipContent = isSizeAboveMax
        ? t`Order may not execute: insufficient liquidity to fill the swap at the min. receive amount. Edit the min. receive amount or reduce the swap size.`
        : t`Executes when liquidity and price conditions are met`;
    }
  } else if (!isSizeAboveMax) {
    tooltipContent = t`The most this market can add to ${positionSide} positions right now. Updates live and can change before a resting order triggers.`;
  } else if (isTwap) {
    tooltipContent = t`Parts of this order may not execute: size exceeds the max ${positionSide} size of ${maxSize}. Reduce the order size.`;
  } else if (isLimit) {
    tooltipContent = t`Order may not execute: size exceeds the max ${positionSide} size of ${maxSize} at the trigger price. Reduce the order size.`;
  } else {
    tooltipContent = getMaxPositionSizeExceededMessage(isLong, maxSizeUsd);
  }

  return (
    <SyntheticsInfoRow label={label} qa="max-size">
      <Tooltip
        position="bottom-end"
        handleClassName={isSizeAboveMax ? "negative numbers" : "numbers"}
        handle={value}
        renderContent={() => tooltipContent}
      />
    </SyntheticsInfoRow>
  );
}
