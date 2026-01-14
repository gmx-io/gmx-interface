import { t, Trans } from "@lingui/macro";
import { useMemo } from "react";

import { selectTradeboxMarketInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  getMaxOpenInterestUsd,
  getMaxReservedUsd,
  getOpenInterestUsd,
  getReservedUsd,
} from "domain/synthetics/markets";
import { formatUsd } from "lib/numbers";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

export function AvailableLiquidityTooltip({ isLong }) {
  const longShortText = isLong ? t`Long` : t`Short`;
  const marketInfo = useSelector(selectTradeboxMarketInfo);

  const indexToken = marketInfo?.indexToken;

  const { reservedUsd, maxReservedUsd, currentOpenInterest, maxOpenInterest } = useMemo(() => {
    if (!marketInfo) {
      return {};
    }

    return {
      reservedUsd: getReservedUsd(marketInfo, isLong),
      maxReservedUsd: getMaxReservedUsd(marketInfo, isLong),
      currentOpenInterest: getOpenInterestUsd(marketInfo, isLong),
      maxOpenInterest: getMaxOpenInterestUsd(marketInfo, isLong),
    };
  }, [marketInfo, isLong]);

  return (
    <div>
      <StatsTooltipRow
        label={t`${longShortText} ${indexToken?.symbol} reserve`}
        value={`${formatUsd(reservedUsd, { displayDecimals: 0 })} / ${formatUsd(maxReservedUsd, {
          displayDecimals: 0,
        })}`}
        showDollar={false}
      />
      <StatsTooltipRow
        label={t`${longShortText} ${indexToken?.symbol} open interest`}
        value={`${formatUsd(currentOpenInterest, { displayDecimals: 0 })} / ${formatUsd(maxOpenInterest, {
          displayDecimals: 0,
        })}`}
        showDollar={false}
      />

      <br />
      {isLong && (
        <>
          <Trans>Long reserve includes position PnL. Open interest does not.</Trans> <br />
          <br />
        </>
      )}
      <Trans>Available liquidity is the smaller of (max - current) for reserve and open interest.</Trans>
    </div>
  );
}
