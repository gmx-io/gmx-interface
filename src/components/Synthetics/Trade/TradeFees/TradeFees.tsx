import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { InfoRow } from "components/InfoRow/InfoRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { formatFee } from "domain/synthetics/fees";
import { formatTokenAmountWithUsd, formatUsd, getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { Fees } from "../utils";

type Props = {
  fees: Fees;
};

export function TradeFees(p: Props) {
  const { chainId } = useChainId();
  const { tokensData } = useAvailableTokensData(chainId);

  const { positionPriceImpact, executionFee, totalFeeUsd, swapPath } = p.fees;

  return (
    <InfoRow
      label={<Trans>Fees and price impact</Trans>}
      value={
        <Tooltip
          handle={<span className={cx({ positive: totalFeeUsd?.gt(0) })}>{formatFee(totalFeeUsd)}</span>}
          position="right-top"
          renderContent={() => (
            <div>
              {positionPriceImpact?.impact && positionPriceImpact?.basisPoints && (
                <StatsTooltipRow
                  label={t`Price impact`}
                  value={formatFee(positionPriceImpact?.impact, positionPriceImpact?.basisPoints)!}
                  showDollar={false}
                />
              )}

              {swapPath?.map((item) => (
                <StatsTooltipRow
                  key={`${item.market}-${item.to}`}
                  label={t`Swap to ${getTokenData(tokensData, item.to)?.symbol}`}
                  value={formatUsd(item.feeUsd)!}
                  showDollar={false}
                />
              ))}

              <StatsTooltipRow
                label={t`Execution fee`}
                value={
                  formatTokenAmountWithUsd(
                    executionFee?.feeTokenAmount,
                    executionFee?.feeUsd,
                    executionFee?.feeToken?.symbol,
                    executionFee?.feeToken?.decimals
                  ) || "..."
                }
                showDollar={false}
              />
            </div>
          )}
        />
      }
    />
  );
}
