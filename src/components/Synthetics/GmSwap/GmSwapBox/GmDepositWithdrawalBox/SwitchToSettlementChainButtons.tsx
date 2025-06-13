import { useAccount } from "wagmi";

import { SourceChainId, getChainName } from "config/chains";
import {
  MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING,
  isSettlementChain,
  isSourceChain,
} from "domain/multichain/config";
import { switchNetwork } from "lib/wallets";

import Button from "components/Button/Button";

export function needSwitchToSettlementChain(walletChainId: number | undefined): walletChainId is SourceChainId {
  return Boolean(walletChainId && isSourceChain(walletChainId) && !isSettlementChain(walletChainId));
}

export function SwitchToSettlementChainButtons() {
  const { chainId: walletChainId, isConnected } = useAccount();

  if (!walletChainId || isSettlementChain(walletChainId)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      {MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING[walletChainId].map((chainId) => (
        <Button
          key={chainId}
          type="button"
          className="w-full"
          variant="primary-action"
          onClick={() => {
            switchNetwork(chainId, isConnected);
          }}
        >
          Switch to {getChainName(chainId)}
        </Button>
      ))}
    </div>
  );
}
