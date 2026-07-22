import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";

import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/v2/useAccountIncentiveStatus";
import type { TradeFeesType } from "domain/synthetics/trade";
import { useChainId } from "lib/chains";

import { MultiplierBadge } from "components/MultiplierBadge/MultiplierBadge";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";

export function RewardsHintRow({ feesType }: { feesType: TradeFeesType | null }) {
  const { chainId } = useChainId();
  const { address: account } = useAccount();
  const { availability, isActive } = useIncentivesV2State();
  const isEligibleTrade = feesType === "increase" || feesType === "decrease";
  const { data: status } = useAccountIncentiveStatus(chainId, {
    account,
    enabled: isActive && isEligibleTrade && Boolean(account),
  });
  const config = availability.status === "active" ? availability.config : undefined;
  const currentStatus = status?.epochTimestamp === config?.epochTimestamp ? status : undefined;

  if (!isActive || !isEligibleTrade) {
    return null;
  }

  const hasMultiplier = currentStatus !== undefined && currentStatus.multiplier > 0n;
  const hasKnownMultiplier = currentStatus !== undefined;

  return (
    <Link
      to="/rewards"
      className="flex items-center justify-between gap-8 rounded-8 p-8 text-12 text-typography-secondary transition-colors"
    >
      <span className="flex min-w-0 items-center gap-8">
        {config ? (
          <MultiplierBadge multiplier={currentStatus?.multiplier} multiplierDecimals={config.multiplierDecimals} />
        ) : null}
        <span className="flex min-w-0 items-center gap-4">
          <span className="truncate">
            {hasMultiplier ? (
              <Trans>
                <span className="text-typography-primary">Current multiplier</span> · Earn rewards on eligible trades
              </Trans>
            ) : hasKnownMultiplier ? (
              <Trans>
                <span className="text-typography-primary">Trade or stake</span> to unlock your rewards multiplier
              </Trans>
            ) : (
              <span className="text-typography-primary">
                <Trans>View tiers and indexed rewards</Trans>
              </span>
            )}
          </span>
          <ArrowRightIcon aria-hidden="true" className="size-16 shrink-0" />
        </span>
      </span>
    </Link>
  );
}
