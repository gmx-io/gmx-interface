import { Trans } from "@lingui/macro";
import { useAccount } from "wagmi";

import { getChainName } from "config/chains";
import { MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING } from "domain/multichain/config";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";

import { needSwitchToSettlementChain } from "./needSwitchToSettlementChain";

export function SwitchToSettlementChainWarning({ topic }: { topic: "liquidity" | "staking" | "vesting" }) {
  const { chainId: walletChainId } = useAccount();

  if (!needSwitchToSettlementChain(walletChainId)) {
    return null;
  }

  const multipleChains = MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING[walletChainId].length > 1;
  const chainNames = multipleChains
    ? MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING[walletChainId].slice(0, -1).map(getChainName).join(", ")
    : getChainName(MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING[walletChainId][0]);
  const lastChainName = getChainName(MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING[walletChainId].slice(-1)[0]);

  let message: React.ReactNode = "";
  if (topic === "liquidity") {
    message = multipleChains ? (
      <Trans>
        Liquidity providing is only available on {chainNames} and {lastChainName}. Please switch to {chainNames} or{" "}
        {lastChainName} to access earning opportunities.
      </Trans>
    ) : (
      <Trans>
        Liquidity providing is only available on {chainNames}. Please switch to {chainNames} to access earning
        opportunities.
      </Trans>
    );
  } else if (topic === "staking") {
    message = multipleChains ? (
      <Trans>
        Staking is only available on {chainNames} and {lastChainName}. Please switch to {chainNames} or {lastChainName}{" "}
        to access earning opportunities.
      </Trans>
    ) : (
      <Trans>
        Staking is only available on {chainNames}. Please switch to {chainNames} to access earning opportunities.
      </Trans>
    );
  } else if (topic === "vesting") {
    message = multipleChains ? (
      <Trans>
        Vesting is only available on {chainNames} and {lastChainName}. Please switch to {chainNames} or {lastChainName}{" "}
        to access earning opportunities.
      </Trans>
    ) : (
      <Trans>
        Vesting is only available on {chainNames}. Please switch to {chainNames} to access earning opportunities.
      </Trans>
    );
  }

  return (
    <AlertInfoCard type="warning" className="mb-12">
      {message}
    </AlertInfoCard>
  );
}
