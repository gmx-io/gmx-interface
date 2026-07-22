import { Trans } from "@lingui/macro";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";

import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import { ES_GMX_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/v2/useAccountIncentiveStatus";
import { formatMultiplierAdjustment } from "domain/synthetics/incentives/v2/utils";
import { useChainId } from "lib/chains";
import { formatTokenAmount } from "lib/numbers";

import { MultiplierBadge } from "components/MultiplierBadge/MultiplierBadge";

import ChevronRight from "img/ic_chevron_right.svg?react";
import rewardsAccountCoin from "img/rewards_account_coin.png";

export function RewardsSection() {
  const { chainId } = useChainId();
  const { address: account } = useAccount();
  const [, setOpen] = useGmxAccountModalOpen();
  const { availability, isActive } = useIncentivesV2State();
  const { data: status } = useAccountIncentiveStatus(chainId, {
    account,
    enabled: isActive && Boolean(account),
  });
  const config = availability.status === "active" ? availability.config : undefined;
  const currentStatus = status?.epochTimestamp === config?.epochTimestamp ? status : undefined;
  const hasMultiplier = currentStatus !== undefined && currentStatus.multiplier > 0n;

  const stakingProgress = useMemo(() => {
    if (!config || !currentStatus) return undefined;

    const currentTierId = currentStatus.projectedStakingTier;
    const currentTierMultiplier = config.stakingTiers.find((tier) => tier.tier === currentTierId)?.multiplier ?? 0n;
    const nextTier = config.stakingTiers.find((tier) => tier.threshold > currentStatus.currentStakedBalance);

    if (!nextTier) return { isHighestTier: config.stakingTiers.length > 0 };

    const additionalMultiplier = nextTier.multiplier - currentTierMultiplier;
    if (additionalMultiplier <= 0n) return undefined;

    return {
      isHighestTier: false,
      amountLabel: formatTokenAmount(
        nextTier.threshold - currentStatus.currentStakedBalance,
        ES_GMX_DECIMALS,
        undefined,
        { displayDecimals: 2, minThreshold: "0.01", useCommas: true }
      ),
      multiplierLabel: formatMultiplierAdjustment(additionalMultiplier, config.multiplierDecimals),
    };
  }, [config, currentStatus]);

  if (!isActive) return null;

  return (
    <Link
      to="/rewards"
      onClick={() => setOpen(false)}
      className="flex items-center gap-6 overflow-hidden rounded-b-12 rounded-t-8 bg-fill-surfaceElevated50 p-12 no-underline -outline-offset-4"
    >
      <span aria-hidden="true" className="flex size-36 shrink-0 items-center justify-center overflow-hidden">
        <img alt="" src={rewardsAccountCoin} className="size-52 max-w-none shrink-0 object-contain" />
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-8 pl-4">
        <div className="flex min-w-0 flex-col items-start gap-2">
          {hasMultiplier && config && currentStatus ? (
            <span className="flex items-center gap-6 text-13 font-medium text-typography-primary">
              <Trans>Your multiplier</Trans>
              <MultiplierBadge multiplier={currentStatus.multiplier} multiplierDecimals={config.multiplierDecimals} />
            </span>
          ) : (
            <span className="text-13 font-medium text-typography-primary">
              <Trans>Rewards</Trans>
            </span>
          )}
          <span className="text-12 text-typography-secondary">
            {hasMultiplier && stakingProgress?.amountLabel && stakingProgress.multiplierLabel ? (
              <Trans>
                Stake {stakingProgress.amountLabel} GMX or esGMX more to get {stakingProgress.multiplierLabel} next
                epoch
              </Trans>
            ) : hasMultiplier && stakingProgress?.isHighestTier ? (
              <Trans>You are already at the highest staking tier</Trans>
            ) : hasMultiplier ? (
              <Trans>View tiers and indexed rewards</Trans>
            ) : currentStatus ? (
              <Trans>Trade or stake to unlock your rewards multiplier</Trans>
            ) : (
              <Trans>View tiers and indexed rewards</Trans>
            )}
          </span>
        </div>
        <span
          aria-hidden="true"
          className="inline-flex size-32 shrink-0 items-center justify-center rounded-8 bg-[var(--color-button-secondary)] text-typography-secondary"
        >
          <ChevronRight className="size-16 shrink-0" />
        </span>
      </div>
    </Link>
  );
}
