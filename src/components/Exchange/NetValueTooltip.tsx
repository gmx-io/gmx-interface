import { Trans, t } from "@lingui/macro";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { Position } from "domain/positions/types";
import { USD_DECIMALS } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import { useMemo } from "react";

type Props = {
  position: Position;
  isMobile?: boolean;
};

export default function NetValueTooltip({ position, isMobile }: Props) {
  const pnlAfterFees = useMemo(
    () => [position.deltaAfterFeesStr, `(${position.deltaAfterFeesPercentageStr})`],
    [position.deltaAfterFeesPercentageStr, position.deltaAfterFeesStr]
  );

  return (
    <Tooltip
      handle={`$${formatAmount(position.netValue, USD_DECIMALS, 2, true)}`}
      position={isMobile ? "right-bottom" : "left-bottom"}
      handleClassName="plain"
      renderContent={() => {
        return (
          <>
            <Trans>Net Value: Initial Collateral + PnL - Borrow Fee - Close Fee</Trans>
            <br />
            <br />
            <StatsTooltipRow
              label={t`Initial Collateral`}
              value={formatAmount(position.collateral, USD_DECIMALS, 2, true)}
            />
            <StatsTooltipRow
              label={t`PnL`}
              value={position.deltaBeforeFeesStr}
              showDollar={false}
              className={position.hasProfit ? "text-green" : "text-red"}
            />
            <StatsTooltipRow
              label={t`Borrow Fee`}
              showDollar={false}
              value={`-$${formatAmount(position.fundingFee, USD_DECIMALS, 2, true)}`}
              className="text-red"
            />
            <StatsTooltipRow
              label={t`Open Fee`}
              showDollar={false}
              value={`-$${formatAmount(position.closingFee, USD_DECIMALS, 2, true)}`}
              className="text-red"
            />
            <StatsTooltipRow
              label={t`Close Fee`}
              showDollar={false}
              value={`-$${formatAmount(position.closingFee, USD_DECIMALS, 2, true)}`}
              className="text-red"
            />
            <br />
            <StatsTooltipRow
              label={t`PnL After Fees`}
              value={pnlAfterFees}
              showDollar={false}
              className={position.hasProfitAfterFees ? "text-green" : "text-red"}
            />
          </>
        );
      }}
    />
  );
}
