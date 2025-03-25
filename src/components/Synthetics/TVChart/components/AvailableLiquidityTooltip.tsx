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
        label={t`${longShortText} ${indexToken?.symbol} Reserve`}
        value={`${formatUsd(reservedUsd, { displayDecimals: 0 })} / ${formatUsd(maxReservedUsd, {
          displayDecimals: 0,
        })}`}
        showDollar={false}
      />
      <StatsTooltipRow
        label={t`${longShortText} ${indexToken?.symbol} Open Interest`}
        value={`${formatUsd(currentOpenInterest, { displayDecimals: 0 })} / ${formatUsd(maxOpenInterest, {
          displayDecimals: 0,
        })}`}
        showDollar={false}
      />

      <br />
      {isLong && (
        <>
          <Trans>The long reserve accounts for the PnL of open positions, while the open interest does not.</Trans>{" "}
        </>
      )}
      <Trans>
        The available liquidity will be the lesser of the difference between the maximum value and the current value for
        both the reserve and open interest.
      </Trans>
    </div>
  );
}
