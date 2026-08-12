import { Trans, t } from "@lingui/macro";
import type { ReactNode } from "react";

import { getChainName } from "config/chains";
import { useChainId } from "lib/chains";
import { useWalletCanSignTypedData, useWalletUnavailableChains } from "lib/wallets/useWalletSessionChains";

type WithdrawBlocker = "cannot-sign" | "chain-unreachable";

export function getWithdrawBlockedText(blocker: WithdrawBlocker, chainId: number) {
  return blocker === "cannot-sign" ? t`Wallet cannot sign messages` : t`Add ${getChainName(chainId)} to your wallet`;
}

export function getWithdrawBlockedDescription(blocker: WithdrawBlocker, chainId: number): ReactNode {
  return blocker === "cannot-sign" ? (
    <Trans>
      Withdrawing needs a signature this wallet cannot provide, so this is disabled to avoid locking your funds.
    </Trans>
  ) : (
    <Trans>
      Withdrawing is signed on {getChainName(chainId)}. Add that network to your wallet and reconnect, otherwise your
      funds cannot be withdrawn.
    </Trans>
  );
}

export function useWithdrawBlockedError(): { text: string; disabled: true; errorDescription?: ReactNode } | undefined {
  const { chainId } = useChainId();
  const { canSignTypedData, isLoading: isCanSignLoading } = useWalletCanSignTypedData();
  const { unavailableChains, isLoading: isAvailabilityLoading } = useWalletUnavailableChains([chainId]);

  if (isCanSignLoading || isAvailabilityLoading) {
    return { text: t`Loading...`, disabled: true };
  }

  const blocker: WithdrawBlocker | undefined = !canSignTypedData
    ? "cannot-sign"
    : unavailableChains?.includes(chainId)
      ? "chain-unreachable"
      : undefined;

  if (!blocker) {
    return undefined;
  }

  return {
    text: getWithdrawBlockedText(blocker, chainId),
    disabled: true,
    errorDescription: getWithdrawBlockedDescription(blocker, chainId),
  };
}
