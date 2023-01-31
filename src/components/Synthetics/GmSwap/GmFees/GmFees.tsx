import { t, Trans } from "@lingui/macro";
import { InfoRow } from "components/InfoRow/InfoRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { Token } from "domain/tokens";
import cx from "classnames";
import { BigNumber } from "ethers";
import { formatDeltaUsd, formatTokenAmountWithUsd } from "lib/numbers";

type Props = {
  priceImpact?: any;
  executionFee?: BigNumber;
  executionFeeUsd?: BigNumber;
  executionFeeToken?: Token;
  totalFeeUsd?: BigNumber;
};

export function GmFees(p: Props) {
  const { priceImpact, executionFee, executionFeeUsd, totalFeeUsd, executionFeeToken } = p;

  return (
    <InfoRow
      label={<Trans>Fees and price impact</Trans>}
      value={
        <Tooltip
          handle={<span className={cx({ positive: totalFeeUsd?.gt(0) })}>{formatDeltaUsd(totalFeeUsd)}</span>}
          position="right-bottom"
          renderContent={() => (
            <div>
              <StatsTooltipRow
                label={t`Price impact`}
                value={formatDeltaUsd(priceImpact?.impactUsd, priceImpact?.basisPoints) || "..."}
                showDollar={false}
              />
              <StatsTooltipRow
                label={t`Execution fee`}
                value={
                  formatTokenAmountWithUsd(
                    executionFee,
                    executionFeeUsd,
                    executionFeeToken?.symbol,
                    executionFeeToken?.decimals
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
