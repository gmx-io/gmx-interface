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
        Liquidity only available on {chainNames} or {lastChainName}. Switch networks to continue.
      </Trans>
    ) : (
      <Trans>Liquidity only available on {chainNames}. Switch networks to continue.</Trans>
    );
  } else if (topic === "shift") {
    message = multipleChains ? (
      <Trans>
        Shifting only available on {chainNames} or {lastChainName}. Switch networks to continue.
      </Trans>
    ) : (
      <Trans>Shifting only available on {chainNames}. Switch networks to continue.</Trans>
    );
  } else if (topic === "staking") {
    message = multipleChains ? (
      <Trans>
        Staking only available on {chainNames} or {lastChainName}. Switch networks to continue.
      </Trans>
    ) : (
      <Trans>Staking only available on {chainNames}. Switch networks to continue.</Trans>
    );
  } else if (topic === "vesting") {
    message = multipleChains ? (
      <Trans>
        Vesting only available on {chainNames} or {lastChainName}. Switch networks to continue.
      </Trans>
    ) : (
      <Trans>Vesting only available on {chainNames}. Switch networks to continue.</Trans>
    );
  } else if (topic === "claimRewards" && settlementChainId && isSettlementChain(settlementChainId)) {
    const settlementChainName = getChainName(settlementChainId);
    message = (
      <Trans>
        Claiming rewards only available on {settlementChainName}. Switch networks to claim referral rewards.
      </Trans>
    );
  }

  return (
    <AlertInfoCard type="error" className="mb-12" hideClose>
      {message}
    </AlertInfoCard>
  );
}
