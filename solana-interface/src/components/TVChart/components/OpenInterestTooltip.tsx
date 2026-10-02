import { Trans, t } from "@lingui/macro";

import { formatUsd } from "lib/numbers";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

type Props = {
  openInterestLong?: bigint;
  openInterestShort?: bigint;
};

export function OpenInterestTooltip({ openInterestLong, openInterestShort }: Props) {
  const longOIFormatted = formatUsd(openInterestLong, { displayDecimals: 0, isSolana: true }) ?? "-";
  const shortOIFormatted = formatUsd(openInterestShort, { displayDecimals: 0, isSolana: true }) ?? "-";

  return (
    <div>
      <StatsTooltipRow label={t`Long OI`} value={longOIFormatted} showDollar={false} />
      <StatsTooltipRow label={t`Short OI`} value={shortOIFormatted} showDollar={false} />
      <div className="mt-4">
        <Trans>Total open interest notional value in USD</Trans>
      </div>
    </div>
  );
}
