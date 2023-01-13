import { t, Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";

export default function FeesTooltip({ totalFees, fundingFee, positionFee, swapFee, executionFee }) {
  return (
    <Tooltip
      position="right-top"
      className="PositionSeller-fees-tooltip"
      handle={<div>{totalFees ? totalFees : "-"}</div>}
      renderContent={() => (
        <div>
          {fundingFee && <StatsTooltipRow label={t`Borrow Fee`} value={fundingFee} />}
          {positionFee && <StatsTooltipRow label={t`Closing Fee`} value={positionFee} />}
          {swapFee && <StatsTooltipRow label={t`Swap Fee`} showDollar={false} value={swapFee} />}
          {executionFee && <StatsTooltipRow label={t`Execution Fee`} showDollar={false} value={executionFee} />}
          <br />
          <div className="PositionSeller-fee-item">
            <Trans>
              <ExternalLink href="https://gmxio.gitbook.io/gmx/trading#fees">More Info</ExternalLink> about fees.
            </Trans>
          </div>
        </div>
      )}
    />
  );
}
