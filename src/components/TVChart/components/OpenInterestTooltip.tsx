import { Trans, t } from "@lingui/macro";
import { ReactNode, useMemo } from "react";

import { selectChartHeaderInfo } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatAmount, formatUsd } from "lib/numbers";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

export function OpenInterestTooltip() {
  const info = useSelector(selectChartHeaderInfo);

  const { longOIFormatted, shortOIFormatted } = useMemo<{
    longOIFormatted: ReactNode;
    shortOIFormatted: ReactNode;
  }>(() => {
    if (!info) {
      return { longOIFormatted: "-", shortOIFormatted: "-" };
    }

    const {
      openInterestLongInTokens,
      openInterestShortInTokens,
      openInterestLong,
      openInterestShort,
      decimals,
      indexTokenSymbol,
    } = info;

    const longTokens = formatAmount(openInterestLongInTokens, decimals, 2, true);
    const shortTokens = formatAmount(openInterestShortInTokens, decimals, 2, true);
    const longUsd = formatUsd(openInterestLong, { displayDecimals: 0 });
    const shortUsd = formatUsd(openInterestShort, { displayDecimals: 0 });

    return {
      longOIFormatted: (
        <>
          {longTokens} {indexTokenSymbol} <span className="text-typography-secondary">({longUsd})</span>
        </>
      ),
      shortOIFormatted: (
        <>
          {shortTokens} {indexTokenSymbol} <span className="text-typography-secondary">({shortUsd})</span>
        </>
      ),
    };
  }, [info]);

  return (
    <div>
      <StatsTooltipRow label={t`Long OI`} value={longOIFormatted} showDollar={false} />
      <StatsTooltipRow label={t`Short OI`} value={shortOIFormatted} showDollar={false} />
      <div className="mt-4">
        <Trans>Shows the total open interest in tokens and its notional value in USD.</Trans>
      </div>
    </div>
  );
}
