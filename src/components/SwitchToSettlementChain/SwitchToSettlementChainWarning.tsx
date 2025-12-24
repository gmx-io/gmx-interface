import { Trans } from "@lingui/macro";
import { useAccount } from "wagmi";

import { getChainName, type SettlementChainId } from "config/chains";
import { isSettlementChain, MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING } from "config/multichain";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";

import { needSwitchToSettlementChain } from "./utils";

export function SwitchToSettlementChainWarning({
  topic,
  settlementChainId,
}: {
  topic: "liquidity" | "staking" | "vesting" | "shift" | "claimRewards";
  settlementChainId?: SettlementChainId;
}) {
  const { chainId: walletChainId } = useAccount();

  if (!needSwitchToSettlementChain(walletChainId)) {
    return null;
  }

  const multipleChains = MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING[walletChainId].length > 1;
  const chainNames = multipleChains
    ? MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING[walletChainId].slice(0, -1).map(getChainName).join(", ")
    : getChainName(MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING[walletChainId][0]);
  const lastChainName = getChainName(MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING[walletChainId].slice(-1)[0]);

  let message: React.ReactNode = "";
  if (topic === "liquidity") {
    message = multipleChains ? (
      <Trans>
        Liquidity providing for this market is only available on {chainNames} and {lastChainName}. Please switch to{" "}
        {chainNames} or {lastChainName} to access earning opportunities.
      </Trans>
    ) : (
      <Trans>
        Liquidity providing for this market is only available on {chainNames}. Please switch to {chainNames} to access
        earning opportunities.
      </Trans>
    );
  } else if (topic === "shift") {
    message = multipleChains ? (
      <Trans>
        Shifting is only available on {chainNames} and {lastChainName}. Please switch to {chainNames} or {lastChainName}{" "}
        to access earning opportunities.
      </Trans>
    ) : (
      <Trans>
        Shifting is only available on {chainNames}. Please switch to {chainNames} to access earning opportunities.
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
  } else if (topic === "claimRewards" && settlementChainId && isSettlementChain(settlementChainId)) {
    const settlementChainName = getChainName(settlementChainId);
    message = (
      <Trans>
        Claiming rewards is only available on {settlementChainName}. Please switch to {settlementChainName} to claim
        your referral rewards.
      </Trans>
    );
  }

  return (
    <AlertInfoCard type="warning" className="mb-12">
      {message}
    </AlertInfoCard>
  );
}
