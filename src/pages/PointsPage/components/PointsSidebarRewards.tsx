import { Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import ConnectWalletButton from "components/ConnectWalletButton/ConnectWalletButton";

import { PointsConnectedSidebarRewards } from "./PointsConnectedSidebarRewards";

type PointsSidebarRewardsProps = {
  chainId: number;
  account?: string;
};

export function PointsSidebarRewards({ chainId, account }: PointsSidebarRewardsProps) {
  const { openConnectModal } = useConnectModal();

  if (account) {
    return <PointsConnectedSidebarRewards chainId={chainId} account={account} />;
  }

  return (
    <div className="flex flex-col gap-12 rounded-8 bg-slate-900 p-20">
      <div className="flex flex-col gap-4">
        <span className="text-16 font-medium text-typography-primary">
          <Trans>Claim your GMX rewards</Trans>
        </span>
        <span className="text-12 text-typography-secondary">
          <Trans>Connect your wallet to view your points balance and claim earned rewards.</Trans>
        </span>
      </div>
      <ConnectWalletButton onClick={openConnectModal}>
        <Trans>Connect wallet</Trans>
      </ConnectWalletButton>
    </div>
  );
}
