import { Trans, t } from "@lingui/macro";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { Position } from "domain/positions/types";
import { USD_DECIMALS } from "lib/legacy";
import { formatAmount } from "lib/numbers";

type Props = {
  position: Position;
  isMobile?: boolean;
};

export default function NetValueTooltip({ position, isMobile }: Props) {
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
            <StatsTooltipRow label={t`PnL`} value={position.deltaBeforeFeesStr} showDollar={false} />
            <StatsTooltipRow
              label={t`Borrow Fee`}
              showDollar={false}
              value={`-$${formatAmount(position.fundingFee, USD_DECIMALS, 2, true)}`}
            />
            <StatsTooltipRow
              label={t`Open Fee`}
              showDollar={false}
              value={`-$${formatAmount(position.closingFee, USD_DECIMALS, 2, true)}`}
            />
            <StatsTooltipRow
              label={t`Close Fee`}
              showDollar={false}
              value={`-$${formatAmount(position.closingFee, USD_DECIMALS, 2, true)}`}
            />
            <br />
            <StatsTooltipRow
              label={t`PnL After Fees`}
              value={[position.deltaAfterFeesStr, `(${position.deltaAfterFeesPercentageStr})`]}
              showDollar={false}
            />
          </>
        );
      }}
    />
  );
}
