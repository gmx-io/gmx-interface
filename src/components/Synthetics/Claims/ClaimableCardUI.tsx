import { Trans } from "@lingui/macro";
import Tooltip from "components/Tooltip/Tooltip";
import { BigNumber } from "ethers";
import { formatUsd } from "lib/numbers";
import { useCallback, useMemo } from "react";

type Props = {
  fundingFees: BigNumber;
  buttonText: string;
  title: string;
  onButtonClick: () => void;
  canShowButton: boolean;
  tooltipText: string;
};

export function ClaimableCardUI({ buttonText, fundingFees, onButtonClick, title, canShowButton, tooltipText }: Props) {
  const totalUsd = useMemo(() => formatUsd(fundingFees), [fundingFees]);

  const renderTooltipContent = useCallback(() => tooltipText, [tooltipText]);

  return (
    <div className="TradeHistoryRow App-box">
      <div className="Claims-row">
        <div className="Claims-col Claims-col-title">{title}</div>
        <div className="Claims-col">
          <span className="muted">
            <Trans>Funding fees</Trans>
          </span>
          <span>
            <Tooltip handle={totalUsd} position="left-bottom" renderContent={renderTooltipContent} />
          </span>
        </div>
        {canShowButton && fundingFees.gt(0) && (
          <button className="App-button-option App-card-option Claims-claim-button" onClick={onButtonClick}>
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
}
