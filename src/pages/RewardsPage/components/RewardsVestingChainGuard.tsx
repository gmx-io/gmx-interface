import { Trans } from "@lingui/macro";

import { ARBITRUM, getChainName } from "config/chains";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

import Button from "components/Button/Button";

export function RewardsVestingChainGuard({ children }: { children: React.ReactNode }) {
  const { active, chainId: walletChainId } = useWallet();

  if (active && walletChainId !== ARBITRUM) {
    return (
      <Button type="button" className="w-full" variant="primary-action" onClick={() => switchNetwork(ARBITRUM, true)}>
        <Trans>Switch to {getChainName(ARBITRUM)}</Trans>
      </Button>
    );
  }

  return children;
}
