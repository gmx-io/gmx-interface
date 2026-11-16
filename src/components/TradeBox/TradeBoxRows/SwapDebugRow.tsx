import { Trans } from "@lingui/macro";
import type { ReactNode } from "react";

import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import {
  selectIncreaseSwapDebugComparison,
  selectSwapDebugComparison,
  selectTradeboxFromToken,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxSelectSwapToToken,
  selectTradeboxSwapAmounts,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatDeltaUsd, formatTokenAmount, formatUsd } from "lib/numbers";

import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import StandardTooltip from "components/Tooltip/StandardTooltip";
import {
  TooltipContent,
  TooltipDivider,
  TooltipRow,
  TooltipRows,
  TooltipTable,
  TooltipTableColumn,
  TooltipTitle,
} from "components/Tooltip/TooltipBlocks";

const COMPARISON_COLUMNS: TooltipTableColumn[] = [
  { label: "" },
  { label: "Internal", align: "right" },
  { label: "External", align: "right" },
];

export function SwapDebugRow() {
  const showDebug = useShowDebugValues();
  if (!showDebug) return null;
  return <SwapDebugRowContent />;
}

function SwapDebugRowContent() {
  const { isSwap, isIncrease } = useSelector(selectTradeboxTradeFlags);
  const swapAmounts = useSelector(selectTradeboxSwapAmounts);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const fromToken = useSelector(selectTradeboxFromToken);
  const toToken = useSelector(selectTradeboxSelectSwapToToken);
  const swapComparison = useSelector(selectSwapDebugComparison);
  const increaseComparison = useSelector(selectIncreaseSwapDebugComparison);

  const comparison = isSwap ? swapComparison : increaseComparison;

  if (!fromToken || !toToken || !comparison) return null;
  if (isSwap && !swapAmounts) return null;
  if (isIncrease && !increaseAmounts) return null;

  const strategyType = isSwap ? swapAmounts!.swapStrategy.type : increaseAmounts!.swapStrategy.type;
  const isExternal = strategyType === "externalSwap";
  const winner = isExternal ? "External" : "Internal";
  const winnerColor = isExternal ? "text-green-500" : "text-blue-400";

  const getComparisonRows = (): ReactNode[][] => [
    [
      "Amount In",
      comparison.internalAmountIn !== undefined && comparison.internalAmountIn > 0n
        ? formatTokenAmount(comparison.internalAmountIn, fromToken.decimals, fromToken.symbol)
        : "—",
      comparison.externalAmountIn !== undefined && comparison.externalAmountIn > 0n
        ? formatTokenAmount(comparison.externalAmountIn, fromToken.decimals, fromToken.symbol)
        : "—",
    ],
    [
      "USD In",
      comparison.internalUsdIn !== undefined && comparison.internalUsdIn > 0n
        ? formatUsd(comparison.internalUsdIn)
        : "—",
      comparison.oracleUsdIn !== undefined ? formatUsd(comparison.oracleUsdIn) : "—",
    ],
    [
      "Amount Out",
      comparison.internalAmountOut !== undefined && comparison.internalAmountOut > 0n
        ? formatTokenAmount(comparison.internalAmountOut, toToken.decimals, toToken.symbol)
        : "—",
      comparison.externalAmountOut !== undefined && comparison.externalAmountOut > 0n
        ? formatTokenAmount(comparison.externalAmountOut, toToken.decimals, toToken.symbol)
        : "—",
    ],
    [
      "USD Out",
      comparison.internalUsdOut !== undefined ? formatUsd(comparison.internalUsdOut) : "—",
      comparison.oracleUsdOut !== undefined ? formatUsd(comparison.oracleUsdOut) : "—",
    ],
    [
      "Fees Delta",
      comparison.internalFeesDeltaUsd !== undefined ? formatDeltaUsd(comparison.internalFeesDeltaUsd) : "—",
      comparison.oracleFeesUsd !== undefined ? formatDeltaUsd(-comparison.oracleFeesUsd) : "—",
    ],
    [
      "Fee Rate",
      comparison.internalFeesDeltaUsd !== undefined &&
      comparison.internalUsdIn !== undefined &&
      comparison.internalUsdIn > 0n
        ? `${(Number((comparison.internalFeesDeltaUsd * 10000n) / comparison.internalUsdIn) / 100).toFixed(2)}%`
        : "—",
      comparison.oracleFeesUsd !== undefined && comparison.oracleUsdIn !== undefined && comparison.oracleUsdIn > 0n
        ? `${(Number((-comparison.oracleFeesUsd * 10000n) / comparison.oracleUsdIn) / 100).toFixed(2)}%`
        : "—",
    ],
  ];

  return (
    <SyntheticsInfoRow label={<Trans>Swap debug</Trans>}>
      <StandardTooltip
        handle={
          <span className={winnerColor}>
            {winner}
            {comparison.isExternalLoading ? " ⏳" : ""}
          </span>
        }
        size="wide"
        renderContent={() => (
          <TooltipContent>
            <TooltipTable columns={COMPARISON_COLUMNS} rows={getComparisonRows()} />

            <TooltipDivider />

            <TooltipRows>
              <TooltipTitle>Decision</TooltipTitle>
              <TooltipRow label="Direction" value={comparison.direction} />
              <TooltipRow
                label="External quote"
                value={
                  comparison.isExternalLoading
                    ? "Loading..."
                    : !comparison.quoteExistsRaw
                      ? "No quote"
                      : !comparison.quotePassedGuards
                        ? "Stale (blocked)"
                        : "Ready"
                }
              />
              {comparison.debugForceExternalSwaps && (
                <TooltipRow label="Force external" value="ON (debug)" valueClassName="text-yellow-500" />
              )}
              {comparison.staleGuardReason && (
                <TooltipRow label="Blocked reason" value={comparison.staleGuardReason} valueClassName="text-red-400" />
              )}
              {comparison.noInternalLiquidity && (
                <TooltipRow label="Internal liquidity" value="Insufficient" valueClassName="text-red-400" />
              )}
              {comparison.noExternalLiquidity && (
                <TooltipRow label="External liquidity" value="No route found" valueClassName="text-red-400" />
              )}
              {comparison.quotePassedGuards && (
                <TooltipRow
                  label="Winner (by fee rate)"
                  value={comparison.isInternalSwapBetter ? "Internal" : "External"}
                  valueClassName={comparison.isInternalSwapBetter ? undefined : "text-green-500"}
                />
              )}
            </TooltipRows>

            <TooltipDivider />

            <TooltipRows>
              <TooltipTitle>Final</TooltipTitle>
              {isSwap && swapAmounts && (
                <>
                  <TooltipRow
                    label="Amount Out"
                    value={formatTokenAmount(swapAmounts.amountOut, toToken.decimals, toToken.symbol)}
                  />
                  <TooltipRow label="USD Out" value={formatUsd(swapAmounts.usdOut)} />
                  <TooltipRow
                    label="Min Output"
                    value={formatTokenAmount(swapAmounts.minOutputAmount, toToken.decimals, toToken.symbol)}
                  />
                </>
              )}
              {isIncrease && increaseAmounts && (
                <>
                  <TooltipRow label="Strategy" value={strategyType} />
                  <TooltipRow
                    label="Swap Out"
                    value={formatTokenAmount(increaseAmounts.swapStrategy.amountOut, toToken.decimals, toToken.symbol)}
                  />
                  <TooltipRow label="Swap USD Out" value={formatUsd(increaseAmounts.swapStrategy.usdOut)} />
                </>
              )}
            </TooltipRows>
          </TooltipContent>
        )}
      />
    </SyntheticsInfoRow>
  );
}
