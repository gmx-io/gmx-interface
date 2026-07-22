import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";

import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/v2/useAccountIncentiveStatus";
import { formatMultiplier } from "domain/synthetics/incentives/v2/utils";
import { useChainId } from "lib/chains";

import ChevronRight from "img/ic_chevron_right.svg?react";

export function RewardsSection() {
  const { chainId } = useChainId();
  const { address: account } = useAccount();
  const [, setOpen] = useGmxAccountModalOpen();
  const { availability, isActive } = useIncentivesV2State();
  const { data: status, loading } = useAccountIncentiveStatus(chainId, {
    account,
    enabled: isActive && Boolean(account),
  });
  const config = availability.status === "active" ? availability.config : undefined;
  const currentStatus = status?.epochTimestamp === config?.epochTimestamp ? status : undefined;

  if (!isActive) return null;

  return (
    <Link
      to="/rewards"
      onClick={() => setOpen(false)}
      className="flex items-center justify-between p-12 no-underline -outline-offset-4"
    >
      <div className="flex flex-col items-start gap-2">
        <span className="text-13 font-medium text-typography-primary">
          <Trans>Rewards</Trans>
        </span>
        <span className="text-12 text-typography-secondary">
          {currentStatus && config ? (
            <Trans>Multiplier {formatMultiplier(currentStatus.multiplier, config.multiplierDecimals)}</Trans>
          ) : loading ? (
            "…"
          ) : (
            <Trans>View tiers and indexed rewards</Trans>
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
