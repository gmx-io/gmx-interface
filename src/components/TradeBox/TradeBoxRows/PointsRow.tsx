import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import {
  selectTradeboxFees,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxMarketInfo,
  selectTradeboxTradeFeesType,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatAmount, formatUsd } from "lib/numbers";
import { sendPointsPageNavigationEvent } from "lib/userAnalytics/pointsEvents";
import type { MarketInfo } from "sdk/utils/markets/types";

import { MultiplierBadge } from "components/MultiplierBadge/MultiplierBadge";

import { useTradePointsEstimate } from "./useTradePointsEstimate";

type TradePointsRowProps = ReturnType<typeof useTradePointsEstimate> & {
  marketInfo?: MarketInfo;
};

export function PointsRow() {
  const fees = useSelector(selectTradeboxFees);
  const feesType = useSelector(selectTradeboxTradeFeesType);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const marketInfo = useSelector(selectTradeboxMarketInfo);

  const pointsEstimate = useTradePointsEstimate({
    fees,
    feesType,
    marketInfo,
    isLong: tradeFlags.isLong,
    sizeDeltaUsd: increaseAmounts?.sizeDeltaUsd,
    includeBalancingBoost: feesType === "increase",
  });

  return <TradePointsRow {...pointsEstimate} marketInfo={marketInfo} />;
}

export function TradePointsRow({
  enabled,
  effectiveMultiplier,
  hasMultiplier,
  estimatedRewards,
  hasEstimatedRewards,
  downgradingCoefficient,
  marketInfo,
}: TradePointsRowProps) {
  if (!enabled) return null;

  return (
    <Link
      to="/points"
      onClick={() =>
        sendPointsPageNavigationEvent({
          source: "FeeBlock",
          marketAddress: marketInfo?.marketTokenAddress,
          marketName: marketInfo?.name,
          hasEstimatedRewards,
          rewardsUsd: estimatedRewards?.rewardsUsd,
          downgradingCoefficient,
        })
      }
      className="flex items-center justify-between gap-8 rounded-8 p-8 text-12 text-typography-secondary transition-colors"
    >
      <span className="flex min-w-0 items-center gap-8">
        <MultiplierBadge multiplier={effectiveMultiplier} />
        {hasMultiplier && hasEstimatedRewards ? (
          <span className="truncate">
            <Trans>Estimated points</Trans>
          </span>
        ) : (
          <span className="truncate">
            <Trans>
              <span className="text-typography-primary">Earn GMX Points</span> and unlock rewards{" "}
              <span className="align-text-top text-16">→</span>
            </Trans>
          </span>
        )}
      </span>

      {hasEstimatedRewards && estimatedRewards && (
        <span className="shrink-0 text-right text-typography-primary numbers">
          {estimatedRewards.rewardsGmx !== undefined ? (
            <>
              {formatAmount(estimatedRewards.rewardsGmx, 18, 2, true)} <Trans>pts</Trans>{" "}
              <span className="text-typography-secondary">
                ({formatUsd(estimatedRewards.rewardsUsd, { displayDecimals: 2 })})
              </span>
            </>
          ) : (
            formatUsd(estimatedRewards.rewardsUsd, { displayDecimals: 2 })
          )}
        </span>
      )}
    </Link>
  );
}
