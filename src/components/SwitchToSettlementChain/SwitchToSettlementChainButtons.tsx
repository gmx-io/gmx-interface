import { Trans } from "@lingui/macro";
import { useAccount } from "wagmi";

import { getChainName, SettlementChainId } from "config/chains";
import { MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING } from "config/multichain";
import { switchNetwork } from "lib/wallets";

import Button from "components/Button/Button";

import { needSwitchToSettlementChain } from "./utils";

export function SwitchToSettlementChainButtons({
  children,
  settlementChainId,
}: {
  children: React.ReactNode;
  settlementChainId?: SettlementChainId;
}) {
  const { chainId: walletChainId, isConnected } = useAccount();

  if (!needSwitchToSettlementChain(walletChainId)) {
    return children;
  }

  const chainsToShow = settlementChainId
    ? [settlementChainId]
    : MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING[walletChainId];

  return (
    <div className="flex flex-col gap-8">
      {chainsToShow.map((chainId) => (
        <Button
          key={chainId}
          type="button"
          className="w-full"
          variant="primary-action"
          onClick={() => {
            switchNetwork(chainId, isConnected);
          }}
        >
          <Trans>Switch to {getChainName(chainId)}</Trans>
        </Button>
      ))}
    </div>
  );
}
