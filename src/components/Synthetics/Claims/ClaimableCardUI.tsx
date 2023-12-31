import { Trans } from "@lingui/macro";
import Tooltip from "components/Tooltip/Tooltip";
import { BigNumber } from "ethers";
import { formatDeltaUsd } from "lib/numbers";
import { CSSProperties, useCallback, useMemo } from "react";

type Props = {
  fundingFees: BigNumber;
  buttonText: string;
  title: string;
  onButtonClick: () => void;
  tooltipText: string;
  style?: CSSProperties;
};

export function ClaimableCardUI({ buttonText, fundingFees, onButtonClick, title, tooltipText, style }: Props) {
  const totalUsd = useMemo(() => formatDeltaUsd(fundingFees), [fundingFees]);
  const renderTooltipContent = useCallback(() => tooltipText, [tooltipText]);

  return (
    <div className="TradeHistoryRow App-box w-full" style={style}>
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
        {fundingFees.gt(0) && (
          <button className="App-button-option App-card-option Claims-claim-button" onClick={onButtonClick}>
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
}
