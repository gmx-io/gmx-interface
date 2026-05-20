import { Trans } from "@lingui/macro";

import { useConnectModal } from "lib/wallets/useConnectModal";

import ConnectWalletButton from "components/ConnectWalletButton/ConnectWalletButton";

import { PointsConnectedSidebarRewards } from "./PointsConnectedSidebarRewards";
import { POINTS_REWARDS_MOCK_ACCOUNT } from "./pointsRewardsMock";

type PointsSidebarRewardsProps = {
  chainId: number;
  account?: string;
  isMockMode?: boolean;
};

export function PointsSidebarRewards({ chainId, account, isMockMode = false }: PointsSidebarRewardsProps) {
  const { openConnectModal } = useConnectModal();
  const connectedAccount = account ?? (isMockMode ? POINTS_REWARDS_MOCK_ACCOUNT : undefined);

  if (connectedAccount) {
    return <PointsConnectedSidebarRewards chainId={chainId} account={connectedAccount} isMockMode={isMockMode} />;
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
