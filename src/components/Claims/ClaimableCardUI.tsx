import { t } from "@lingui/macro";
import cx from "classnames";
import { CSSProperties, ReactNode, useCallback, useMemo } from "react";

import { formatDeltaUsd } from "lib/numbers";

import Button from "components/Button/Button";
import Tooltip from "components/Tooltip/Tooltip";

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

  return (
    <div
      className="flex w-full flex-col justify-between gap-12 border-b-1/2 border-slate-600 bg-slate-900 px-20 py-12 last:border-r-0 lg:border-r-1/2"
      style={style}
    >
      <div className="text-[11px] font-medium uppercase text-typography-secondary">{title}</div>
      <div className={cx("grid grid-cols-2")}>
        <Section title={t`Positive Funding Fees`} {...section1} />
        <Section title={t`Price Impact Rebates`} {...section2} />
      </div>
    </div>
  );
}

function Section({ buttonText, onButtonClick, tooltipText, title, usd }: Section & { title: string }) {
  const renderTooltipContent = useCallback(() => tooltipText, [tooltipText]);
  const usdFormatted = useMemo(() => formatDeltaUsd(usd), [usd]);

  return (
    <div
      className={`flex grow items-end justify-between gap-8 border-r-1/2 border-r-slate-600 px-20
        first:pl-0 last:border-r-0 last:pr-0 max-xl:flex-col max-xl:items-start`}
    >
      <div className="flex flex-col gap-4">
        <span className={cx("font-medium", { positive: usd > 0n })}>
          {tooltipText ? (
            <Tooltip
              handle={usdFormatted}
              handleClassName="numbers"
              position="bottom-start"
              renderContent={renderTooltipContent}
            />
          ) : (
            <span className="numbers">{usdFormatted}</span>
          )}
        </span>
        <span className="text-body-small text-typography-secondary">{title}</span>
      </div>
      <div className="max-xl:w-full">
        <Button variant="secondary" disabled={usd <= 0} onClick={onButtonClick} className="max-xl:w-full">
          {buttonText}
        </Button>
      </div>
    </div>
  );
}
