import { t } from "@lingui/macro";

import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import Tooltip from "components/Tooltip/Tooltip";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  useTradeboxIncreasePositionAmounts,
  useTradeboxLiquidity,
  useTradeboxMaxLiquidityPath,
  useTradeboxSwapAmounts,
  useTradeboxToTokenAddress,
  useTradeboxTradeFlags,
} from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import { convertToTokenAmount } from "domain/synthetics/tokens";
import { bigMath } from "lib/bigmath";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";

const RISK_THRESHOLD_BPS = 5000n;

export function AvailableLiquidityRow() {
  const tokensData = useTokensData();
  const tradeFlags = useTradeboxTradeFlags();
  const swapAmounts = useTradeboxSwapAmounts();
  const increaseAmounts = useTradeboxIncreasePositionAmounts();
  const toTokenAddress = useTradeboxToTokenAddress();
  const { longLiquidity, shortLiquidity } = useTradeboxLiquidity();
  const toToken = getByKey(tokensData, toTokenAddress);
  const { maxLiquidity: swapLiquidityUsd } = useTradeboxMaxLiquidityPath();
  const { isLong, isLimit, isSwap, isIncrease } = tradeFlags;

  if (!isLimit) {
    return null;
  }

  let availableLiquidityUsd: bigint | undefined = undefined;
  let availableLiquidityAmount: bigint | undefined = undefined;
  let isLiquidityRisk = false;

  let tooltipContent = "";

  if (isSwap && swapAmounts) {
    availableLiquidityUsd = swapLiquidityUsd;

    availableLiquidityAmount = convertToTokenAmount(availableLiquidityUsd, toToken?.decimals, toToken?.prices.maxPrice);

    isLiquidityRisk =
      bigMath.mulDiv(availableLiquidityUsd, RISK_THRESHOLD_BPS, BASIS_POINTS_DIVISOR_BIGINT) < swapAmounts.usdOut;

    tooltipContent = isLiquidityRisk
      ? t`There may not be sufficient liquidity to execute your order when the Min. Receive are met.`
      : t`The order will be executed if there is sufficient liquidity and the execution price guarantees that you will receive the minimum receive amount.`;
  }

  if (isIncrease && increaseAmounts) {
    availableLiquidityUsd = isLong ? longLiquidity : shortLiquidity;

    isLiquidityRisk =
      bigMath.mulDiv(availableLiquidityUsd!, RISK_THRESHOLD_BPS, BASIS_POINTS_DIVISOR_BIGINT) <
      increaseAmounts.sizeDeltaUsd;

    tooltipContent = isLiquidityRisk
      ? t`There may not be sufficient liquidity to execute your order when the price conditions are met.`
      : t`The order will only execute if the price conditions are met and there is sufficient liquidity.`;
  }

  return (
    <ExchangeInfo.Row label={t`Available Liquidity`}>
      <Tooltip
        position="bottom-end"
        handleClassName={isLiquidityRisk ? "negative" : ""}
        handle={
          isSwap
            ? formatTokenAmount(availableLiquidityAmount, toToken?.decimals, toToken?.symbol)
            : formatUsd(availableLiquidityUsd)
        }
        renderContent={() => tooltipContent}
      />
    </ExchangeInfo.Row>
  );
}
