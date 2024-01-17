import { Trans } from "@lingui/macro";
import Tooltip from "components/Tooltip/Tooltip";
import { BigNumber } from "ethers";
import { formatDeltaUsd } from "lib/numbers";
import { CSSProperties, ReactNode, useCallback, useMemo } from "react";
import { useMedia } from "react-use";
import cx from "classnames";

type Props = {
  fundingFees: BigNumber;
  priceImpactRebate: BigNumber;
  buttonText: string;
  button2Text: string;
  title: string;
  onButtonClick: () => void;
  onButton2Click: () => void;
  tooltipText?: ReactNode;
  tooltip2Text?: ReactNode;
  style?: CSSProperties;
  buttonStyle?: "primary" | "secondary";
  button2Style?: "primary" | "secondary";
};

export function ClaimableCardUI({
  buttonText,
  fundingFees,
  priceImpactRebate: priceImpactDifference,
  onButtonClick,
  title,
  tooltipText,
  tooltip2Text,
  style,
  button2Text,
  onButton2Click,
  buttonStyle = "primary",
  button2Style = "primary",
}: Props) {
  const fundingFeesUsd = useMemo(() => formatDeltaUsd(fundingFees), [fundingFees]);
  const priceImpactDifferenceUsd = useMemo(() => formatDeltaUsd(priceImpactDifference), [priceImpactDifference]);
  const renderTooltipContent = useCallback(() => tooltipText, [tooltipText]);
  const renderTooltip2Content = useCallback(() => tooltip2Text, [tooltip2Text]);
  const isHorizontal = useMedia("(min-width: 600px) and (max-width: 1100px)");

  return (
    <div className="Claims-card w-full" style={style}>
      <div className="Claims-title">{title}</div>
      <div
        className={cx("Claims-rows", {
          "Claims-rows-horizontal": isHorizontal,
        })}
      >
        <div className="Claims-row">
          <div className="Claims-col">
            <span className="muted">
              <Trans>Funding fees</Trans>
            </span>
            <span>
              <Tooltip handle={fundingFeesUsd} position="left-bottom" renderContent={renderTooltipContent} />
            </span>
          </div>
          {fundingFees.gt(0) && (
            <button className={`Claims-claim-button ${buttonStyle}`} onClick={onButtonClick}>
              {buttonText}
            </button>
          )}
        </div>
        {!isHorizontal && <div className="Claims-hr" />}
        {isHorizontal && <div className="Claims-hr-horizontal" />}
        <div className="Claims-row">
          <div className="Claims-col">
            <span className="muted">
              <Trans>Price Impact Rebates</Trans>
            </span>
            <span>
              {tooltip2Text ? (
                <Tooltip
                  handle={priceImpactDifferenceUsd}
                  position="left-bottom"
                  renderContent={renderTooltip2Content}
                />
              ) : (
                priceImpactDifferenceUsd
              )}
            </span>
          </div>
          {priceImpactDifference.gt(0) && (
            <button className={`Claims-claim-button ${button2Style}`} onClick={onButton2Click}>
              {button2Text}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
