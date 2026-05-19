import { Trans } from "@lingui/macro";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";

import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useStakingProcessedData } from "domain/stake/useStakingProcessedData";
import { GMX_DECIMALS, isIncentivesEnabled } from "domain/synthetics/incentives/constants";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/useAccountIncentiveStatus";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";
import { formatMultiplier } from "domain/synthetics/incentives/utils";
import { useChainId } from "lib/chains";
import { formatAmountHuman } from "lib/numbers";
import { sendPointsPageNavigationEvent } from "lib/userAnalytics/pointsEvents";

import { MultiplierBadge } from "components/MultiplierBadge/MultiplierBadge";

import ChevronRight from "img/ic_chevron_right.svg?react";

export function PointsSection() {
  const { chainId } = useChainId();
  const { address: account } = useAccount();
  const [, setOpen] = useGmxAccountModalOpen();

  const enabled = isIncentivesEnabled(chainId);
  const { data: config } = useIncentivesConfig(chainId);
  const { data: status } = useAccountIncentiveStatus(chainId, {
    account,
    enabled,
  });
  const { data: stakingData } = useStakingProcessedData();

  const multiplier = status?.multiplier;
  const hasMultiplier = multiplier !== undefined && multiplier > 0;
  const gmxStaked = stakingData?.gmxInStakedGmx;

  const { gmxToNextTierLabel, additionalMultiplierLabel } = useMemo(() => {
    if (!config?.stakingTiers?.length || gmxStaked === undefined) {
      return { gmxToNextTierLabel: undefined, additionalMultiplierLabel: undefined };
    }

    const currentTierMultiplier =
      config.stakingTiers.find((tier) => tier.tier === status?.stakingTier)?.multiplier ?? 0;
    const nextTier = config.stakingTiers.find((tier) => gmxStaked < tier.threshold);

    if (!nextTier) {
      return { gmxToNextTierLabel: undefined, additionalMultiplierLabel: undefined };
    }

    const gmxToNextTier = nextTier.threshold - gmxStaked;
    const additionalMultiplier = nextTier.multiplier - currentTierMultiplier;

    return {
      gmxToNextTierLabel: formatAmountHuman(gmxToNextTier, GMX_DECIMALS, false, 2),
      additionalMultiplierLabel: additionalMultiplier > 0 ? formatMultiplier(additionalMultiplier) : undefined,
    };
  }, [config, gmxStaked, status?.stakingTier]);

  if (!enabled) return null;

  const handleClick = () => {
    sendPointsPageNavigationEvent({ source: "GMXAccountModal" });
    setOpen(false);
  };

  return (
    <Link
      to="/points"
      onClick={handleClick}
      className="flex items-center justify-between p-12 no-underline -outline-offset-4"
    >
      <div className="flex flex-col items-start gap-2">
        <span className="text-13 font-medium text-typography-primary">
          {hasMultiplier ? <Trans>Your multiplier</Trans> : <Trans>GMX Points</Trans>}{" "}
          <MultiplierBadge multiplier={multiplier} />
        </span>
        <span className="text-12 text-typography-secondary">
          {hasMultiplier ? (
            gmxToNextTierLabel && additionalMultiplierLabel ? (
              <Trans>
                Stake {gmxToNextTierLabel} GMX more to get {additionalMultiplierLabel} additionally
              </Trans>
            ) : (
              <Trans>You are already at the highest staking tier</Trans>
            )
          ) : (
            <Trans>Start earning points and unlock rewards</Trans>
          )}
        </span>
      </div>
      <span
        aria-hidden="true"
        className="inline-flex h-32 w-32 shrink-0 items-center justify-center rounded-8 bg-[var(--color-button-secondary)] text-typography-secondary"
      >
        <ChevronRight className="size-20 h-20 shrink-0 pl-2" />
      </span>
    </Link>
  );
}
