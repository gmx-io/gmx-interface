import { Trans } from "@lingui/macro";

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

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

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
  const winnerColor = isExternal ? "text-green-strong" : "text-blue-strong";

  return (
    <SyntheticsInfoRow label={<Trans>Swap debug</Trans>}>
      <TooltipWithPortal
        handle={
          <span className={winnerColor}>
            {winner}
            {comparison.isExternalLoading ? " ⏳" : ""}
          </span>
        }
        renderContent={() => (
          <div className="text-body-small">
            {/* Comparison table: same metrics for both routes */}
            <div className="mb-8">
              <table className="w-full">
                <thead>
                  <tr className="text-textIcon-secondary">
                    <th className="pr-16 text-left font-normal" />
                    <th className="px-8 text-right font-normal text-blue-strong">Internal</th>
                    <th className="pl-8 text-right font-normal text-green-strong">External</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="pr-16 text-textIcon-secondary">Amount In</td>
                    <td className="px-8 text-right">
                      {comparison.internalAmountIn !== undefined && comparison.internalAmountIn > 0n
                        ? formatTokenAmount(comparison.internalAmountIn, fromToken.decimals, fromToken.symbol)
                        : "—"}
                    </td>
                    <td className="pl-8 text-right">
                      {comparison.externalAmountIn !== undefined && comparison.externalAmountIn > 0n
                        ? formatTokenAmount(comparison.externalAmountIn, fromToken.decimals, fromToken.symbol)
                        : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-16 text-textIcon-secondary">USD In</td>
                    <td className="px-8 text-right">
                      {comparison.internalUsdIn !== undefined && comparison.internalUsdIn > 0n
                        ? formatUsd(comparison.internalUsdIn)
                        : "—"}
                    </td>
                    <td className="pl-8 text-right">
                      {comparison.oracleUsdIn !== undefined ? formatUsd(comparison.oracleUsdIn) : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-16 text-textIcon-secondary">Amount Out</td>
                    <td className="px-8 text-right">
                      {comparison.internalAmountOut !== undefined && comparison.internalAmountOut > 0n
                        ? formatTokenAmount(comparison.internalAmountOut, toToken.decimals, toToken.symbol)
                        : "—"}
                    </td>
                    <td className="pl-8 text-right">
                      {comparison.externalAmountOut !== undefined && comparison.externalAmountOut > 0n
                        ? formatTokenAmount(comparison.externalAmountOut, toToken.decimals, toToken.symbol)
                        : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-16 text-textIcon-secondary">USD Out</td>
                    <td className="px-8 text-right">
                      {comparison.internalUsdOut !== undefined ? formatUsd(comparison.internalUsdOut) : "—"}
                    </td>
                    <td className="pl-8 text-right">
                      {comparison.oracleUsdOut !== undefined ? formatUsd(comparison.oracleUsdOut) : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-16 text-textIcon-secondary">Fees Delta</td>
                    <td className="px-8 text-right">
                      {comparison.internalFeesDeltaUsd !== undefined
                        ? formatDeltaUsd(comparison.internalFeesDeltaUsd)
                        : "—"}
                    </td>
                    <td className="pl-8 text-right">
                      {comparison.oracleFeesUsd !== undefined ? formatDeltaUsd(-comparison.oracleFeesUsd) : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-16 text-textIcon-secondary">Fee Rate</td>
                    <td className="px-8 text-right">
                      {comparison.internalFeesDeltaUsd !== undefined &&
                      comparison.internalUsdIn !== undefined &&
                      comparison.internalUsdIn > 0n
                        ? `${(Number((comparison.internalFeesDeltaUsd * 10000n) / comparison.internalUsdIn) / 100).toFixed(2)}%`
                        : "—"}
                    </td>
                    <td className="pl-8 text-right">
                      {comparison.oracleFeesUsd !== undefined &&
                      comparison.oracleUsdIn !== undefined &&
                      comparison.oracleUsdIn > 0n
                        ? `${(Number((-comparison.oracleFeesUsd * 10000n) / comparison.oracleUsdIn) / 100).toFixed(2)}%`
                        : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="my-8 border-t border-button-background" />

            {/* Decision */}
            <div className="mb-4 font-medium text-textIcon-primary">Decision</div>
            <StatsTooltipRow label="Direction" value={comparison.direction} showDollar={false} />
            <StatsTooltipRow
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
              showDollar={false}
            />
            {comparison.debugForceExternalSwaps && (
              <StatsTooltipRow
                label="Force external"
                value="ON (debug)"
                showDollar={false}
                textClassName="text-yellow-strong"
              />
            )}
            {comparison.staleGuardReason && (
              <StatsTooltipRow
                label="Blocked reason"
                value={comparison.staleGuardReason}
                showDollar={false}
                textClassName="text-red-strong"
              />
            )}
            {comparison.noInternalLiquidity && (
              <StatsTooltipRow
                label="Internal liquidity"
                value="Insufficient"
                showDollar={false}
                textClassName="text-red-strong"
              />
            )}
            {comparison.noExternalLiquidity && (
              <StatsTooltipRow
                label="External liquidity"
                value="No route found"
                showDollar={false}
                textClassName="text-red-strong"
              />
            )}
            {comparison.quotePassedGuards && (
              <StatsTooltipRow
                label="Winner (by fee rate)"
                value={comparison.isInternalSwapBetter ? "Internal" : "External"}
                showDollar={false}
                textClassName={comparison.isInternalSwapBetter ? "text-blue-strong" : "text-green-strong"}
              />
            )}

            <div className="my-8 border-t border-button-background" />

            {/* Final result */}
            <div className="mb-4 font-medium text-textIcon-primary">Final</div>
            {isSwap && swapAmounts && (
              <>
                <StatsTooltipRow
                  label="Amount Out"
                  value={formatTokenAmount(swapAmounts.amountOut, toToken.decimals, toToken.symbol)}
                  showDollar={false}
                />
                <StatsTooltipRow label="USD Out" value={formatUsd(swapAmounts.usdOut)} showDollar={false} />
                <StatsTooltipRow
                  label="Min Output"
                  value={formatTokenAmount(swapAmounts.minOutputAmount, toToken.decimals, toToken.symbol)}
                  showDollar={false}
                />
              </>
            )}
            {isIncrease && increaseAmounts && (
              <>
                <StatsTooltipRow label="Strategy" value={strategyType} showDollar={false} />
                <StatsTooltipRow
                  label="Swap Out"
                  value={formatTokenAmount(increaseAmounts.swapStrategy.amountOut, toToken.decimals, toToken.symbol)}
                  showDollar={false}
                />
                <StatsTooltipRow
                  label="Swap USD Out"
                  value={formatUsd(increaseAmounts.swapStrategy.usdOut)}
                  showDollar={false}
                />
              </>
            )}
          </div>
        )}
      />
    </SyntheticsInfoRow>
  );
}
