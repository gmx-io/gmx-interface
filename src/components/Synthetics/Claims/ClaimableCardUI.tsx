import { t } from "@lingui/macro";
import cx from "classnames";
import Button from "components/Button/Button";
import Tooltip from "components/Tooltip/Tooltip";
import { formatDeltaUsd } from "lib/numbers";
import { CSSProperties, ReactNode, useCallback, useMemo } from "react";
import { useMedia } from "react-use";

type Section = {
  buttonText: ReactNode;
  tooltipText: ReactNode;
  onButtonClick: () => void;
  usd: bigint;
};

type Props = {
  title: string;
  style?: CSSProperties;
  sections: Readonly<[Section, Section]>;
};

export function ClaimableCardUI({ title, style, sections }: Props) {
  const [section1, section2] = sections;
  const isHorizontal = useMedia("(min-width: 600px) and (max-width: 1100px)");

  return (
    <div className="Claims-card w-full" style={style}>
      <div className="Claims-title">{title}</div>
      <div
        className={cx("Claims-rows", {
          "Claims-rows-horizontal": isHorizontal,
        })}
      >
        <Section title={t`Funding fees`} {...section1} />
        {!isHorizontal && <div className="Claims-hr" />}
        {isHorizontal && <div className="Claims-hr-horizontal" />}
        <Section title={t`Price Impact Rebates`} {...section2} />
      </div>
    </div>
  );
}

function Section({ buttonText, onButtonClick, tooltipText, title, usd }: Section & { title: string }) {
  const renderTooltipContent = useCallback(() => tooltipText, [tooltipText]);
  const usdFormatted = useMemo(() => formatDeltaUsd(usd), [usd]);

  return (
    <div className="Claims-row">
      <div className="Claims-col">
        <span className="muted">{title}</span>
        <span>
          {tooltipText ? (
            <Tooltip handle={usdFormatted} position="bottom-start" renderContent={renderTooltipContent} />
          ) : (
            usdFormatted
          )}
        </span>
      </div>
      <Button variant="secondary" disabled={usd <= 0n} onClick={onButtonClick}>
        {buttonText}
      </Button>
    </div>
  );
}
