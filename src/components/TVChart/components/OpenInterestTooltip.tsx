import { Trans, t } from "@lingui/macro";
import { ReactNode, useMemo } from "react";

import { selectChartHeaderInfo } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatAmount } from "lib/numbers";

import { UsdValue } from "components/NumericValue/UsdValue";
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

    return {
      longOIFormatted: (
        <>
          {longTokens} {indexTokenSymbol}{" "}
          <span className="whitespace-nowrap text-typography-secondary">
            (<UsdValue usd={openInterestLong} displayDecimals={0} />)
          </span>
        </>
      ),
      shortOIFormatted: (
        <>
          {shortTokens} {indexTokenSymbol}{" "}
          <span className="whitespace-nowrap text-typography-secondary">
            (<UsdValue usd={openInterestShort} displayDecimals={0} />)
          </span>
        </>
      ),
    };
  }, [info]);

  return (
    <div>
      <StatsTooltipRow label={t`Long OI`} value={longOIFormatted} showDollar={false} />
      <StatsTooltipRow label={t`Short OI`} value={shortOIFormatted} showDollar={false} />
      <div className="mt-4">
        <Trans>Total open interest in tokens and notional value in USD</Trans>
      </div>
    </div>
  );
}
