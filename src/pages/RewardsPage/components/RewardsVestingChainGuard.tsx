import { Trans } from "@lingui/macro";

import { type ContractsChainId, getChainName } from "config/chains";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

import Button from "components/Button/Button";

export function RewardsVestingChainGuard({
  children,
  chainId,
  skip = false,
}: {
  children: React.ReactNode;
  chainId: ContractsChainId;
  skip?: boolean;
}) {
  const { active, chainId: walletChainId } = useWallet();

  if (!skip && active && walletChainId !== chainId) {
    return (
      <Button type="button" className="w-full" variant="primary-action" onClick={() => switchNetwork(chainId, true)}>
        <Trans>Switch to {getChainName(chainId)}</Trans>
      </Button>
    );
  }

  return children;
}
