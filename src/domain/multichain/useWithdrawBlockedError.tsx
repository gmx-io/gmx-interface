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

/** Guards anything that moves funds in with a plain transaction but needs a signature to move them out. */
export function useWithdrawBlockedError(): { text: string; disabled: true; errorDescription: ReactNode } | undefined {
  const { chainId } = useChainId();
  const canSignTypedData = useWalletCanSignTypedData();
  const { unavailableChains } = useWalletUnavailableChains([chainId]);

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
