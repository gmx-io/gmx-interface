import { Trans } from "@lingui/macro";
import { useAccount } from "wagmi";

import { getChainName } from "config/chains";
import { MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING } from "domain/multichain/config";
import { switchNetwork } from "lib/wallets";

import Button from "components/Button/Button";

import { needSwitchToSettlementChain } from "./needSwitchToSettlementChain";

export function SwitchToSettlementChainButtons({ children }: { children: React.ReactNode }) {
  const { chainId: walletChainId, isConnected } = useAccount();

  if (!needSwitchToSettlementChain(walletChainId)) {
    return children;
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
          <Trans>Switch to {getChainName(chainId)}</Trans>
        </Button>
      ))}
    </div>
  );
}
