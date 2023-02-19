import { t, Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";

type Row = {
  label: string;
  value: string;
};

function FeesTooltip({ totalFees, fundingFee, positionFee, swapFee, executionFee, depositFee, isOpening = true }) {
  const SWAP_FEE_LABEL = t`Swap Fee`;
  const BORROW_FEE_LABEL = t`Borrow Fee`;

  const feeRows: Row[] = [
    { label: isOpening ? SWAP_FEE_LABEL : BORROW_FEE_LABEL, value: isOpening ? swapFee : fundingFee },
    { label: isOpening ? t`Open Fee` : t`Close Fee`, value: positionFee },
    { label: isOpening ? BORROW_FEE_LABEL : SWAP_FEE_LABEL, value: isOpening ? fundingFee : swapFee },
    { label: t`Deposit Fee`, value: depositFee },
    { label: t`Execution Fee`, value: executionFee },
  ]
    .filter((row) => row.value)
    .map(({ label, value }) => ({ label, value }));

  return (
    <Tooltip
      position="right-top"
      className="PositionSeller-fees-tooltip"
      handle={<div>{totalFees ? totalFees : "-"}</div>}
      renderContent={() => (
        <div>
          {feeRows.map(({ label, value }) => (
            <StatsTooltipRow key={label} label={label} showDollar={false} value={value} />
          ))}
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

export default FeesTooltip;
