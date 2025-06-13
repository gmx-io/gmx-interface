import { Trans } from "@lingui/macro";
import { useAccount } from "wagmi";

import { getChainName } from "config/chains";
import {
  isSettlementChain,
  isSourceChain,
  MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING,
} from "domain/multichain/config";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";

export function SwitchToSettlementChainWarning() {
  const { chainId: walletChainId } = useAccount();

  if (!walletChainId || !isSourceChain(walletChainId) || isSettlementChain(walletChainId)) {
    return null;
  }

  const multipleChains = MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING[walletChainId].length > 1;
  const chainNames = multipleChains
    ? MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING[walletChainId].slice(0, -1).map(getChainName).join(", ")
    : getChainName(MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING[walletChainId][0]);
  const lastChainName = getChainName(MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING[walletChainId].slice(-1)[0]);

  return (
    <AlertInfoCard type="warning" className="mb-12">
      {multipleChains ? (
        <Trans>
          Liquidity providing is only available on {chainNames} and {lastChainName}. Please switch to {chainNames} or{" "}
          {lastChainName} to access earning opportunities.
        </Trans>
      ) : (
        <Trans>
          Liquidity providing is only available on {chainNames}. Please switch to {chainNames} to access earning
          opportunities.
        </Trans>
      )}
    </AlertInfoCard>
  );
}
