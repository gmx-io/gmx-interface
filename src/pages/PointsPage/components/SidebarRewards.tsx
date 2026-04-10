import { Trans, t } from "@lingui/macro";
import { useState } from "react";

import { getEpochDuration } from "domain/synthetics/incentives/constants";
import { useAccountIncentiveDashboard } from "domain/synthetics/incentives/useAccountIncentiveDashboard";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";
import { formatAmount } from "lib/numbers";

import Button from "components/Button/Button";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import EarnIcon from "img/ic_earn.svg?react";

type Props = {
  chainId: number;
  account?: string;
};

export function SidebarRewards({ chainId, account }: Props) {
  const { data: config } = useIncentivesConfig(chainId);
  const { data: dashboard } = useAccountIncentiveDashboard(chainId, { account });
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  const rewardsBalance = dashboard?.rewardsBalance;
  const displayRewards = rewardsBalance ? formatAmount(rewardsBalance, 18, 4, true) : "0.0000";
  const hasRewards = rewardsBalance !== undefined && rewardsBalance > 0n;

  // Epoch timing is global (from config), not per-user
  const epochDuration = getEpochDuration(config);
  const epochEndTime = config ? config.epochTimestamp + epochDuration : 0;
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = epochEndTime > now ? formatTimeLeft(epochEndTime - now) : "";

  const pointsBalance = dashboard?.pointsBalance;
  const displayPoints = pointsBalance ? formatAmount(pointsBalance, 18, 4, true) : "0.0000";

  return (
    <>
      <div className="rounded-8 bg-slate-900 p-20">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-8">
            <span className="text-24 font-medium text-typography-primary">{displayRewards} GMX</span>
          </div>
          <div className="text-body-small flex items-center gap-2 font-medium leading-1 text-typography-secondary">
            <Trans>Claimable rewards</Trans>
            <TooltipWithPortal
              handle={undefined}
              content={t`GMX rewards available to claim or stake. Rewards are generated when your points are spent to discount trading fees.`}
              variant="iconStroke"
            />
          </div>
        </div>

        <div className="py-16">
          <Button
            variant="primary"
            className="w-full"
            disabled={!hasRewards}
            onClick={() => setIsClaimModalOpen(true)}
            size="medium"
          >
            <EarnIcon className="size-16" />
            <Trans>Claim rewards</Trans>
          </Button>
        </div>

        <div className="flex flex-col gap-2 border-t-1/2 border-slate-600 pt-16">
          <div className="flex items-center justify-between py-4 text-[1.3rem]">
            <span className="font-medium text-typography-secondary">
              <Trans>Epoch ends in</Trans>
            </span>
            <span className="text-typography-primary">{timeLeft || "—"}</span>
          </div>
          <div className="flex items-center justify-between py-4 text-[1.3rem]">
            <span className="flex items-center gap-4 font-medium text-typography-secondary">
              <Trans>Points balance</Trans>
              <TooltipWithPortal
                handle={undefined}
                content={t`Total non-expired points available. Points automatically discount up to 50% of your trading fees.`}
              />
            </span>
            <span className="text-typography-primary">{displayPoints}</span>
          </div>
          <div className="flex items-center justify-between py-4 text-[1.3rem]">
            <span className="flex items-center gap-4 font-medium text-typography-secondary">
              <Trans>Total earn rewards</Trans>
              <TooltipWithPortal handle={undefined} content={t`Total rewards earned since the start of the program.`} />
            </span>
            <span className="text-typography-primary">{displayRewards} GMX</span>
          </div>
        </div>
      </div>

      <ClaimModal isOpen={isClaimModalOpen} setIsOpen={setIsClaimModalOpen} displayRewards={displayRewards} />
    </>
  );
}

function ClaimModal({
  isOpen,
  setIsOpen,
  displayRewards,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  displayRewards: string;
}) {
  return (
    <ModalWithPortal isVisible={isOpen} setIsVisible={setIsOpen} label={t`Claim rewards`}>
      <div className="flex flex-col gap-16 p-16">
        <div>
          <span className="text-body-small text-typography-secondary">
            <Trans>Available to Claim</Trans>
          </span>
          <div className="text-h2 mt-4 font-medium text-typography-primary">{displayRewards} GMX</div>
          <p className="text-body-small mt-8 text-typography-secondary">
            <Trans>
              Claim your rewards now. You can also stake them instantly to get 5% yield on it and earn even more points.
            </Trans>
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <Button variant="primary-action" className="w-full" to="/earn">
            <Trans>Stake and earn more rewards</Trans>
          </Button>
          <button
            className="text-body-medium w-full py-8 text-center text-typography-secondary hover:text-typography-primary"
            onClick={() => setIsOpen(false)}
          >
            <Trans>Claim only</Trans>
          </button>
        </div>
      </div>
    </ModalWithPortal>
  );
}

function formatTimeLeft(seconds: number): string {
  if (seconds <= 0) return "";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
