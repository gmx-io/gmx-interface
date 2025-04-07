import { Trans, t } from "@lingui/macro";
import { Link } from "react-router-dom";

import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { TokenInfo } from "domain/tokens";
import { formatAmount } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipComponent from "components/Tooltip/Tooltip";

export function WeightText({
  tokenInfo,
  adjustedUsdgSupply,
  totalTokenWeights,
}: {
  tokenInfo: TokenInfo;
  adjustedUsdgSupply: bigint | undefined;
  totalTokenWeights: bigint | undefined;
}) {
  if (
    tokenInfo.weight === undefined ||
    tokenInfo.weight === 0n ||
    tokenInfo.usdgAmount === undefined ||
    tokenInfo.usdgAmount === 0n ||
    adjustedUsdgSupply === undefined ||
    adjustedUsdgSupply === 0n ||
    totalTokenWeights === undefined ||
    totalTokenWeights === 0n
  ) {
    return "...";
  }

  const currentWeightBps = bigMath.mulDiv(tokenInfo.usdgAmount, BASIS_POINTS_DIVISOR_BIGINT, adjustedUsdgSupply);
  const targetWeightBps =
    ((bigMath.mulDiv(tokenInfo.weight, BASIS_POINTS_DIVISOR_BIGINT, totalTokenWeights) + 1n) / 10n) * 10n;

  const weightText = `${formatAmount(currentWeightBps, 2, 2, false)}% / ${formatAmount(targetWeightBps, 2, 2, false)}%`;

  return (
    <TooltipComponent
      handle={weightText}
      position="bottom-end"
      maxAllowedWidth={300}
      content={
        <>
          <StatsTooltipRow
            label={t`Current Weight`}
            value={`${formatAmount(currentWeightBps, 2, 2, false)}%`}
            showDollar={false}
          />
          <StatsTooltipRow
            label={t`Target Weight`}
            value={`${formatAmount(targetWeightBps, 2, 2, false)}%`}
            showDollar={false}
          />
          <br />
          {currentWeightBps < targetWeightBps && (
            <div className="text-white">
              <Trans>
                {tokenInfo.symbol} is below its target weight.
                <br />
                <br />
                Get lower fees to{" "}
                <Link to="/buy_glp" target="_blank" rel="noopener noreferrer">
                  buy GLP
                </Link>{" "}
                with {tokenInfo.symbol}, and to{" "}
                <Link to="/trade" target="_blank" rel="noopener noreferrer">
                  swap
                </Link>{" "}
                {tokenInfo.symbol} for other tokens.
              </Trans>
            </div>
          )}
          {currentWeightBps > targetWeightBps && (
            <div className="text-white">
              <Trans>
                {tokenInfo.symbol} is above its target weight.
                <br />
                <br />
                Get lower fees to{" "}
                <Link to="/trade" target="_blank" rel="noopener noreferrer">
                  swap
                </Link>{" "}
                tokens for {tokenInfo.symbol}.
              </Trans>
            </div>
          )}
          <br />
          <div>
            <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/v1">
              <Trans>Read more</Trans>
            </ExternalLink>
            .
          </div>
        </>
      }
    />
  );
}
