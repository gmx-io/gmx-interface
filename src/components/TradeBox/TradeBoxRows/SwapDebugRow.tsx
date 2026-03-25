import { Trans } from "@lingui/macro";

import {
  selectExternalSwapQuote,
  selectSwapDebugComparison,
  selectTradeboxFromToken,
  selectTradeboxSwapAmounts,
  selectTradeboxToToken,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatDeltaUsd, formatTokenAmount, formatUsd } from "lib/numbers";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export function SwapDebugRow() {
  const { isSwap, isMarket } = useSelector(selectTradeboxTradeFlags);
  const swapAmounts = useSelector(selectTradeboxSwapAmounts);
  const externalSwapQuote = useSelector(selectExternalSwapQuote);
  const fromToken = useSelector(selectTradeboxFromToken);
  const toToken = useSelector(selectTradeboxToToken);
  const comparison = useSelector(selectSwapDebugComparison);

  if (!isSwap || !isMarket || !fromToken || !toToken || !swapAmounts || !comparison) return null;

  const strategyType = swapAmounts.swapStrategy.type;
  const isExternal = strategyType === "externalSwap";
  const winner = isExternal ? "External" : "Internal";
  const winnerColor = isExternal ? "text-green-500" : "text-blue-400";

  const hasQuote = comparison.quotePassedGuards;

  return (
    <SyntheticsInfoRow label={<Trans>Swap Debug</Trans>}>
      <TooltipWithPortal
        handle={
          <span className={winnerColor}>
            {winner}
            {comparison.isExternalLoading ? " ⏳" : ""}
          </span>
        }
        renderContent={() => (
          <div className="text-13">
            {/* Comparison table: same metrics for both routes */}
            <div className="mb-8">
              <table className="w-full">
                <thead>
                  <tr className="text-typography-secondary">
                    <th className="pr-16 text-left font-normal" />
                    <th className="px-8 text-right font-normal text-blue-400">Internal</th>
                    <th className="pl-8 text-right font-normal text-green-500">External</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="pr-16 text-typography-secondary">Amount In</td>
                    <td className="px-8 text-right">
                      {comparison.internalAmountIn !== undefined && comparison.internalAmountIn > 0n
                        ? formatTokenAmount(comparison.internalAmountIn, fromToken.decimals, fromToken.symbol)
                        : "—"}
                    </td>
                    <td className="pl-8 text-right">
                      {externalSwapQuote
                        ? formatTokenAmount(externalSwapQuote.amountIn, fromToken.decimals, fromToken.symbol)
                        : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-16 text-typography-secondary">USD In</td>
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
                    <td className="pr-16 text-typography-secondary">Amount Out</td>
                    <td className="px-8 text-right">
                      {comparison.internalAmountOut !== undefined && comparison.internalAmountOut > 0n
                        ? formatTokenAmount(comparison.internalAmountOut, toToken.decimals, toToken.symbol)
                        : "—"}
                    </td>
                    <td className="pl-8 text-right">
                      {externalSwapQuote
                        ? formatTokenAmount(externalSwapQuote.amountOut, toToken.decimals, toToken.symbol)
                        : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-16 text-typography-secondary">USD Out</td>
                    <td className="px-8 text-right">
                      {comparison.internalUsdOut !== undefined ? formatUsd(comparison.internalUsdOut) : "—"}
                    </td>
                    <td className="pl-8 text-right">
                      {comparison.oracleUsdOut !== undefined ? formatUsd(comparison.oracleUsdOut) : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-16 text-typography-secondary">Fees Delta</td>
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
                    <td className="pr-16 text-typography-secondary">Fee Rate</td>
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

            <div className="my-8 border-t border-slate-700" />

            {/* Decision */}
            <div className="mb-4 font-bold text-typography-primary">Decision</div>
            <StatsTooltipRow label="Direction" value={comparison.direction} showDollar={false} />
            <StatsTooltipRow
              label="External quote"
              value={
                comparison.isExternalLoading
                  ? "Loading..."
                  : !comparison.quoteExistsRaw
                    ? "No quote"
                    : !hasQuote
                      ? "Stale (blocked)"
                      : "Ready"
              }
              showDollar={false}
            />
            {comparison.staleGuardReason && (
              <StatsTooltipRow
                label="Blocked reason"
                value={comparison.staleGuardReason}
                showDollar={false}
                textClassName="text-red-400"
              />
            )}
            {hasQuote && (
              <StatsTooltipRow
                label="Winner (by fee rate)"
                value={comparison.isInternalSwapBetter ? "Internal" : "External"}
                showDollar={false}
                textClassName={comparison.isInternalSwapBetter ? "text-blue-400" : "text-green-500"}
              />
            )}

            <div className="my-8 border-t border-slate-700" />

            {/* Final result */}
            <div className="mb-4 font-bold text-typography-primary">Final</div>
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
          </div>
        )}
      />
    </SyntheticsInfoRow>
  );
}
