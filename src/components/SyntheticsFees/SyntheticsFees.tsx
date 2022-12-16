import { t, Trans } from "@lingui/macro";
import { InfoRow } from "components/InfoRow/InfoRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { formatFee, PriceImpact } from "domain/synthetics/fees";
import { formatTokenAmountWithUsd } from "domain/synthetics/tokens";
import { Token } from "domain/tokens";
import cx from "classnames";
import { BigNumber } from "ethers";

type Props = {
  priceImpact?: PriceImpact;
  executionFee?: BigNumber;
  executionFeeUsd?: BigNumber;
  totalFeeUsd?: BigNumber;
  nativeToken?: Token;
};

export function SyntheticsFees(p: Props) {
  const { priceImpact, executionFee, executionFeeUsd, nativeToken, totalFeeUsd } = p;

  return (
    <InfoRow
      label={<Trans>Fees and price impact</Trans>}
      value={
        <Tooltip
          handle={<span className={cx({ positive: totalFeeUsd?.gt(0) })}>{formatFee(totalFeeUsd)}</span>}
          position="right-bottom"
          renderContent={() => (
            <div>
              <StatsTooltipRow
                label={t`Price impact`}
                value={formatFee(priceImpact?.impact, priceImpact?.basisPoints)}
                showDollar={false}
              />
              <StatsTooltipRow
                label={t`Execution fee`}
                value={formatTokenAmountWithUsd(
                  executionFee,
                  executionFeeUsd,
                  nativeToken?.symbol,
                  nativeToken?.decimals
                )}
                showDollar={false}
              />
            </div>
          )}
        />
      }
    />
  );
}
