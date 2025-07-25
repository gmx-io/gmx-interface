import { t } from "@lingui/macro";
import cx from "classnames";
import { CSSProperties, ReactNode, useCallback, useMemo } from "react";
import { useMedia } from "react-use";

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
  const isHorizontal = useMedia("(min-width: 600px)");

  return (
    <div
      className="flex w-full flex-col gap-12 border-b-[1.5px] border-slate-600 bg-slate-900 px-20 py-12 last:border-r-0 lg:border-r-[1.5px]"
      style={style}
    >
      <div className="text-[11px] font-medium uppercase text-slate-100">{title}</div>
      <div
        className={cx("grid grid-cols-2", {
          "grid-cols-1": !isHorizontal,
        })}
      >
        <Section title={t`Funding fees`} {...section1} />
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
      className={`flex grow items-end justify-between gap-8 border-r border-r-slate-600 px-20
        first:pl-0 last:border-r-0 last:pr-0 max-xl:flex-col max-xl:items-start`}
    >
      <div className="flex flex-col gap-4">
        <span className="font-medium">
          {tooltipText ? (
            <Tooltip handle={usdFormatted} position="bottom-start" renderContent={renderTooltipContent} />
          ) : (
            usdFormatted
          )}
        </span>
        <span className="text-body-small text-slate-100">{title}</span>
      </div>
      <div className="max-xl:w-full">
        <Button variant="secondary" disabled={usd <= 0} onClick={onButtonClick} className="max-xl:w-full">
          {buttonText}
        </Button>
      </div>
    </div>
  );
}
