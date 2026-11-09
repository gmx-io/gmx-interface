import { Trans } from "@lingui/macro";

import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";

import Button from "components/Button/Button";
import ConnectWalletButton from "components/ConnectWalletButton/ConnectWalletButton";
import ConnectWalletPlaceholder from "components/ConnectWalletButton/ConnectWalletPlaceholder";

import { GtMetric } from "../GtMetric";
import { formatGt } from "../gtPointsFormat";
import type { GtPointsStakeData } from "../gtPointsTypes";
import { formatUsdValue } from "./StakeTokenLabel";

type Props = {
  stake: GtPointsStakeData | undefined;
  isConnected: boolean;
  isLoading: boolean;
  onStake: () => void;
};

export function StakeSummaryCard({ stake, isConnected, isLoading, onStake }: Props) {
  const { openConnectModal } = useConnectModal();
  const empty = isConnected && !isLoading ? "N/A" : "–";

  return (
    <div className="flex flex-wrap items-center justify-between gap-20 rounded-8 bg-slate-900 p-20">
      <div className="flex flex-wrap gap-x-48 gap-y-16">
        <GtMetric
          label={<Trans>Total staked value</Trans>}
          tooltip={<Trans>Current value of all your staked GLV and GM.</Trans>}
          isLoading={isLoading && isConnected}
          value={stake ? formatUsdValue(stake.totalStakedUsd) : empty}
        />
        <GtMetric
          label={<Trans>Unclaimed GT from staking</Trans>}
          isLoading={isLoading && isConnected}
          value={stake ? formatGt(stake.unclaimedGt) : empty}
        />
      </div>

      {isConnected ? (
        <Button variant="primary" className="min-w-[160px]" disabled={!stake} onClick={onStake}>
          <Trans>Stake</Trans>
        </Button>
      ) : isLoading ? (
        <ConnectWalletPlaceholder />
      ) : openConnectModal ? (
        <ConnectWalletButton onClick={openConnectModal}>
          <Trans>Connect wallet</Trans>
        </ConnectWalletButton>
      ) : null}
    </div>
  );
}
