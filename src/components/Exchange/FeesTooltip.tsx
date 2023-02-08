import { t, Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";

type Row = {
  label: string;
  value: string;
};

function FeesTooltip({ totalFees, fundingFee, positionFee, swapFee, executionFee, depositFee, isOpening = true }) {
  const feeRows: Row[] = [];
  if (!isOpening && fundingFee) {
    feeRows.push({
      label: t`Borrow Fee`,
      value: fundingFee,
    });
  }
  if (isOpening && swapFee) {
    feeRows.push({
      label: t`Swap Fee`,
      value: swapFee,
    });
  }
  if (positionFee) {
    feeRows.push({
      label: isOpening ? t`Open Fee` : t`Close Fee`,
      value: positionFee,
    });
  }
  if (isOpening && fundingFee) {
    feeRows.push({
      label: t`Borrow Fee`,
      value: fundingFee,
    });
  }
  if (!isOpening && swapFee) {
    feeRows.push({
      label: t`Swap Fee`,
      value: swapFee,
    });
  }
  if (depositFee) {
    feeRows.push({
      label: t`Deposit Fee`,
      value: depositFee,
    });
  }
  if (executionFee) {
    feeRows.push({
      label: t`Execution Fee`,
      value: executionFee,
    });
  }

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
