import { Trans, t } from "@lingui/macro";
import { useState } from "react";
import useSWR from "swr";

import type { ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { POINTS_REWARDS_DISTRIBUTION_ID } from "domain/synthetics/claims/constants";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/useAccountIncentiveStatus";
import { useAccountTotalEarnedRewards } from "domain/synthetics/incentives/useAccountTotalEarnedRewards";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";
import { contractFetcher } from "lib/contracts/contractFetcher";
import { formatAmount } from "lib/numbers";
import { getTokenBySymbol } from "sdk/configs/tokens";

import Button from "components/Button/Button";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import EarnIcon from "img/ic_earn.svg?react";

import { formatTimeLeft, getCurrentEpochEndTime, useCurrentUnixTimestamp } from "./epochTiming";
import { PointsClaimRewardsModal } from "./PointsClaimRewardsModal";

type PointsConnectedSidebarRewardsProps = {
  chainId: number;
  account: string;
};

export function PointsConnectedSidebarRewards({ chainId, account }: PointsConnectedSidebarRewardsProps) {
  const { data: config } = useIncentivesConfig(chainId);
  const { data: status } = useAccountIncentiveStatus(chainId, { account });
  const { data: totalEarnedRewards } = useAccountTotalEarnedRewards(chainId, { account });
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  const contractsChainId = chainId as ContractsChainId;
  const claimHandlerAddress = getContract(contractsChainId, "ClaimHandler");
  const gmxTokenAddress = getTokenBySymbol(contractsChainId, "GMX").address;

  const { data: rawClaimableAmount, mutate: mutateClaimableAmount } = useSWR(
    [
      `PointsRewardsClaimableAmount:${chainId}:${account}`,
      chainId,
      claimHandlerAddress,
      "getClaimableAmount",
      account,
      gmxTokenAddress,
      [POINTS_REWARDS_DISTRIBUTION_ID],
    ],
    { fetcher: contractFetcher(undefined, "ClaimHandler") }
  );

  const claimableAmount = rawClaimableAmount !== undefined ? BigInt(rawClaimableAmount) : 0n;
  const displayClaimableRewards = formatAmount(claimableAmount, 18, 2, true);
  const hasRewards = claimableAmount > 0n;

  const displayTotalEarnedRewards = totalEarnedRewards ? formatAmount(totalEarnedRewards, 18, 2, true) : "0.00";

  const now = useCurrentUnixTimestamp();
  const epochEndTime = getCurrentEpochEndTime(config, now);
  const timeLeft = epochEndTime > now ? formatTimeLeft(epochEndTime - now) : "";

  const pointsBalance = status?.pointsBalance;
  const displayPoints = pointsBalance ? formatAmount(pointsBalance, 18, 2, true) : "0.00";

  return (
    <>
      <div className="rounded-8 bg-slate-900 p-20">
        <div className="flex flex-col gap-12">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-8">
              <span className="text-24 font-medium text-typography-primary">{displayClaimableRewards} GMX</span>
            </div>
            <div className="flex items-center gap-2 text-12 font-medium leading-1 text-typography-secondary">
              <TooltipWithPortal
                handle={<Trans>Claimable rewards</Trans>}
                content={t`GMX rewards available to claim or stake. Rewards are generated when your points are spent to discount trading fees.`}
                variant="iconStroke"
              />
            </div>
          </div>

          <Button
            variant="primary"
            className="shrink-0 max-lg:w-full"
            disabled={!hasRewards}
            onClick={() => setIsClaimModalOpen(true)}
            size="medium"
          >
            <EarnIcon className="size-16" />
            <Trans>Claim rewards</Trans>
          </Button>
        </div>

        <div className="mt-16 flex flex-col border-t-1/2 border-slate-600 pt-16">
          <div className="flex h-24 items-center justify-between text-13 font-medium text-typography-secondary">
            <Trans>Epoch ends in</Trans>
            <span className="text-typography-primary">{timeLeft || "—"}</span>
          </div>
          <div className="flex h-24 items-center justify-between text-13 font-medium text-typography-secondary">
            <TooltipWithPortal
              handle={<Trans>Points balance</Trans>}
              content={t`Total non-expired points available. Points automatically discount up to 50% of your trading fees.`}
              variant="iconStroke"
            />

            <span className="text-typography-primary">{displayPoints}</span>
          </div>
          <div className="flex h-24 items-center justify-between text-13  font-medium text-typography-secondary">
            <TooltipWithPortal
              handle={<Trans>Total earned rewards</Trans>}
              content={t`Total rewards earned since the start of the program.`}
              variant="iconStroke"
            />

            <span className="text-typography-primary">{displayTotalEarnedRewards} GMX</span>
          </div>
        </div>
      </div>

      <PointsClaimRewardsModal
        isOpen={isClaimModalOpen}
        setIsOpen={setIsClaimModalOpen}
        displayRewards={displayClaimableRewards}
        chainId={chainId}
        account={account}
        claimableAmount={claimableAmount}
        mutateClaimableAmount={mutateClaimableAmount}
      />
    </>
  );
}
