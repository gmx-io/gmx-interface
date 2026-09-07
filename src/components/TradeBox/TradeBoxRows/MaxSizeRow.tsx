import { t } from "@lingui/macro";

import {
  selectTradeboxToToken,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeboxLiquidityInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxLiquidityInfo";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatTokenAmount, formatUsd } from "lib/numbers";

import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import Tooltip from "components/Tooltip/Tooltip";

export function MaxSizeRow() {
  const { isIncrease, isLimit, isLong, isSwap, isTwap } = useSelector(selectTradeboxTradeFlags);
  const toToken = useSelector(selectTradeboxToToken);
  const { shouldShowMaxSize, isSizeAboveMax, maxSizeUsd, maxSizeAmount } = useSelector(selectTradeboxLiquidityInfo);

  if (!shouldShowMaxSize || (!isIncrease && !isSwap)) {
    return null;
  }

  const maxSize = formatUsd(maxSizeUsd);
  let label = isLong ? t`Max long size` : t`Max short size`;
  let value = maxSize;
  let tooltipContent: string;

  if (isSwap) {
    label = t`Max swap size`;
    value = formatTokenAmount(maxSizeAmount, toToken?.decimals, toToken?.symbol, {
      isStable: toToken?.isStable,
    });
    tooltipContent = isSizeAboveMax
      ? t`Order may not execute: insufficient liquidity to fill the swap at the min. receive amount. Edit the min. receive amount or reduce the swap size.`
      : t`Executes when liquidity and price conditions are met`;
  } else if (!isSizeAboveMax) {
    tooltipContent = isLong
      ? t`The most this market can add to long positions right now. Updates live and can change before a resting order triggers.`
      : t`The most this market can add to short positions right now. Updates live and can change before a resting order triggers.`;
  } else if (isTwap) {
    tooltipContent = isLong
      ? t`Parts of this order may not execute: size exceeds the max long size of ${maxSize}. Reduce the order size.`
      : t`Parts of this order may not execute: size exceeds the max short size of ${maxSize}. Reduce the order size.`;
  } else if (isLimit) {
    tooltipContent = isLong
      ? t`Order may not execute: size exceeds the max long size of ${maxSize} at the trigger price. Reduce the order size.`
      : t`Order may not execute: size exceeds the max short size of ${maxSize} at the trigger price. Reduce the order size.`;
  } else {
    tooltipContent = isLong
      ? t`Order won't execute: size exceeds the max long size of ${maxSize}. Reduce the order size.`
      : t`Order won't execute: size exceeds the max short size of ${maxSize}. Reduce the order size.`;
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
