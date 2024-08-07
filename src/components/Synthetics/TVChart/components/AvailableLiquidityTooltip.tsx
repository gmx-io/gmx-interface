import { t, Trans } from "@lingui/macro";
import { useMemo } from "react";

import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatUsd } from "lib/numbers";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { selectTradeboxMarketInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import {
  getMaxOpenInterestUsd,
  getMaxReservedUsd,
  getOpenInterestUsd,
  getReservedUsd,
} from "domain/synthetics/markets";

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
          <Trans>Reserve considers the PnL of Open Positions, while Open Interest does not.</Trans>{" "}
        </>
      )}
      <Trans>
        The Available Liquidity will be the lesser of the difference between the maximum value and the current value for
        the Reserve and Open Interest.
      </Trans>
    </div>
  );
}
