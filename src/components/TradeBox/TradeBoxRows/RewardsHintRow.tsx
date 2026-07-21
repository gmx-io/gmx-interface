import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import type { TradeFeesType } from "domain/synthetics/trade";

export function RewardsHintRow({ feesType }: { feesType: TradeFeesType | null }) {
  const { isActive } = useIncentivesV2State();

  if (!isActive || (feesType !== "increase" && feesType !== "decrease")) {
    return null;
  }

  return (
    <Link
      to="/rewards"
      className="flex items-center justify-between gap-8 rounded-8 p-8 text-12 text-typography-secondary transition-colors"
    >
      <span className="text-typography-primary">
        <Trans>Earn esGMX and GT rewards from eligible trading activity</Trans>
      </span>
      <span aria-hidden="true" className="align-text-top text-16">
        →
      </span>
    </Link>
  );
}
