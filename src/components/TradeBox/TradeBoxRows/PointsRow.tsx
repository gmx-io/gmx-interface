import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import { isIncentivesEnabled, formatMultiplier } from "domain/synthetics/incentives/constants";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/useAccountIncentiveStatus";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

import MultiplierIcon from "img/ic_multiplier.svg?react";

export function PointsRow() {
  const { chainId } = useChainId();
  const { account } = useWallet();

  const enabled = isIncentivesEnabled(chainId);
  const { data: status } = useAccountIncentiveStatus(chainId, {
    account,
    enabled: enabled && Boolean(account),
  });

  if (!enabled) return null;

  const multiplier = status?.multiplier;
  const hasMultiplier = multiplier !== undefined && multiplier > 0;

  return (
    <Link
      to="/points"
      className="text-body-small flex items-center gap-8 rounded-8 px-12 py-8 text-typography-secondary transition-colors hover:text-typography-primary"
    >
      <span className="text-caption flex items-center gap-4 rounded-4 bg-green-500/15 px-6 py-2 font-semibold text-green-500">
        <MultiplierIcon className="size-12" /> {hasMultiplier ? formatMultiplier(multiplier) : "0.0x"}
      </span>
      {hasMultiplier ? (
        <span>
          <Trans>Estimated rewards</Trans>
          <span className="ml-4 text-typography-primary">→</span>
        </span>
      ) : (
        <span>
          <Trans>Earn GMX Points and unlock rewards</Trans>
          <span className="ml-4">→</span>
        </span>
      )}
    </Link>
  );
}
